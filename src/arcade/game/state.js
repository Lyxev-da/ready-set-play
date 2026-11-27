import { FAIR, SECRET_IDS, TIERS } from './patterns';
import { fmt } from './format';
/** Highest level each upgrade family can reach before it can evolve. */
export const UP_MAX = {
    luck: 20,
    die: 12,
    nudge: 6,
    slots: 4,
    midas: 20,
    streak: 12,
    bounty: 14,
    nest: 10,
    speed: 8,
    charge: 5,
    auto: 1,
};
/**
 * Every upgrade family evolves through the same ladder: each evolution resets
 * the levels of that one upgrade and makes it 1.2x more powerful per level.
 */
export const EVOLVE_NAMES = ['LUCKY', 'GOLDEN', 'RAINBOW', 'PRISMATIC', 'TRANSCENDENT'];
/** Monochrome tint for evolved upgrade icons (tier 0 keeps the original colors). */
export const EVOLVE_TINTS = ['', '#ffd04a', '#ff7ac0', '#c9b6ff', '#8eeae8'];
export const EVOLVE_ICONS = ['clover', 'cloverGold', 'cloverRainbow', 'cloverPrismatic', 'cloverTranscendent'];
export const EVOLVE_MAX = EVOLVE_NAMES.length - 1;
/** Sprite suffix each evolution tier maps onto (see pixelSprites.js). */
export const EVOLVE_ICON_SUFFIX = ['', 'Gold', 'Rainbow', 'Prismatic', 'Transcendent'];
/** 1.2^tier: how much stronger one level is at each evolution tier. */
const EVOLVE_SCALE = [1, 1.2, 1.44, 1.728, 2.0736];
export const tierScale = (tier) => EVOLVE_SCALE[Math.min(Math.max(0, tier), EVOLVE_MAX)] ?? 1;
export const evolveIcon = (tier) => EVOLVE_ICONS[Math.min(Math.max(0, tier), EVOLVE_MAX)] ?? EVOLVE_ICONS[0];
/** Sprite name for any upgrade family at its current evolution tier. */
export const evolveIconFor = (u, tier) => {
    const t = Math.min(Math.max(0, tier ?? 0), EVOLVE_MAX);
    const suffix = EVOLVE_ICON_SUFFIX[t];
    return suffix ? `${u.icon}${suffix}` : u.icon;
};
const KEY = 'one-in-a-zillion:v1';
/** Each mode keeps its own save so switching never wipes a run. */
const keyFor = (mode) => `${KEY}:${mode}`;
const LEGACY_KEY = KEY;
export const BASE_DIGITS = 4;
const ZEROS = {
    luck: 0, die: 0, nudge: 0, slots: 0, midas: 0, streak: 0, bounty: 0, nest: 0, speed: 0, charge: 0, auto: 0,
};
export const fresh = (mode = 'normal') => ({
    mode,
    upTier: { ...ZEROS },
    fxOn: true,
    coins: 0,
    earned: 0,
    rolls: 0,
    up: { ...ZEROS },
    chargeCount: 0,
    tickets: 0,
    nudgeRun: 0,
    nudges: 0,
    hotStreak: 0,
    bestStreak: 0,
    charm: 0,
    dex: {},
    tiers: Array(TIERS.length).fill(0),
    tierFirst: Array(TIERS.length).fill(null),
    bestStack: 0,
    best: [],
    recent: [],
    claimed: [],
    daily: { last: '', streak: 0 },
    muted: false,
    autoOn: false,
});
const clampNum = (v, min, max, fall) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fall;
};
const clampInt = (v, min, max, fall) => Math.floor(clampNum(v, min, max, fall));
const cleanString = (v, max, fall = '') => typeof v === 'string' ? v.slice(0, max) : fall;
const cleanEntry = (v) => {
    if (!v || typeof v !== 'object')
        return null;
    const e = v;
    const digits = /^\d{4,12}$/.test(String(e.digits)) ? String(e.digits) : null;
    if (!digits)
        return null;
    const rarity = clampNum(e.rarity, 1, 1e30, 1);
    const tier = clampInt(e.tier, 0, TIERS.length - 1, 0);
    const at = clampNum(e.at, 0, Number.MAX_SAFE_INTEGER, Date.now());
    return { digits, rarity, tier, at };
};
/** Repairs untrusted JSON so a hand-edited or partial save file cannot break the game. */
export function sanitizeSave(raw, mode) {
    const p = raw && typeof raw === 'object' ? raw : {};
    const f = fresh(mode);
    const up = p.up && typeof p.up === 'object' ? p.up : {};
    const daily = p.daily && typeof p.daily === 'object' ? p.daily : {};
    // Saves from before every upgrade could evolve kept one clover tier instead.
    const rawTier = p.upTier && typeof p.upTier === 'object' ? p.upTier : {};
    const legacyClover = clampInt(p.cloverTier, 0, EVOLVE_MAX, 0);
    const tierCount = TIERS.length;
    const tiers = Array.isArray(p.tiers) ? p.tiers.slice(0, tierCount).map((v) => clampInt(v, 0, 1e12, 0)) : [];
    while (tiers.length < tierCount)
        tiers.push(0);
    const tierFirst = Array.isArray(p.tierFirst) ? p.tierFirst.slice(0, tierCount) : [];
    while (tierFirst.length < tierCount)
        tierFirst.push(null);
    const dex = {};
    if (p.dex && typeof p.dex === 'object') {
        const entries = Object.entries(p.dex).slice(0, 64);
        for (const [id, value] of entries) {
            if (!/^[a-z0-9]{1,24}$/.test(id) || !value || typeof value !== 'object')
                continue;
            const v = value;
            dex[id] = { n: clampInt(v.n, 0, 1e12, 0), best: clampNum(v.best, 1, Number.MAX_SAFE_INTEGER, 1) };
        }
    }
    const best = Array.isArray(p.best) ? p.best.map(cleanEntry).filter((v) => !!v).slice(0, 8) : [];
    const recent = Array.isArray(p.recent) ? p.recent.map(cleanEntry).filter((v) => !!v).slice(0, 10) : [];
    const claimed = Array.isArray(p.claimed)
        ? Array.from(new Set(p.claimed.filter((id) => typeof id === 'string' && /^[a-z0-9]{1,24}$/.test(id)))).slice(0, 999)
        : [];
    return {
        ...f,
        mode,
        upTier: {
            luck: clampInt(rawTier.luck, 0, EVOLVE_MAX, legacyClover),
            die: clampInt(rawTier.die, 0, EVOLVE_MAX, 0),
            nudge: clampInt(rawTier.nudge, 0, EVOLVE_MAX, 0),
            slots: clampInt(rawTier.slots, 0, EVOLVE_MAX, 0),
            midas: clampInt(rawTier.midas, 0, EVOLVE_MAX, 0),
            streak: clampInt(rawTier.streak, 0, EVOLVE_MAX, 0),
            bounty: clampInt(rawTier.bounty, 0, EVOLVE_MAX, 0),
            nest: clampInt(rawTier.nest, 0, EVOLVE_MAX, 0),
            speed: clampInt(rawTier.speed, 0, EVOLVE_MAX, 0),
            charge: clampInt(rawTier.charge, 0, EVOLVE_MAX, 0),
            auto: clampInt(rawTier.auto, 0, EVOLVE_MAX, 0),
        },
        fxOn: p.fxOn === undefined ? true : !!p.fxOn,
        coins: clampNum(p.coins, 0, Number.MAX_SAFE_INTEGER, 0),
        earned: clampNum(p.earned, 0, Number.MAX_SAFE_INTEGER, 0),
        rolls: clampInt(p.rolls, 0, Number.MAX_SAFE_INTEGER, 0),
        up: {
            luck: clampInt(up.luck, 0, UP_MAX.luck, 0),
            die: clampInt(up.die, 0, UP_MAX.die, 0),
            nudge: clampInt(up.nudge, 0, UP_MAX.nudge, 0),
            slots: clampInt(up.slots, 0, UP_MAX.slots, 0),
            midas: clampInt(up.midas, 0, UP_MAX.midas, 0),
            streak: clampInt(up.streak, 0, UP_MAX.streak, 0),
            bounty: clampInt(up.bounty, 0, UP_MAX.bounty, 0),
            nest: clampInt(up.nest, 0, UP_MAX.nest, 0),
            speed: clampInt(up.speed, 0, UP_MAX.speed, 0),
            charge: clampInt(up.charge, 0, UP_MAX.charge, 0),
            auto: clampInt(up.auto, 0, UP_MAX.auto, 0),
        },
        chargeCount: clampInt(p.chargeCount, 0, 10, 0),
        tickets: clampInt(p.tickets, 0, 64, 0),
        nudgeRun: clampInt(p.nudgeRun, 0, 999, 0),
        nudges: clampInt(p.nudges, 0, 1e9, 0),
        hotStreak: clampInt(p.hotStreak, 0, 5000, 0),
        bestStreak: clampInt(p.bestStreak, 0, 100000, 0),
        charm: clampInt(p.charm, 0, 1e6, 0),
        dex,
        tiers,
        tierFirst: tierFirst.map((v) => (typeof v === 'string' && /^\d{4,8}$/.test(v) ? v : null)),
        bestStack: clampInt(p.bestStack, 0, 26, 0),
        best,
        recent,
        claimed,
        daily: {
            last: cleanString(daily.last, 10),
            streak: clampInt(daily.streak, 0, 10000, 0),
        },
        muted: !!p.muted,
        autoOn: !!p.autoOn,
    };
}
export function hasSave(mode, key) {
    try {
        if (localStorage.getItem(key ?? keyFor(mode)))
            return true;
        // Progress from before modes existed belongs to Standard.
        return !key && mode === 'normal' && !!localStorage.getItem(LEGACY_KEY);
    }
    catch {
        return false;
    }
}
export function loadSave(mode = 'normal', key) {
    try {
        const k = key ?? keyFor(mode);
        const raw = localStorage.getItem(k) ?? (!key && mode === 'normal' ? localStorage.getItem(LEGACY_KEY) : null);
        if (!raw)
            return fresh(mode);
        const save = sanitizeSave(JSON.parse(raw), mode);
        // Self-healing: older formats are upgraded in place the moment they load,
        // so a save can never be lost by being read with newer code.
        const healed = JSON.stringify(save);
        if (healed !== raw) {
            try {
                localStorage.setItem(k, healed);
            }
            catch {
                /* read-only storage: the migrated save still works for this session */
            }
        }
        return save;
    }
    catch {
        return fresh(mode);
    }
}
export function storeSave(s, key) {
    try {
        const clean = sanitizeSave(s, s.mode);
        localStorage.setItem(key ?? keyFor(s.mode), JSON.stringify(clean));
        window.dispatchEvent(new CustomEvent('arcade-save', { detail: { key: key ?? keyFor(s.mode), save: clean } }));
    }
    catch {
        /* storage unavailable: the session still works, it just won't persist */
    }
}
/* ---------- derived stats ---------- */
export const upTierOf = (s, id) => Math.min(Math.max(0, s.upTier[id] ?? 0), EVOLVE_MAX);
/** Each evolved digit slot also grants one free digit. */
export const digitsOf = (s) => BASE_DIGITS + s.up.slots + upTierOf(s, 'slots');
export const baseLuck = (s) => (s.mode === 'hardcore' ? 1 : 1 + 0.25 * tierScale(upTierOf(s, 'luck')) * s.up.luck);
export const chargeEvery = (s) => Math.max(2, 10 - Math.round(s.up.charge * tierScale(upTierOf(s, 'charge'))));
export const isCharged = (s) => s.mode === 'normal' && s.chargeCount >= chargeEvery(s);
export const effectiveLuck = (s) => s.mode === 'hardcore' ? 1 : baseLuck(s) * (isCharged(s) ? 3 : 1) * (s.charm > 0 ? 2 : 1);
export const speedOf = (s) => (s.mode === 'hardcore' ? 1 : (1 - 0.08 * tierScale(upTierOf(s, 'speed'))) ** s.up.speed);
/* new upgrades: loaded dice, lucky nudges, hot streaks, pattern bounties, nest egg */
export const DIE_MAX = 0.18;
export const loadedDice = (s) => {
    if (s.mode === 'hardcore' || s.up.die <= 0)
        return FAIR;
    const w = Math.min(DIE_MAX, 0.012 * tierScale(upTierOf(s, 'die')) * s.up.die);
    return { repeat: w, mirror: Math.min(0.07, w * 0.4) };
};
/** Tickets banked per level, and how many rolls one takes. */
export const nudgePower = (s) => (s.mode === 'hardcore' ? 0 : Math.round(s.up.nudge * tierScale(upTierOf(s, 'nudge'))));
export const nudgeCap = (s) => Math.max(0, nudgePower(s));
export const nudgeEvery = (s) => Math.max(3, 11 - nudgePower(s));
export const canNudge = (s) => s.mode === 'normal' && s.up.nudge > 0 && s.tickets > 0;
const banksTickets = (s) => s.mode === 'normal' && s.up.nudge > 0;
export const streakPct = (s) => (s.mode === 'hardcore' ? 0 : 0.05 * tierScale(upTierOf(s, 'streak')) * s.up.streak);
export const streakMult = (s, streak) => 1 + Math.min(2.5, streakPct(s) * Math.max(0, streak));
export const bountyPct = (s) => (s.mode === 'hardcore' ? 0 : 0.012 * tierScale(upTierOf(s, 'bounty')) * s.up.bounty);
export const bountyMult = (s) => 1 + bountyPct(s) * Object.keys(s.dex).length;
const midasMult = (s) => (s.mode === 'hardcore' ? 1 : 1 + 0.25 * tierScale(upTierOf(s, 'midas')) * s.up.midas);
export const coinMult = (s, streak = 0) => midasMult(s) * streakMult(s, streak) * bountyMult(s);
export const coinsFor = (s, rarity, streak = 0) => Math.max(1, Math.round(rarity ** 0.6 * coinMult(s, streak)));
export const nestRate = (s) => (s.mode === 'hardcore' ? 0 : 0.004 * tierScale(upTierOf(s, 'nest')) * s.up.nest);
/** Interest on the coin stash, capped so hoarding never outruns rolling. */
export const nestBonus = (s, base) => Math.floor(Math.min(s.coins * nestRate(s), base * 25));
/** Evolved auto-rollers settle between rolls 1.2x sooner per tier. */
export const autoDelay = (s) => 1 / 1.2 ** upTierOf(s, 'auto');
/** GROWN name of a family at its current evolution tier. */
export const familyName = (u, tier) => tier <= 0 ? u.name : `${EVOLVE_NAMES[Math.min(tier, EVOLVE_MAX)]} ${u.base}`;
const SLOT_COST = [300, 3000, 30000, 250000];
/** Hardcore has exactly two things on the shelf. */
const HARDCORE_STOCK = ['slots', 'auto'];
export const isUpgradeAvailable = (mode, id) => mode === 'normal' || HARDCORE_STOCK.includes(id);
export const upgradesFor = (mode) => UPGRADES.filter((u) => isUpgradeAvailable(mode, u.id));
export const UPGRADES = [
    {
        id: 'luck',
        group: 'LUCK',
        name: 'LUCKY CLOVER',
        base: 'CLOVER',
        icon: 'clover',
        desc: 'Secretly rolls extra numbers and keeps the rarest one.',
        max: UP_MAX.luck,
        cost: (l) => Math.round(20 * 1.6 ** l),
        show: (l, t) => `Luck x${(1 + 0.25 * tierScale(t) * l).toFixed(2)}`,
        per: (t) => `+${(25 * tierScale(t)).toFixed(0)}% luck per level`,
    },
    {
        id: 'die',
        group: 'LUCK',
        name: 'LOADED DIE',
        base: 'LOADED DIE',
        icon: 'die',
        desc: 'Weights the dice so digits repeat and mirror each other, feeding runs and palindromes.',
        max: UP_MAX.die,
        cost: (l) => Math.round(35 * 1.75 ** l),
        show: (l, t) => `Loaded +${Math.round(Math.min(DIE_MAX * 100, 1.2 * tierScale(t) * l))}%`,
        per: (t) => `+${(1.2 * tierScale(t)).toFixed(1)}% load per level`,
    },
    {
        id: 'slots',
        group: 'THE BOARD',
        name: 'DIGIT SLOT',
        base: 'DIGIT SLOT',
        icon: 'slot',
        desc: 'Adds a digit. Longer numbers stack far bigger patterns.',
        max: UP_MAX.slots,
        cost: (l) => SLOT_COST[l] ?? 0,
        show: (l, t) => `${BASE_DIGITS + l + t} digits`,
        per: (t) => (t > 0 ? 'one free digit, plus +1 per level' : '+1 digit per level'),
    },
    {
        id: 'nudge',
        group: 'THE BOARD',
        name: 'LUCKY NUDGE',
        base: 'LUCKY NUDGE',
        icon: 'nudge',
        desc: 'Bank tickets, then click any digit of a finished roll to flip it. Flips only stick when the number gets rarer.',
        max: UP_MAX.nudge,
        cost: (l) => Math.round(120 * 2 ** l),
        show: (l, t) => {
            const cap = Math.max(1, Math.round(l * tierScale(t)));
            return `Cap ${cap} - 1 per ${Math.max(3, 11 - cap)} rolls`;
        },
        per: (t) => `bigger ticket pot, faster banking (${tierScale(t).toFixed(2)}x)`,
    },
    {
        id: 'midas',
        group: 'PAYOUT',
        name: 'MIDAS TOUCH',
        base: 'MIDAS TOUCH',
        icon: 'crown',
        desc: 'Every roll pays out more coins.',
        max: UP_MAX.midas,
        cost: (l) => Math.round(40 * 1.62 ** l),
        show: (l, t) => `Coins +${Math.round(25 * tierScale(t) * l)}%`,
        per: (t) => `+${(25 * tierScale(t)).toFixed(0)}% coins per level`,
    },
    {
        id: 'streak',
        group: 'PAYOUT',
        name: 'HOT STREAK',
        base: 'HOT STREAK',
        icon: 'flame',
        desc: 'Every roll that beats your last one pays more. A dud resets the chain.',
        max: UP_MAX.streak,
        cost: (l) => Math.round(60 * 1.7 ** l),
        show: (l, t) => `+${(5 * tierScale(t) * l).toFixed(0)}% per link, up to +250%`,
        per: (t) => `+${(5 * tierScale(t)).toFixed(1)}% coins per link`,
    },
    {
        id: 'bounty',
        group: 'PAYOUT',
        name: 'PATTERN BOUNTY',
        base: 'PATTERN BOUNTY',
        icon: 'bounty',
        desc: 'Each pattern in your dex pays a little more on every roll.',
        max: UP_MAX.bounty,
        cost: (l) => Math.round(250 * 1.8 ** l),
        show: (l, t) => `+${(1.2 * tierScale(t) * l).toFixed(1)}% per pattern found`,
        per: (t) => `+${(1.2 * tierScale(t)).toFixed(2)}% per pattern per level`,
    },
    {
        id: 'nest',
        group: 'PAYOUT',
        name: 'NEST EGG',
        base: 'NEST EGG',
        icon: 'nest',
        desc: 'Your coin stash pays interest into every payout. Spending it shrinks the nest.',
        max: UP_MAX.nest,
        cost: (l) => Math.round(400 * 1.85 ** l),
        show: (l, t) => `+${(0.4 * tierScale(t) * l).toFixed(2)}% of coins per payout`,
        per: (t) => `+${(0.4 * tierScale(t)).toFixed(2)}% of the stash per level`,
    },
    {
        id: 'speed',
        group: 'TEMPO',
        name: 'QUICK HANDS',
        base: 'QUICK HANDS',
        icon: 'bolt',
        desc: 'Digits lock in and patterns resolve faster.',
        max: UP_MAX.speed,
        cost: (l) => Math.round(30 * 2.4 ** l),
        show: (l, t) => `${Math.round((1 - (1 - 0.08 * tierScale(t)) ** l) * 100)}% faster`,
        per: (t) => `${(8 * tierScale(t)).toFixed(1)}% faster per level`,
    },
    {
        id: 'charge',
        group: 'TEMPO',
        name: 'OVERCHARGE',
        base: 'OVERCHARGE',
        icon: 'battery',
        desc: 'Charged rolls with x3 luck come around sooner.',
        max: UP_MAX.charge,
        cost: (l) => Math.round(150 * 2.6 ** l),
        show: (l, t) => `Every ${Math.max(2, 10 - Math.round(l * tierScale(t)))} rolls`,
        per: (t) => `${tierScale(t).toFixed(2)}x charge speed per level`,
    },
    {
        id: 'auto',
        group: 'TEMPO',
        name: 'AUTO-ROLLER',
        base: 'AUTO-ROLLER',
        icon: 'ff',
        desc: 'Keeps rolling for you. Switch it on beside the ROLL button.',
        max: UP_MAX.auto,
        cost: () => 500,
        show: (l, t) => (l ? (t > 0 ? `Delay x${(1 / 1.2 ** t).toFixed(2)}` : 'Unlocked') : 'Locked'),
        per: (t) => (t > 0 ? `auto delay x${(1 / 1.2 ** t).toFixed(2)}` : 'standard auto delay'),
    },
];
/** Shop sections, in the order they are listed. */
export const UPGRADE_GROUPS = [
    { id: 'LUCK', blurb: 'Better numbers' },
    { id: 'THE BOARD', blurb: 'More digits, more control' },
    { id: 'PAYOUT', blurb: 'More coins per roll' },
    { id: 'TEMPO', blurb: 'Faster chasing' },
];
const maxTier = (s) => {
    let t = 0;
    s.tiers.forEach((c, i) => {
        if (c > 0)
            t = i;
    });
    return t;
};
const found = (s) => Object.keys(s.dex).length;
const flag = (b) => [b ? 1 : 0, 1];
export const QUESTS = [
    { id: 'r1', name: 'FIRST ROLL', desc: 'Roll a number.', reward: 10, prog: (s) => [s.rolls, 1] },
    { id: 'r25', name: 'WARMING UP', desc: 'Roll 25 times.', reward: 40, prog: (s) => [s.rolls, 25] },
    { id: 't2', name: 'SOMETHING BLUE', desc: 'Roll a RARE number or better.', reward: 60, prog: (s) => flag(maxTier(s) >= 2) },
    { id: 'd5', name: 'PATTERN SPOTTER', desc: 'Discover 5 patterns.', reward: 100, prog: (s) => [found(s), 5] },
    { id: 's3', name: 'TRIPLE STACK', desc: 'Stack 3 patterns in one roll.', reward: 120, prog: (s) => [s.bestStack, 3] },
    { id: 'r100', name: 'REGULAR', desc: 'Roll 100 times.', reward: 150, prog: (s) => [s.rolls, 100] },
    { id: 't3', name: 'ROYAL PURPLE', desc: 'Roll an EPIC number.', reward: 250, prog: (s) => flag(maxTier(s) >= 3) },
    { id: 'k3', name: 'HABIT FORMING', desc: 'Reach a 3-day gift streak.', reward: 500, prog: (s) => [s.daily.streak, 3] },
    { id: 'n6', name: 'SIX SHOOTER', desc: 'Unlock a 6th digit.', reward: 600, prog: (s) => [s.up.slots, 2] },
    { id: 'nud10', name: 'PUSH YOUR LUCK', desc: 'Spend 10 lucky nudges.', reward: 2500, prog: (s) => [s.nudges, 10] },
    { id: 'r500', name: 'DEVOTED', desc: 'Roll 500 times.', reward: 800, prog: (s) => [s.rolls, 500] },
    { id: 'd12', name: 'CATALOGUER', desc: 'Discover 12 patterns.', reward: 1000, prog: (s) => [found(s), 12] },
    { id: 't4', name: 'STRUCK GOLD', desc: 'Roll a LEGENDARY number.', reward: 1500, prog: (s) => flag(maxTier(s) >= 4) },
    { id: 'jp', name: 'ALL THE SAME', desc: 'Hit a JACKPOT.', reward: 2000, prog: (s) => flag(!!s.dex.jackpot) },
    { id: 's5', name: 'HIGH RISE', desc: 'Stack 5 patterns in one roll.', reward: 2500, prog: (s) => [s.bestStack, 5] },
    { id: 'sec', name: 'WHISPERS', desc: 'Uncover a secret pattern.', reward: 3000, prog: (s) => flag(SECRET_IDS.some((id) => !!s.dex[id])) },
    { id: 'r2500', name: 'OBSESSED', desc: 'Roll 2,500 times.', reward: 5000, prog: (s) => [s.rolls, 2500] },
    { id: 't5', name: 'SEEING RED', desc: 'Roll a MYTHIC number.', reward: 10000, prog: (s) => flag(maxTier(s) >= 5) },
    { id: 'stk10', name: 'ON FIRE', desc: 'Chain 10 rolls that each beat the last.', reward: 4000, prog: (s) => [s.bestStreak, 10] },
    { id: 'die6', name: 'HOUSE EDGE', desc: 'Own 6 levels of loaded die.', reward: 9000, prog: (s) => [s.up.die, 6] },
    { id: 'd20', name: 'COMPLETIONIST', desc: 'Discover 20 patterns.', reward: 15000, prog: (s) => [found(s), 20] },
    { id: 'n8', name: 'FULL HOUSE', desc: 'Unlock all 8 digits.', reward: 20000, prog: (s) => [s.up.slots, 4] },
    { id: 't6', name: 'FLAWLESS', desc: 'Roll a DIVINE number.', reward: 75000, prog: (s) => flag(maxTier(s) >= 6) },
];
export const questDone = (q, s) => {
    const [a, b] = q.prog(s);
    return a >= b;
};
export const questsNewlyDone = (before, after) => QUESTS.filter((q) => !before.claimed.includes(q.id) && !questDone(q, before) && questDone(q, after));
/* ---------- daily gift ---------- */
const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const dailyReady = (s) => s.daily.last !== dayKey();
export const CHARM_ROLLS = 25;
export function applyDaily(s) {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    const streak = s.daily.last === dayKey(y) ? s.daily.streak + 1 : 1;
    const coins = Math.round(50 * Math.min(streak, 7) * 3 ** s.up.slots);
    const next = {
        ...s,
        coins: s.coins + coins,
        earned: s.earned + coins,
        // A luck charm has no place in a pure-luck run.
        charm: s.mode === 'hardcore' ? s.charm : s.charm + CHARM_ROLLS,
        daily: { last: dayKey(), streak },
    };
    return { next, coins, streak };
}
/** What a resolved rarity is worth right now, with the labels that show why. */
function payout(s, rarity, streak) {
    const base = Math.max(1, Math.round(rarity ** 0.6 * coinMult(s, streak)));
    const nest = s.up.nest > 0 ? nestBonus(s, base) : 0;
    const notes = [];
    if (s.mode === 'normal') {
        const midas = Math.round(25 * tierScale(upTierOf(s, 'midas')) * s.up.midas);
        if (midas > 0)
            notes.push(`MIDAS +${midas}%`);
        if (streak > 0 && s.up.streak > 0) {
            notes.push(`HOT STREAK x${streak} +${Math.round(Math.min(2.5, streakPct(s) * streak) * 100)}%`);
        }
        const found = Object.keys(s.dex).length;
        if (s.up.bounty > 0 && found > 0)
            notes.push(`BOUNTY +${Math.round(bountyPct(s) * found * 100)}%`);
    }
    if (nest > 0)
        notes.push(`NEST EGG +${fmt(nest)}`);
    return { coins: base + nest, notes };
}
/** Folds a resolved number into the dex, the tier wall and the best-of lists. */
function recordRoll(s, a, entry, replaceDigits) {
    const dex = { ...s.dex };
    const newPatterns = [];
    for (const h of a.hits) {
        const e = dex[h.id];
        if (!e) {
            newPatterns.push(h.label);
            dex[h.id] = { n: 1, best: a.rarity };
        }
        else {
            dex[h.id] = { n: e.n + 1, best: Math.max(e.best, a.rarity) };
        }
    }
    const tiers = s.tiers.slice();
    const tierFirst = s.tierFirst.slice();
    const newTier = !tiers[a.tier];
    tiers[a.tier] = (tiers[a.tier] ?? 0) + 1;
    if (newTier)
        tierFirst[a.tier] = entry.digits;
    const purge = (list) => list.filter((b) => b.digits !== (replaceDigits ?? entry.digits));
    const kept = replaceDigits ? purge(s.best) : s.best;
    const newBest = a.rarity > 1 && (kept.length === 0 || a.rarity > kept[0].rarity);
    const best = a.tier >= 1 ? [...kept, entry].sort((x, y) => y.rarity - x.rarity).slice(0, 8) : kept;
    const recent = a.tier >= 0 ? [entry, ...(replaceDigits ? purge(s.recent) : s.recent)].slice(0, 10) : s.recent;
    return { dex, newPatterns, tiers, tierFirst, newTier, best, recent, newBest };
}
const ticketBank = (s) => {
    if (!banksTickets(s))
        return { tickets: s.tickets, nudgeRun: s.nudgeRun };
    const run = s.nudgeRun + 1;
    if (run < nudgeEvery(s))
        return { tickets: s.tickets, nudgeRun: run };
    return { tickets: Math.min(nudgeCap(s), s.tickets + 1), nudgeRun: 0 };
};
/** A roll is one more entry in the ledger: coins, dex, tiers, streak, tickets. */
export function applyRoll(s, a, charged) {
    const entry = { digits: a.digits.join(''), rarity: a.rarity, tier: a.tier, at: Date.now() };
    const prev = s.recent[0]?.rarity ?? 0;
    const hotStreak = s.mode === 'hardcore' || a.rarity <= prev ? 0 : s.hotStreak + 1;
    const { coins, notes } = payout(s, a.rarity, hotStreak);
    const r = recordRoll(s, a, entry);
    const bank = ticketBank(s);
    const next = {
        ...s,
        coins: s.coins + coins,
        earned: s.earned + coins,
        rolls: s.rolls + 1,
        dex: r.dex,
        tiers: r.tiers,
        tierFirst: r.tierFirst,
        best: r.best,
        recent: r.recent,
        bestStack: Math.max(s.bestStack, a.hits.length),
        hotStreak,
        bestStreak: Math.max(s.bestStreak, hotStreak),
        tickets: bank.tickets,
        nudgeRun: bank.nudgeRun,
        chargeCount: s.mode === 'hardcore' ? s.chargeCount : charged ? 0 : Math.min(chargeEvery(s), s.chargeCount + 1),
        charm: s.mode === 'hardcore' ? s.charm : Math.max(0, s.charm - 1),
    };
    return { next, news: { coins, notes, newPatterns: r.newPatterns, newTier: r.newTier, newBest: r.newBest } };
}
/**
 * Spend one ticket to flip a single digit of the roll that is on the wall.
 * The flip only sticks when the new number is rarer; then the player is paid the
 * difference, and it counts as another link in the hot streak. A dud spends the
 * ticket and leaves everything else alone.
 */
