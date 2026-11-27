import { useSyncExternalStore } from 'react';
import { schnorr } from '@noble/curves/secp256k1';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, hexToBytes, utf8ToBytes } from '@noble/hashes/utils';
import { analyze, toDigits } from './patterns';
import { DEV_NAME, accountSecret, isDevAccount, loadProfile } from './accounts';
/**
 * The global leaderboard.
 *
 * This game is a static page with no server of its own, so the board lives on
 * public Nostr relays: independent servers that store small signed messages
 * and hand them to anyone who asks. Each account owns a random signing key and
 * publishes one tiny record per mode ("my best number is 17777771").
 *
 *  - Scores cannot be inflated: a record carries only the digits, and every
 *    client recomputes the rarity from them.
 *  - Records cannot be altered or deleted by others: they are signed.
 *  - There is no single point of failure: several relays hold copies, and
 *    every client re-sends records a relay has lost.
 */
const ENV = import.meta.env;
/** Namespace of this game's records. Test builds use their own so they never touch the real board. */
export const BOARD_NS = ENV.VITE_BOARD_NS || 'oiaz1';
const RELAYS = (ENV.VITE_BOARD_RELAYS ||
    [
        'wss://nos.lol',
        'wss://relay.primal.net',
        'wss://relay.snort.social',
        'wss://offchain.pub',
        'wss://nostr.mom',
        'wss://relay.nostr.net',
        'wss://nostr.oxtr.dev',
        'wss://nostr.bitcoiner.social',
        'wss://relay.damus.io',
    ].join(','))
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
/** NIP-78 "application data": replaceable, one record per (key, d-tag). */
const KIND = 30078;
const MODES = ['normal', 'hardcore'];
const D_ACCT = `${BOARD_NS}:acct`;
const D_ROW = { normal: `${BOARD_NS}:row:normal`, hardcore: `${BOARD_NS}:row:hardcore` };
const ALL_D = [D_ACCT, D_ROW.normal, D_ROW.hardcore];
const NAME_RE = /^[a-z0-9_]{3,16}$/;
const DIGITS_RE = /^\d{4,12}$/;
const HEX64 = /^[0-9a-f]{64}$/;
const HEX128 = /^[0-9a-f]{128}$/;
const MIN_SINCE = 1_700_000_000;
const CACHE_KEY = `one-in-a-zillion:board:${BOARD_NS}:v1`;
const DEV_PUBLISH_KEY = 'one-in-a-zillion:board:dev-publish';
/** The zzzk dev account is the same identity on every device. */
const DEV_PK = '2e920f9636a11e8919aa0b5fe211cd3fd8db830b8f01afc01d088c4de19fce45';
/* ---------- identity and signing ---------- */
const identities = new Map();
function identityOf(account) {
    const hit = identities.get(account.id);
    if (hit)
        return hit;
    const sk = hexToBytes(accountSecret(account));
    const id = { sk, pk: bytesToHex(schnorr.getPublicKey(sk)) };
    identities.set(account.id, id);
    return id;
}
/** The public key an account appears under on the board. */
export const boardPubkey = (account) => (account ? identityOf(account).pk : null);
const eventId = (pubkey, createdAt, tags, content) => bytesToHex(sha256(utf8ToBytes(JSON.stringify([0, pubkey, createdAt, KIND, tags, content]))));
function signEvent(me, d, name, body, after = 0) {
    const created_at = Math.max(Math.floor(Date.now() / 1000), after + 1);
    const tags = [
        ['d', d],
        ['n', name],
    ];
    const content = JSON.stringify(body);
    const id = eventId(me.pk, created_at, tags, content);
    return { id, pubkey: me.pk, created_at, kind: KIND, tags, content, sig: bytesToHex(schnorr.sign(id, me.sk)) };
}
/* ---------- validation ---------- */
/** Structural check of an untrusted record. Signature is checked separately (it is the slow part). */
function parse(raw) {
    if (!raw || typeof raw !== 'object')
        return null;
    const e = raw;
    if (e.kind !== KIND)
        return null;
    if (typeof e.id !== 'string' || !HEX64.test(e.id))
        return null;
    if (typeof e.pubkey !== 'string' || !HEX64.test(e.pubkey))
        return null;
    if (typeof e.sig !== 'string' || !HEX128.test(e.sig))
        return null;
    if (!Number.isInteger(e.created_at) || e.created_at < MIN_SINCE || e.created_at > Date.now() / 1000 + 900)
        return null;
    if (typeof e.content !== 'string' || e.content.length > 600 || !Array.isArray(e.tags))
        return null;
    let d = '';
    let n = '';
    for (const t of e.tags) {
        if (!Array.isArray(t) || typeof t[1] !== 'string')
            continue;
        if (t[0] === 'd')
            d = t[1];
        else if (t[0] === 'n')
            n = t[1];
    }
    const mode = d === D_ROW.normal ? 'normal' : d === D_ROW.hardcore ? 'hardcore' : null;
    if (!mode && d !== D_ACCT)
        return null;
    let c;
    try {
        c = JSON.parse(e.content);
    }
    catch {
        return null;
    }
    if (!c || typeof c !== 'object')
        return null;
    const name = c.name;
    if (typeof name !== 'string' || !NAME_RE.test(name) || name !== n)
        return null;
    // The dev name and the dev key only ever go together.
    const dev = e.pubkey === DEV_PK;
    if (dev && name !== DEV_NAME)
        return null;
    const since = c.since;
    if (typeof since !== 'number' || !Number.isInteger(since) || since < MIN_SINCE || since > e.created_at + 86_400)
        return null;
    const base = { ev: e, key: `${e.pubkey}|${d}`, name, since, dev };
    if (!mode)
        return { ...base, type: 'acct', mode: null, off: false, digits: '', rolls: 0, at: 0 };
    if (c.off === true)
        return { ...base, type: 'row', mode, off: true, digits: '', rolls: 0, at: 0 };
    if (typeof c.digits !== 'string' || !DIGITS_RE.test(c.digits))
        return null;
    const rolls = typeof c.rolls === 'number' && Number.isFinite(c.rolls) ? Math.min(1e12, Math.max(1, Math.floor(c.rolls))) : 1;
    const at = typeof c.at === 'number' && Number.isFinite(c.at) ? c.at : e.created_at * 1000;
    return { ...base, type: 'row', mode, off: false, digits: c.digits, rolls, at };
}
function verify(e) {
    try {
        return eventId(e.pubkey, e.created_at, e.tags, e.content) === e.id && schnorr.verify(e.sig, e.id, e.pubkey);
    }
    catch {
        return false;
    }
}
/** Rarity is never taken from the network: it is recomputed from the digits. */
const scores = new Map();
function score(digits) {
    let s = scores.get(digits);
    if (!s) {
        const a = analyze(toDigits(digits));
        s = { rarity: a.rarity, tier: a.tier };
        scores.set(digits, s);
    }
    return s;
}
/* ---------- local replica ---------- */
const store = new Map();
let outbox = [];
let status = 'idle';
let busy = false;
let sourcesOk = 0;
let syncedAt = null;
const rollsSynced = new Set();
/** Keeps a record if it is valid and newer than what we hold for its slot. */
function accept(raw, trusted = false) {
    const p = parse(raw);
    if (!p)
        return false;
    const cur = store.get(p.key);
    if (cur) {
        if (cur.ev.id === p.ev.id)
            return false;
        if (cur.ev.created_at > p.ev.created_at)
            return false;
        if (cur.ev.created_at === p.ev.created_at && cur.ev.id < p.ev.id)
            return false;
    }
    if (!trusted && !verify(p.ev))
        return false;
    store.set(p.key, p);
    return true;
}
const byScore = (a, b) => (b.type === 'row' && !b.off ? score(b.digits).rarity : 0) - (a.type === 'row' && !a.off ? score(a.digits).rarity : 0);
function persist() {
    try {
        let keep = [...store.values()];
        if (keep.length > 800) {
            keep = keep.sort(byScore).slice(0, 800);
        }
        localStorage.setItem(CACHE_KEY, JSON.stringify({ syncedAt, events: keep.map((p) => p.ev), outbox }));
    }
    catch {
        /* storage full or unavailable: the board still works for this session */
    }
}
function hydrate() {
    try {
        const raw = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null');
        if (!raw)
            return;
        // Cached records were verified before they were stored.
        for (const e of raw.events ?? [])
            accept(e);
        outbox = (raw.outbox ?? []).filter((e) => { const p = parse(e); return p && verify(p.ev); });
        syncedAt = typeof raw.syncedAt === 'number' ? raw.syncedAt : null;
    }
    catch {
        /* corrupt cache: start empty and refill from the relays */
    }
}
export const getDevPublish = () => {
    try {
        return localStorage.getItem(DEV_PUBLISH_KEY) !== '0';
    }
    catch {
        return true;
    }
};
/* ---------- snapshot for the UI ---------- */
function build() {
    const rows = { normal: [], hardcore: [] };
    // The earliest account to use a name owns it; later ones get a key suffix.
    const first = new Map();
    for (const p of store.values()) {
        const f = first.get(p.name);
        if (!f || p.since < f.since || (p.since === f.since && p.ev.pubkey < f.pk)) {
            first.set(p.name, { pk: p.ev.pubkey, since: p.since });
        }
    }
    for (const p of store.values()) {
        if (p.type !== 'row' || p.off || !p.mode)
            continue;
        const s = score(p.digits);
        rows[p.mode].push({
            id: p.ev.pubkey,
            name: p.name,
            tag: first.get(p.name)?.pk === p.ev.pubkey ? '' : p.ev.pubkey.slice(0, 4).toUpperCase(),
            dev: p.dev,
            mode: p.mode,
            digits: p.digits,
            rarity: s.rarity,
            tier: s.tier,
            rolls: p.rolls,
            at: p.at,
        });
    }
    for (const m of MODES)
        rows[m].sort((a, b) => b.rarity - a.rarity || a.at - b.at || a.name.localeCompare(b.name));
    return {
        status,
        busy,
        sourcesOk,
        sourcesTotal: RELAYS.length,
        syncedAt,
        rows,
        pending: outbox.length > 0,
        devPublish: getDevPublish(),
    };
}
const listeners = new Set();
let snapshot = null;
function emit() {
    snapshot = build();
    listeners.forEach((l) => l());
}
function current() {
    if (!snapshot)
        snapshot = build();
    return snapshot;
}
function subscribe(l) {
    listeners.add(l);
    return () => {
        listeners.delete(l);
    };
}
/** Live view of the global board. */
export const useBoard = () => useSyncExternalStore(subscribe, current, current);
/**
 * One short conversation with a relay: ask for records, then (once the relay
 * has answered) send it whatever `reply` decides it is missing.
 */
