import { useCallback, useEffect, useRef, useState } from 'react';
import { analyze, finalMats, flipDigit, rollBest, tierOf, TIERS, toDigits } from './patterns';
import { forgeTier } from './forge';
import { applyDaily, applyNudge, applyRoll, CHARM_ROLLS, dailyReady, digitsOf, effectiveLuck, applyDevGrant, autoDelay, evolveUpgrade, canNudge, isCharged, isUpgradeAvailable, loadedDice, loadSave, questDone, QUESTS, questsNewlyDone, speedOf, storeSave, UPGRADES, } from './state';
import { sfx } from './sfx';
import { fmt } from './format';
const IDLE_LIGHT = '#ff9a55';
/** How long auto-roll lingers on a result, per tier. */
const HOLD = [420, 620, 950, 1500, 2600, 3600, 4600, 5600, 6600, 7200, 8000, 8800];
const GLOW = [0.32, 0.5, 0.62, 0.78, 0.92, 1, 1.08, 1.1, 1.1, 1.12, 1.15, 1.2];
const setAt = (arr, i, v) => {
    const c = arr.slice();
    c[i] = v;
    return c;
};
const blankView = (n) => ({
    id: 0,
    phase: 'idle',
    digits: Array(n).fill(0),
    locked: 0,
    mats: Array(n).fill(-1),
    ak: Array(n).fill(0),
    acls: Array(n).fill(''),
    live: [],
    tension: 0,
    hits: [],
    rarity: 1,
    tier: null,
    charged: false,
    reward: 0,
    flags: [],
    label: null,
    notes: [],
    nudgeIdx: -1,
    nudgeFlash: 0,
    nudgeOk: false,
});
/** On reload, put the player's last roll back on the wall. */
function restoredView(s) {
    const n = digitsOf(s);
    const last = s.recent[0];
    if (!last || last.digits.length !== n)
        return blankView(n);
    const a = analyze(toDigits(last.digits));
    return { ...blankView(n), phase: 'done', digits: a.digits, locked: n, mats: finalMats(a), hits: a.hits, rarity: a.rarity, tier: a.tier };
}
export function useGame(mode, saveKey) {
    const [save, setSave] = useState(() => loadSave(mode, saveKey));
    const [view, setView] = useState(() => restoredView(save));
    const [busy, setBusy] = useState(false);
    const [toasts, setToasts] = useState([]);
    // Dev forge: the next roll is forged onto this tier, then the forge switches off.
    const [forcedTier, setForcedTier] = useState(null);
    const forceRef = useRef(null);
    const saveRef = useRef(save);
    const stage = useRef({ fx: null, tilePos: () => [0.5, 0.4], shake: () => { } });
    const busyRef = useRef(false);
    const skipRef = useRef(false);
    const pending = useRef(null);
    const autoTimer = useRef(0);
    const rollId = useRef(0);
    const toastId = useRef(0);
    const toastEnd = useRef(0);
    const alive = useRef(true);
    const rollRef = useRef(() => { });
    const commit = useCallback((next) => {
        saveRef.current = next;
        setSave(next);
        storeSave(next, saveKey);
    }, [saveKey]);
    const toast = useCallback((t) => {
        // Toasts expire one after another so each gets its moment, even when only one fits on screen.
        const id = ++toastId.current;
        const now = Date.now();
        toastEnd.current = Math.max(now, toastEnd.current) + 2600;
        setToasts((l) => [...l.slice(-3), { ...t, id }]);
        window.setTimeout(() => setToasts((l) => l.filter((x) => x.id !== id)), toastEnd.current - now);
    }, []);
    const dismissToast = useCallback((id) => setToasts((l) => l.filter((x) => x.id !== id)), []);
    /** Sleep that a skip can cut short. */
    const wait = useCallback((ms) => new Promise((resolve) => {
        if (skipRef.current) {
            resolve();
            return;
        }
        const id = window.setTimeout(done, ms);
        function done() {
            window.clearTimeout(id);
            pending.current = null;
            resolve();
        }
        pending.current = done;
    }), []);
    const celebrate = useCallback((tier, n, fxOn) => {
        const api = stage.current;
        const fx = api.fx;
        if (!fx)
            return;
        const T = TIERS[tier];
        const [x0, y0] = api.tilePos(0);
        const [x1] = api.tilePos(n - 1);
        const cx = (x0 + x1) / 2;
        fx.setLight(T.color, GLOW[tier], tier >= 4 ? Math.min(1, 0.45 + (tier - 4) * 0.2) : 0);
        if (tier === 0)
            return;
        for (let i = 0; i < n; i++) {
            const [x, y] = api.tilePos(i);
            fx.spark(x, y, T.color, 3 + tier * 2);
        }
        if (tier >= 2)
            fx.ring(cx, y0, T.hi, 90 + tier * 22, tier >= 4 ? 2 : 1);
        if (tier >= 3) {
            fx.burst(cx, y0, [T.color, T.hi, '#ffffff'], 30 + tier * 28, 80 + tier * 22);
            fx.flashScreen(T.hi, 0.35 + tier * 0.1);
            api.shake(tier >= 6 ? 3 : tier >= 4 ? 2 : 1);
        }
        if (tier >= 4) {
            fx.confetti([T.color, T.hi, T.lo, '#ffffff'], 50 + tier * 22);
            window.setTimeout(() => stage.current.fx?.ring(cx, y0, T.color, 150, 2), 160);
            window.setTimeout(() => stage.current.fx?.ring(cx, y0, '#ffffff', 190, 1), 320);
        }
        if (!fxOn)
            return;
        if (tier >= 7)
            fx.setStars(true, T.hi);
        if (tier === 8)
            fx.setRain(true, T.color);
        /* Rarities above MYTHIC each get their own spectacle. They flare fast and
           are over in about a second; the settings toggle can silence them. */
        const later = (ms, fn) => window.setTimeout(fn, ms);
        switch (tier) {
            case 6: {
                // DIVINE: pillars of light drop onto the number, halo rings lift off.
                for (let i = 0; i < 5; i++) {
                    const [px] = api.tilePos(Math.round((i / 4) * (n - 1)));
                    fx.lightColumn(px, 3, T.color, '#ffffff', 0.95, i * 0.07);
                }
                fx.ring(cx, y0, T.hi, 130, 2);
                later(180, () => stage.current.fx?.ring(cx, y0, T.color, 175, 1));
                fx.burst(cx, y0, ['#ffffff', T.hi, T.color], 46, 130);
                break;
            }
            case 7: {
                // COSMIC: nebula lightning lashes out in three quick waves.
                fx.setStars(true, T.hi);
                for (let w = 0; w < 3; w++) {
                    later(w * 170, () => {
                        stage.current.fx?.nebulaStrike(cx + (Math.random() - 0.5) * 0.34, y0 + (Math.random() - 0.5) * 0.12, [T.color, T.hi, '#7ad1ff', '#ff5fd2'], 2 + (w % 2));
                        stage.current.fx?.setLight('#b98cff', 1.15, 0.25);
                    });
                }
                fx.burst(cx, y0, [T.color, T.hi, '#ffffff'], 40, 125);
                api.shake(2);
                later(760, () => stage.current.fx?.setLight(T.color, GLOW[tier], 0));
                break;
            }
            case 8: {
                // GLITCH: corruption slices tear the stage apart.
                fx.tearBands([T.color, T.hi, '#ff00d4'], 0.55);
                fx.setRain(true, T.color);
                fx.burst(cx, y0, [T.color, T.hi, '#ff00d4'], 44, 125);
                fx.flashScreen(T.hi, 0.5);
                later(270, () => stage.current.fx?.tearBands(['#ff00d4', T.color, '#ffffff'], 0.32));
                break;
            }
            case 9: {
                // ECLIPSE: a black sun swallows the light, then the corona bursts.
                fx.setLight('#2a0b16', 0.06, 0);
                fx.ring(cx, y0, T.hi, -130, 2);
                for (let i = 0; i < 3; i++) {
                    later(i * 130, () => stage.current.fx?.ring(cx, y0, i % 2 ? T.lo : T.color, 85 + i * 35, 2));
                }
                fx.burst(cx, y0, ['#ff9a3d', T.hi, T.lo], 62, 100);
                fx.confetti(['#ff9a3d', '#7a2418'], 26);
                api.shake(2);
                later(900, () => stage.current.fx?.setLight(T.color, GLOW[tier] * 1.1, 0.25));
                break;
            }
            case 10: {
                // SINGULARITY: everything spirals inward, then snaps back out.
                fx.swirl(cx, y0, [T.color, T.hi, '#9be7ff'], 1.15, 3.2, 0.52);
                fx.ring(cx, y0, T.hi, -95, 2);
                fx.setLight(T.color, 0.12, 0);
                later(700, () => {
                    stage.current.fx?.ring(cx, y0, '#ffffff', 230, 2);
                    stage.current.fx?.burst(cx, y0, [T.color, '#ffffff', T.hi], 72, 165);
                    stage.current.fx?.setLight(T.color, GLOW[tier], 0.4);
                });
                api.shake(2);
                break;
            }
            case 11: {
                // OMEGA: reality breaks - whiteout, tears, then rings in every color.
                fx.flashScreen('#ffffff', 1);
                fx.tearBands([T.color, T.hi, '#ffffff'], 0.7);
                fx.swirl(cx, y0, ['#ffffff', T.hi, T.lo], 1, -2.6, 0.62);
                for (let i = 0; i < 4; i++) {
                    later(i * 130, () => stage.current.fx?.ring(cx, y0, [T.hi, T.color, '#ffffff', T.lo][i], 110 + i * 45, i % 2 ? 1 : 2));
                }
                fx.burst(cx, y0, [T.hi, T.color, '#ffffff'], 110, 180);
                fx.confetti([T.color, T.hi, T.lo, '#ffffff'], 90);
                api.shake(3);
                break;
            }
            default:
                break;
        }
    }, []);
    const roll = useCallback(async () => {
        window.clearTimeout(autoTimer.current);
        if (busyRef.current) {
            // Pressing again mid-roll fast-forwards to the result.
            skipRef.current = true;
            pending.current?.();
            return;
        }
        busyRef.current = true;
        skipRef.current = false;
        setBusy(true);
        const s = saveRef.current;
        const api = stage.current;
        const n = digitsOf(s);
        const charged = isCharged(s);
        // A forged roll is consumed by the next roll only.
        const forcing = forceRef.current;
        forceRef.current = null;
        if (forcing)
            setForcedTier(null);
        const res = forcing
            ? forcing.n === n
                ? forcing.analysis
                : forgeTier(n, forcing.tier).analysis
            : rollBest(n, effectiveLuck(s), loadedDice(s));
        const sp = speedOf(s);
        const id = ++rollId.current;
        const showy = () => !skipRef.current;
        setView({ ...blankView(n), id, phase: 'spin', digits: res.digits, charged });
        api.fx?.setStars(false);
        api.fx?.setRain(false);
        api.fx?.setLight(charged ? '#ffd04a' : IDLE_LIGHT, charged ? 0.5 : 0.3, charged ? 0.35 : 0);
        sfx.roll(charged);
        await wait(230 * sp);
        // 1. Digits lock left to right. A streak in progress stretches the pause before the next one.
        let same = 0;
        let stair = 0;
        let dir = 0;
        for (let i = 0; i < n; i++) {
            if (!alive.current)
                return;
            let t = Math.max(same >= 2 ? same - 1 : 0, stair >= 3 ? stair - 2 : 0);
            if (i >= 3 && same === i)
                t += 1;
            t = Math.min(4, t);
            if (t > 0 && showy()) {
                const level = t;
                setView((v) => ({ ...v, tension: level }));
                sfx.tense(level);
            }
            await wait((115 + t * 250) * sp);
            const d = res.digits[i];
            const p = res.digits[i - 1];
            same = i > 0 && d === p ? same + 1 : 1;
            if (i > 0 && Math.abs(d - p) === 1) {
                stair = d - p === dir ? stair + 1 : 2;
                dir = d - p;
            }
            else {
                stair = 1;
                dir = 0;
            }
            const run = Math.max(same >= 2 ? same : 0, stair >= 3 ? stair : 0);
            const streak = run ? Array.from({ length: run }, (_, k) => i - run + 1 + k) : [];
            setView((v) => ({
                ...v,
                locked: i + 1,
                mats: setAt(v.mats, i, 0),
                ak: setAt(v.ak, i, v.ak[i] + 1),
                acls: setAt(v.acls, i, 'lock'),
                live: streak,
                tension: 0,
            }));
            if (showy()) {
                sfx.lock(run);
                const [x, y] = api.tilePos(i);
                api.fx?.dust(x, y + 0.04);
                if (run >= 3)
                    api.shake(1);
            }
        }
        await wait(190 * sp);
        if (!alive.current)
            return;
        setView((v) => ({ ...v, phase: 'scan', live: [] }));
        // 2. Patterns are recognised weakest first; each claims its digits one at a time.
        let running = 1;
        for (let h = 0; h < res.hits.length; h++) {
            const hit = res.hits[h];
            const col = TIERS[hit.grade].color;
            for (let j = 0; j < hit.idx.length; j++) {
                const i = hit.idx[j];
                setView((v) => ({
                    ...v,
                    mats: setAt(v.mats, i, Math.max(v.mats[i], hit.grade)),
                    ak: setAt(v.ak, i, v.ak[i] + 1),
                    acls: setAt(v.acls, i, 'pop'),
                }));
                if (showy()) {
                    sfx.blip(h, j);
                    const [x, y] = api.tilePos(i);
                    api.fx?.spark(x, y - 0.03, col, 5 + hit.grade * 2);
                }
                await wait(Math.max(24, 52 * sp));
                if (!alive.current)
                    return;
            }
            running *= hit.mult;
            const total = running;
            const at = hit.idx.reduce((a, b) => a + b, 0) / hit.idx.length;
            setView((v) => ({
                ...v,
                hits: [...v.hits, hit],
                rarity: total,
                label: { k: h, text: `${hit.label} ×${fmt(hit.mult)}`, at, grade: hit.grade },
            }));
            if (showy()) {
                sfx.hit(h, hit.grade);
                const now = tierOf(total);
                api.fx?.setLight(TIERS[now].color, GLOW[now] * 0.8, 0);
                if (hit.grade >= 2) {
                    const [x, y] = api.tilePos(Math.round(at));
                    api.fx?.ring(x, y, col, 70 + hit.grade * 18);
                }
            }
            await wait((250 + hit.grade * 70) * sp);
            if (!alive.current)
                return;
        }
        // 3. Big results get a blackout beat before the reveal.
        const tier = res.tier;
        if (tier >= 4 && showy()) {
            setView((v) => ({ ...v, phase: 'dark', label: null }));
            api.fx?.setLight(TIERS[tier].color, 0.04, 0);
            const dur = Math.min(1500, 520 + (tier - 4) * 240);
            sfx.rumble(dur / 1000);
            await wait(dur);
            if (!alive.current)
                return;
        }
        // 4. Reveal and pay out.
        const before = saveRef.current;
        const { next, news } = applyRoll(before, res, charged);
        commit(next);
        const flags = [];
        if (news.newBest)
            flags.push('NEW BEST');
        const counts = Array(10).fill(0);
        res.digits.forEach((d) => counts[d]++);
        if (Math.max(...counts) === n - 1)
            flags.push('ONE DIGIT OFF A JACKPOT');
        // Claimed digits fuse into the final tier's material with one last hop.
        const fused = finalMats(res);
        setView((v) => ({
            ...v,
            phase: 'done',
            tier,
            rarity: res.rarity,
            hits: res.hits,
            mats: fused,
            ak: v.ak.map((k, i) => (fused[i] !== v.mats[i] ? k + 1 : k)),
            acls: v.acls.map((c, i) => (fused[i] !== v.mats[i] ? 'pop' : c)),
            locked: n,
            reward: news.coins,
            flags,
            notes: news.notes,
            tension: 0,
            live: [],
            label: null,
            nudgeIdx: -1,
        }));
        celebrate(tier, n, s.fxOn);
        sfx.tier(tier);
        if (tier >= 2)
            window.setTimeout(() => sfx.coin(), 420);
        news.newPatterns.slice(0, 2).forEach((name) => toast({ kind: 'new', title: 'NEW PATTERN', text: name }));
        if (news.newTier && tier >= 2)
            toast({ kind: 'tier', title: 'NEW TIER', text: TIERS[tier].name, grade: tier });
        questsNewlyDone(before, next)
            .slice(0, 2)
            .forEach((q) => toast({ kind: 'quest', title: 'QUEST READY', text: q.name }));
        busyRef.current = false;
        setBusy(false);
        if (next.autoOn && next.up.auto > 0) {
            autoTimer.current = window.setTimeout(() => rollRef.current(), (tier < 3 ? HOLD[tier] * sp : HOLD[tier]) * autoDelay(next));
        }
    }, [celebrate, commit, toast, wait]);
    rollRef.current = () => void roll();
    const viewRef = useRef(view);
    viewRef.current = view;
    /**
     * Lucky nudge: flip one digit of the roll on the wall. A rarer number sticks
     * and pays the difference; a worse flip costs the ticket and changes nothing.
     */
    const nudge = useCallback(async (index) => {
        if (busyRef.current)
            return;
        const s = saveRef.current;
        const v = viewRef.current;
        if (!canNudge(s) || v.phase !== 'done' || index < 0 || index >= v.digits.length)
            return;
        busyRef.current = true;
        setBusy(true);
        window.clearTimeout(autoTimer.current);
        const api = stage.current;
        const dice = loadedDice(s);
        const before = v.digits.slice();
        setView((x) => ({ ...x, nudgeIdx: index }));
        sfx.roll(false);
        await wait(430);
        if (!alive.current)
            return;
        const nextDigits = flipDigit(before, index, dice);
        const a = analyze(nextDigits);
        const improved = a.rarity > v.rarity;
        const { next, news } = improved ? applyNudge(s, a) : applyNudge(s, { ...a, rarity: 0, tier: 0, hits: [] });
        const fused = improved ? finalMats(a) : null;
        setView((x) => ({
            ...x,
            nudgeIdx: -1,
            nudgeFlash: x.nudgeFlash + 1,
            nudgeOk: improved,
            digits: improved ? nextDigits : before,
            mats: fused ?? x.mats,
            ak: x.ak.map((k, i) => (i === index || (fused && fused[i] !== x.mats[i]) ? k + 1 : k)),
            acls: x.acls.map((c, i) => (i === index || (fused && fused[i] !== x.mats[i]) ? 'pop' : c)),
            hits: improved ? a.hits : x.hits,
            rarity: improved ? a.rarity : x.rarity,
            tier: improved ? a.tier : x.tier,
            reward: improved ? news.coins : 0,
            notes: improved ? news.notes : [],
            // Re-arms the "no change" flash so the tray can show it.
            flags: improved ? v.flags : [...v.flags.filter((f) => f !== 'NO CHANGE'), 'NO CHANGE'],
        }));
        // The ticket is spent either way; only a rarer flip is kept.
        commit(next);
        const [tx, ty] = api.tilePos(index);
        if (improved) {
            sfx.hit(0, a.tier);
            api.fx?.burst(tx, ty, [TIERS[a.tier].color, TIERS[a.tier].hi, '#ffffff'], 26 + a.tier * 8, 105);
            api.fx?.ring(tx, ty, TIERS[a.tier].hi, 120, 2);
            if (a.tier >= 3)
                api.shake(2);
            if (news.newTier && a.tier >= 2)
                toast({ kind: 'tier', title: 'NUDGED INTO', text: TIERS[a.tier].name, grade: a.tier });
            news.newPatterns.slice(0, 1).forEach((name) => toast({ kind: 'new', title: 'NEW PATTERN', text: name }));
            questsNewlyDone(s, next).slice(0, 1).forEach((q) => toast({ kind: 'quest', title: 'QUEST READY', text: q.name }));
        }
        else {
            sfx.deny();
            api.fx?.dust(tx, ty + 0.03);
            toast({ kind: 'nudge', title: 'NO CHANGE', text: 'That flip was not rarer. The ticket is spent.' });
        }
        await wait(240);
        busyRef.current = false;
        setBusy(false);
        const after = saveRef.current;
        if (after.autoOn && after.up.auto > 0) {
            const tier = improved ? a.tier : v.tier ?? 0;
            autoTimer.current = window.setTimeout(() => rollRef.current(), (tier < 3 ? HOLD[tier] * speedOf(after) : HOLD[tier]) * autoDelay(after));
        }
    }, [celebrate, commit, toast, wait]);
    const nudgeRef = useRef(nudge);
    nudgeRef.current = nudge;
    const buy = useCallback((id) => {
        const s = saveRef.current;
        const u = UPGRADES.find((x) => x.id === id);
        if (!u || !isUpgradeAvailable(s.mode, id))
            return;
        const lv = s.up[id];
        if (lv >= u.max)
            return;
        const cost = u.cost(lv);
        if (s.coins < cost) {
            sfx.deny();
            return;
        }
        const next = { ...s, coins: s.coins - cost, up: { ...s.up, [id]: lv + 1 } };
        commit(next);
        sfx.buy();
        if (id === 'slots' && !busyRef.current) {
            setView(blankView(digitsOf(next)));
            stage.current.fx?.setLight(IDLE_LIGHT, 0.32, 0);
            stage.current.fx?.setStars(false);
            stage.current.fx?.setRain(false);
        }
        questsNewlyDone(s, next).forEach((q) => toast({ kind: 'quest', title: 'QUEST READY', text: q.name }));
    }, [commit, toast]);
    /** Internal state patch used by the explicit lucky-clover evolution and zzzk's tools. */
    const updateSave = useCallback((fn) => {
        commit(fn(saveRef.current));
    }, [commit]);
    const replaceSave = useCallback((next) => {
        // Cut any roll short and put the imported/reset number back on the wall.
        skipRef.current = true;
        pending.current?.();
        busyRef.current = false;
        setBusy(false);
        commit(next);
        setView(restoredView(next));
    }, [commit]);
    const evolve = useCallback((id) => {
        updateSave((s) => {
            const next = evolveUpgrade(s, id);
            if (next !== s)
                sfx.buy();
            return next;
        });
    }, [updateSave]);
    const toggleFx = useCallback(() => {
        const s = saveRef.current;
        const fxOn = !s.fxOn;
        commit({ ...s, fxOn });
        sfx.ui();
        if (!fxOn) {
            stage.current.fx?.setStars(false);
            stage.current.fx?.setRain(false);
        }
    }, [commit]);
    const admin = useCallback((kind) => {
        updateSave((s) => {
            const next = applyDevGrant(s, kind);
            if (kind !== 'reset')
                sfx.claim();
            return next;
        });
    }, [updateSave]);
    /** Dev-only: forge the next roll onto a tier. Returns a status line for the admin panel. */
    const forceNext = useCallback((tier) => {
        if (tier === null) {
            forceRef.current = null;
            setForcedTier(null);
            return 'FORGE OFF. ROLLS ARE NATURAL AGAIN.';
        }
        const n = digitsOf(saveRef.current);
        const r = forgeTier(n, tier);
        forceRef.current = { tier, n, analysis: r.analysis };
        setForcedTier(tier);
        const name = TIERS[tier].name;
        return r.exact
            ? `NEXT ROLL LOCKED TO ${name}.`
            : `${name} IS OUT OF REACH WITH ${n} DIGITS. NEXT ROLL LANDS ON ${TIERS[r.analysis.tier].name}.`;
    }, []);
    const claim = useCallback((qid) => {
        const s = saveRef.current;
        const q = QUESTS.find((x) => x.id === qid);
        if (!q || s.claimed.includes(qid) || !questDone(q, s))
            return;
        commit({ ...s, coins: s.coins + q.reward, earned: s.earned + q.reward, claimed: [...s.claimed, qid] });
        sfx.claim();
        stage.current.fx?.coins(0.5, 0.35, 26);
    }, [commit]);
    const claimDaily = useCallback(() => {
        const s = saveRef.current;
        if (!dailyReady(s))
            return;
        const { next, coins, streak } = applyDaily(s);
        commit(next);
        sfx.claim();
        stage.current.fx?.coins(0.5, 0.35, 40);
        toast({
            kind: 'gift',
            title: streak > 1 ? `DAY ${streak} GIFT` : 'DAILY GIFT',
            text: next.mode === 'hardcore'
                ? `+${fmt(coins)} coins. Luck stays pure at ×1.00.`
                : `+${fmt(coins)} coins and ×2 luck for ${CHARM_ROLLS} rolls`,
        });
        questsNewlyDone(s, next).forEach((q) => toast({ kind: 'quest', title: 'QUEST READY', text: q.name }));
    }, [commit, toast]);
    const toggleAuto = useCallback(() => {
        const s = saveRef.current;
        if (!s.up.auto)
            return;
        const on = !s.autoOn;
        commit({ ...s, autoOn: on });
        sfx.ui();
        if (!on)
            window.clearTimeout(autoTimer.current);
        else if (!busyRef.current)
            rollRef.current();
    }, [commit]);
    const toggleMute = useCallback(() => {
        const s = saveRef.current;
        const muted = !s.muted;
        sfx.muted = muted;
        commit({ ...s, muted });
        if (!muted)
            sfx.ui();
    }, [commit]);
    // Mount: sync audio, set up keyboard and cleanup.
    useEffect(() => {
        alive.current = true;
        sfx.muted = saveRef.current.muted;
        const onKey = (e) => {
            const t = e.target;
            if (t && t.closest('button, a, input, textarea, select, [role="tab"]'))
                return;
            if (/^[1-9]$/.test(e.key)) {
                // Number keys flip that digit of the roll on the wall.
                if (!e.repeat)
                    void nudgeRef.current(Number(e.key) - 1);
                return;
            }
            if (e.code !== 'Space' && e.code !== 'Enter')
                return;
            e.preventDefault();
            if (!e.repeat)
                rollRef.current();
        };
        window.addEventListener('keydown', onKey);
        return () => {
            alive.current = false;
            window.removeEventListener('keydown', onKey);
            window.clearTimeout(autoTimer.current);
            pending.current?.();
            busyRef.current = false;
        };
    }, []);
    return {
        save,
        view,
        busy,
        toasts,
        stage,
        roll: rollRef,
        nudge,
        buy,
        evolve,
        toggleFx,
        admin,
        replaceSave,
        forced: forcedTier,
        forceNext,
        claim,
        claimDaily,
        toggleAuto,
        toggleMute,
        dismissToast,
    };
}