export function applyNudge(s, a) {
    const before = s.recent[0];
    const spent = { ...s, tickets: Math.max(0, s.tickets - 1), nudges: s.nudges + 1 };
    const beforeRarity = before?.rarity ?? 1;
    if (!before || a.rarity <= beforeRarity) {
        return {
            next: spent,
            news: { coins: 0, notes: [], improved: false, newPatterns: [], newTier: false, newBest: false },
        };
    }
    const entry = { digits: a.digits.join(''), rarity: a.rarity, tier: a.tier, at: Date.now() };
    const hotStreak = s.mode === 'hardcore' ? 0 : s.hotStreak + 1;
    const now = payout(s, a.rarity, hotStreak);
    const paid = payout(s, beforeRarity, Math.max(0, s.hotStreak - 1));
    const coins = Math.max(1, now.coins - paid.coins);
    const r = recordRoll(s, a, entry, before.digits);
    return {
        next: {
            ...spent,
            coins: s.coins + coins,
            earned: s.earned + coins,
            dex: r.dex,
            tiers: r.tiers,
            tierFirst: r.tierFirst,
            best: r.best,
            recent: r.recent,
            bestStack: Math.max(s.bestStack, a.hits.length),
            hotStreak,
            bestStreak: Math.max(s.bestStreak, hotStreak),
        },
        news: {
            coins,
            notes: [...now.notes, 'FLIP DIFFERENCE'],
            improved: true,
            newPatterns: r.newPatterns,
            newTier: r.newTier,
            newBest: r.newBest,
        },
    };
}
/**
 * Evolves a maxed upgrade family into the next tier. Only that family's levels
 * reset; the new tier is 1.2x more powerful per level.
 */