function exchange(url, filter, reply, timeoutMs) {
    return new Promise((resolve) => {
        const acked = new Set();
        const remote = [];
        const waiting = new Set();
        const sub = 'z' + Math.random().toString(36).slice(2, 10);
        let ws = null;
        let settled = false;
        let answered = false;
        let okTimer = 0;
        const finish = (ok) => {
            if (settled)
                return;
            settled = true;
            window.clearTimeout(timer);
            window.clearTimeout(okTimer);
            try {
                ws?.close();
            }
            catch {
                /* already closed */
            }
            resolve({ ok, acked });
        };
        const timer = window.setTimeout(() => finish(answered), timeoutMs);
        const onAnswered = () => {
            if (answered || settled)
                return;
            answered = true;
            let send = [];
            try {
                ws?.send(JSON.stringify(['CLOSE', sub]));
                send = reply(remote);
            }
            catch {
                send = [];
            }
            if (!send.length) {
                finish(true);
                return;
            }
            for (const ev of send) {
                waiting.add(ev.id);
                try {
                    ws?.send(JSON.stringify(['EVENT', ev]));
                }
                catch {
                    /* socket closed mid-send: the next sync retries */
                }
            }
            okTimer = window.setTimeout(() => finish(true), 2600);
        };
        try {
            ws = new WebSocket(url);
        }
        catch {
            finish(false);
            return;
        }
        ws.onopen = () => {
            try {
                ws?.send(JSON.stringify(['REQ', sub, filter]));
            }
            catch {
                finish(false);
            }
        };
        ws.onmessage = (m) => {
            let msg;
            try {
                msg = JSON.parse(String(m.data));
            }
            catch {
                return;
            }
            if (!Array.isArray(msg))
                return;
            if (msg[0] === 'EVENT' && msg[1] === sub) {
                if (remote.length < 3000)
                    remote.push(msg[2]);
            }
            else if ((msg[0] === 'EOSE' || msg[0] === 'CLOSED') && msg[1] === sub) {
                onAnswered();
            }
            else if (msg[0] === 'OK' && typeof msg[1] === 'string') {
                const note = typeof msg[3] === 'string' ? msg[3] : '';
                if (msg[2] === true || note.startsWith('duplicate'))
                    acked.add(msg[1]);
                waiting.delete(msg[1]);
                if (answered && waiting.size === 0)
                    finish(true);
            }
        };
        ws.onerror = () => finish(answered);
        ws.onclose = () => finish(answered);
    });
}
/* ---------- publishing this player's records ---------- */
function prepareOwn(account) {
    const name = account.name.toLowerCase();
    if (!NAME_RE.test(name))
        return;
    const me = identityOf(account);
    const dev = isDevAccount(account);
    const created = Number.isFinite(account.createdAt) ? Math.floor(account.createdAt / 1000) : 0;
    const since = dev ? MIN_SINCE : Math.min(Math.max(MIN_SINCE, created), Math.floor(Date.now() / 1000));
    const queue = (ev) => {
        if (accept(ev, true))
            outbox.push(ev);
    };
    // Reserve the name worldwide.
    if (!store.has(`${me.pk}|${D_ACCT}`))
        queue(signEvent(me, D_ACCT, name, { v: 1, name, since }));
    const publish = !dev || getDevPublish();
    for (const mode of MODES) {
        const key = `${me.pk}|${D_ROW[mode]}`;
        const cur = store.get(key);
        const live = cur && !cur.off ? cur : null;
        if (!publish) {
            if (live)
                queue(signEvent(me, D_ROW[mode], name, { v: 1, name, since, off: true }, live.ev.created_at));
            continue;
        }
        const save = loadProfile(account, mode);
        const top = save.best[0];
        const mine = top && DIGITS_RE.test(top.digits) ? top : null;
        const listed = live ? score(live.digits).rarity : 0;
        const best = mine ? score(mine.digits).rarity : 0;
        let digits = '';
        let at = 0;
        if (mine && best > listed) {
            // A new personal best. The board never goes backwards, even after a reset.
            digits = mine.digits;
            at = mine.at;
        }
        else if (live && !rollsSynced.has(key) && save.rolls > live.rolls) {
            // Same best, but refresh the roll count once per session.
            digits = live.digits;
            at = live.at;
        }
        rollsSynced.add(key);
        if (!digits)
            continue;
        const rolls = Math.max(1, save.rolls, live?.rolls ?? 0);
        queue(signEvent(me, D_ROW[mode], name, { v: 1, name, since, digits, at, rolls }, cur?.ev.created_at ?? 0));
    }
    // Only the newest record per slot still needs sending.
    outbox = outbox.filter((ev) => {
        const p = parse(ev);
        return !!p && store.get(p.key)?.ev.id === ev.id;
    });
}
/** Records we hold that a relay lacks: ours first, then the top of the board. */
function missingFrom(have) {
    const out = [];
    const seen = new Set();
    const add = (p) => {
        if (!p || out.length >= 40 || seen.has(p.ev.id))
            return;
        if ((have.get(p.key) ?? 0) >= p.ev.created_at)
            return;
        seen.add(p.ev.id);
        out.push(p.ev);
    };
    for (const ev of outbox)
        add(parse(ev));
    for (const p of [...store.values()].sort(byScore))
        add(p);
    return out;
}
async function run(account) {
    if (account)
        prepareOwn(account);
    // On a re-sync keep showing the last relay count until the new one is known.
    const firstContact = status !== 'live';
    if (firstContact)
        sourcesOk = 0;
    emit();
    const filter = { kinds: [KIND], '#d': ALL_D, limit: 500 };
    const acked = new Set();
    let ok = 0;
    await Promise.all(RELAYS.map(async (url) => {
        const r = await exchange(url, filter, (remote) => {
            const have = new Map();
            let changed = false;
            for (const raw of remote) {
                const p = parse(raw);
                if (!p)
                    continue;
                if (p.ev.created_at > (have.get(p.key) ?? 0))
                    have.set(p.key, p.ev.created_at);
                if (accept(raw))
                    changed = true;
            }
            if (changed)
                emit();
            return missingFrom(have);
        }, 7000);
        if (!r.ok)
            return;
        ok++;
        r.acked.forEach((id) => acked.add(id));
        if (firstContact) {
            sourcesOk = ok;
            status = 'live';
            emit();
        }
    }));
    if (ok > 0) {
        status = 'live';
        syncedAt = Date.now();
        outbox = outbox.filter((ev) => !acked.has(ev.id));
    }
    else {
        status = 'offline';
    }
    sourcesOk = ok;
    persist();
}
let inflight = null;
let lastRun = 0;
let queued = null;
/**
 * Publishes this account's records and pulls everyone else's.
 * Unforced calls are throttled so opening the board repeatedly stays cheap.
 */