export function evolveUpgrade(s, id) {
    const u = UPGRADES.find((x) => x.id === id);
    if (!u || !isUpgradeAvailable(s.mode, id))
        return s;
    const tier = upTierOf(s, id);
    if (tier >= EVOLVE_MAX || s.up[id] < u.max)
        return s;
    return { ...s, upTier: { ...s.upTier, [id]: tier + 1 }, up: { ...s.up, [id]: 0 } };
}
const MAX_TIERS = Object.fromEntries(Object.keys(UP_MAX).map((id) => [id, EVOLVE_MAX]));
const MAX_LEVELS = { ...UP_MAX };
/** Used by zzzk's local dev tools. */
export function applyDevGrant(s, kind) {
    const f = fresh(s.mode);
    if (kind === 'reset')
        return { ...f, muted: s.muted, fxOn: s.fxOn };
    if (kind === 'coins')
        return { ...s, coins: s.coins + 1_000_000_000, earned: s.earned + 1_000_000_000 };
    if (kind === 'claims')
        return { ...s, claimed: QUESTS.map((q) => q.id) };
    // Evolving resets levels, so this hands over the tiers exactly as the forge would.
    if (kind === 'maxEvolve')
        return { ...s, upTier: { ...MAX_TIERS }, up: { ...ZEROS } };
    if (s.mode === 'hardcore') {
        // Hardcore can only own digits and auto-roll, evolved or not.
        return {
            ...s,
            upTier: { ...ZEROS, slots: EVOLVE_MAX, auto: EVOLVE_MAX },
            up: { ...ZEROS, slots: MAX_LEVELS.slots, auto: 1 },
            coins: Math.max(s.coins, 1_000_000),
        };
    }
    return { ...s, upTier: { ...MAX_TIERS }, up: { ...MAX_LEVELS, auto: 1 } };
}