export function syncBoard(account, opts = {}) {
    if (typeof WebSocket === 'undefined')
        return Promise.resolve();
    if (inflight) {
        if (opts.force)
            queued = { account };
        return inflight;
    }
    if (!opts.force && Date.now() - lastRun < 20_000)
        return Promise.resolve();
    lastRun = Date.now();
    busy = true;
    inflight = run(account)
        .catch(() => {
        status = 'offline';
    })
        .then(() => {
        inflight = null;
        busy = false;
        emit();
        if (queued) {
            const q = queued;
            queued = null;
            void syncBoard(q.account, { force: true });
        }
    });
    return inflight;
}
let reportTimer = 0;
/** Call when the player's best roll may have changed. Coalesces bursts. */
export function reportBest(account) {
    window.clearTimeout(reportTimer);
    reportTimer = window.setTimeout(() => void syncBoard(account, { force: true }), 1500);
}
/** Dev only: show or hide the zzzk scores on the public board. */
export function setDevPublish(on, account) {
    try {
        localStorage.setItem(DEV_PUBLISH_KEY, on ? '1' : '0');
    }
    catch {
        /* ignore */
    }
    rollsSynced.clear();
    emit();
    void syncBoard(account, { force: true });
}
/**
 * Is a username already held by another player anywhere?
 * 'unknown' means no relay could be reached to check.
 */
export function lookupName(rawName) {
    const name = rawName.trim().toLowerCase();
    if (!NAME_RE.test(name))
        return Promise.resolve('free');
    for (const p of store.values())
        if (p.name === name)
            return Promise.resolve('taken');
    if (typeof WebSocket === 'undefined')
        return Promise.resolve('unknown');
    return new Promise((resolve) => {
        let done = false;
        let finished = 0;
        let answered = 0;
        const settle = (v) => {
            if (done)
                return;
            done = true;
            resolve(v);
        };
        const filter = { kinds: [KIND], '#n': [name], '#d': ALL_D, limit: 20 };
        for (const url of RELAYS) {
            void exchange(url, filter, (remote) => {
                for (const raw of remote) {
                    const p = parse(raw);
                    if (p && p.name === name && verify(p.ev)) {
                        accept(raw, true);
                        settle('taken');
                        break;
                    }
                }
                return [];
            }, 4500).then((r) => {
                finished++;
                if (r.ok)
                    answered++;
                // Most relays agreeing is enough; do not wait for a slow straggler.
                if (answered >= Math.min(6, RELAYS.length))
                    settle('free');
                if (finished === RELAYS.length)
                    settle(answered > 0 ? 'free' : 'unknown');
            });
        }
    });
}
if (typeof localStorage !== 'undefined')
    hydrate();
