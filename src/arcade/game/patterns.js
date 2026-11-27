/** Tier index doubles as the material index used for tile textures. */
export const TIERS = [
    { id: 'common', name: 'COMMON', min: 0, color: '#a3a7bb', hi: '#d0d3df', lo: '#515469' },
    { id: 'uncommon', name: 'UNCOMMON', min: 3, color: '#58cf7f', hi: '#a4f5a8', lo: '#1c8551' },
    { id: 'rare', name: 'RARE', min: 20, color: '#58a0f7', hi: '#a8dcff', lo: '#2450b0' },
    { id: 'epic', name: 'EPIC', min: 150, color: '#b374f2', hi: '#e2bcff', lo: '#6230b3' },
    { id: 'legendary', name: 'LEGENDARY', min: 1500, color: '#ffd04a', hi: '#fff4b0', lo: '#c7791f' },
    { id: 'mythic', name: 'MYTHIC', min: 20000, color: '#f5627f', hi: '#ffb3c0', lo: '#a01845' },
    { id: 'divine', name: 'DIVINE', min: 500000, color: '#8eeae8', hi: '#ffffff', lo: '#49bcd1' },
    { id: 'cosmic', name: 'COSMIC', min: 5e7, color: '#b98cff', hi: '#ff9ae0', lo: '#3a22a0' },
    { id: 'glitch', name: 'GLITCH', min: 5e9, color: '#00ff9c', hi: '#ff00d4', lo: '#007a4b' },
    { id: 'eclipse', name: 'ECLIPSE', min: 5e10, color: '#ff9a55', hi: '#ffe0b0', lo: '#4a1320' },
    { id: 'singularity', name: 'SINGULARITY', min: 5e11, color: '#e05fff', hi: '#ffd6ff', lo: '#2a0a4a' },
    { id: 'omega', name: 'OMEGA', min: 5e12, color: '#ffe9a8', hi: '#ffffff', lo: '#c7791f' },
];
export function tierOf(rarity) {
    let t = 0;
    for (let i = 1; i < TIERS.length; i++)
        if (rarity >= TIERS[i].min)
            t = i;
    return t;
}
export const PATTERNS = [
    { id: 'pair', name: 'PAIR', hint: 'Two matching digits side by side.', ex: '5338', mask: '0110', grade: 1, min: 4 },
    { id: 'triple', name: 'TRIPLE', hint: 'Three of a kind in a row.', ex: '2777', mask: '0111', grade: 2, min: 4 },
    { id: 'quad', name: 'QUAD', hint: 'Four of a kind in a row.', ex: '48888', mask: '01111', grade: 3, min: 5 },
    { id: 'penta', name: 'PENTA', hint: 'Five of a kind in a row.', ex: '333331', mask: '111110', grade: 4, min: 6 },
    { id: 'hexa', name: 'HEXA', hint: 'Six of a kind in a row.', ex: '9999992', mask: '1111110', grade: 5, min: 7 },
    { id: 'hepta', name: 'HEPTA', hint: 'Seven of a kind in a row.', ex: '10000000', mask: '01111111', grade: 5, min: 8 },
    { id: 'jackpot', name: 'JACKPOT', hint: 'Every single digit identical.', ex: '7777', mask: '1111', grade: 3, min: 4 },
    { id: 'steps', name: 'STEPS', hint: 'Three digits counting up or down.', ex: '9456', mask: '0111', grade: 1, min: 4 },
    { id: 'stairs', name: 'STAIRS', hint: 'Four digits counting up or down.', ex: '76541', mask: '11110', grade: 3, min: 5 },
    { id: 'ladder', name: 'LADDER', hint: 'Five or more counting up or down.', ex: '234568', mask: '111110', grade: 4, min: 6 },
    { id: 'stairway', name: 'STAIRWAY', hint: 'The whole number counts up or down.', ex: '3456', mask: '1111', grade: 3, min: 4 },
    { id: 'bookends', name: 'BOOKENDS', hint: 'Starts and ends on the same digit.', ex: '6206', mask: '1001', grade: 1, min: 4 },
    { id: 'palindrome', name: 'PALINDROME', hint: 'Reads the same in both directions.', ex: '4994', mask: '1111', grade: 2, min: 4 },
    { id: 'pingpong', name: 'PING-PONG', hint: 'Two digits take turns.', ex: '6161', mask: '1111', grade: 2, min: 4 },
    { id: 'echo', name: 'ECHO', hint: 'The first half repeats itself.', ex: '427427', mask: '111111', grade: 3, min: 6 },
    { id: 'rainbow', name: 'RAINBOW', hint: 'Six or more digits and not one repeat.', ex: '940275', mask: '111111', grade: 1, min: 6 },
    { id: 'even', name: 'ALL EVEN', hint: 'Every digit is even.', ex: '8264', mask: '1111', grade: 1, min: 4 },
    { id: 'odd', name: 'ALL ODD', hint: 'Every digit is odd.', ex: '7139', mask: '1111', grade: 1, min: 4 },
    { id: 'binary', name: 'BINARY', hint: 'Nothing but zeros and ones.', ex: '1011', mask: '1111', grade: 2, min: 4 },
    { id: 'lucky7', name: 'LUCKY 7s', hint: 'Three or more sevens, anywhere.', ex: '7377', mask: '1011', grade: 1, min: 4 },
    { id: 'prime', name: 'PRIME', hint: 'Divisible only by 1 and itself.', ex: '4253', mask: '1111', grade: 1, min: 4 },
    { id: 'square', name: 'PERFECT SQUARE', hint: 'A whole number multiplied by itself.', ex: '7056', mask: '1111', grade: 2, min: 4 },
    { id: 'pow2', name: 'POWER OF TWO', hint: 'Keep doubling from 1 and you land on it.', ex: '4096', mask: '1111', grade: 3, min: 4 },
    { id: 'e404', name: 'NOT FOUND', hint: 'A famous error is hiding in the digits.', ex: '9404', mask: '0111', grade: 3, min: 4, secret: true },
    { id: 'pi', name: 'SLICE OF PI', hint: 'The start of a very long, very round number.', ex: '3141', mask: '1110', grade: 3, min: 4, secret: true },
    { id: 'leet', name: 'LEET', hint: 'How elite hackers spell it.', ex: '1337', mask: '1111', grade: 3, min: 4, secret: true },
];
export const SECRET_IDS = PATTERNS.filter((p) => p.secret).map((p) => p.id);
const NAME = Object.fromEntries(PATTERNS.map((p) => [p.id, p.name]));
const RUN_ID = ['', '', 'pair', 'triple', 'quad', 'penta', 'hexa', 'hepta'];
/** Roughly how many n-digit numbers you need to see before meeting a prime. */
const PRIME_MULT = [1, 1, 4, 6, 8, 10, 13, 15, 17, 19];
const SECRETS = [
    ['e404', '404', 404],
    ['pi', '314', 314],
    ['leet', '1337', 1337],
];
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
function isPrime(v) {
    if (v < 2)
        return false;
    if (v % 2 === 0)
        return v === 2;
    for (let i = 3; i * i <= v; i += 2)
        if (v % i === 0)
            return false;
    return true;
}
/**
 * Finds every pattern in a number. Each pattern carries a multiplier close to
 * its own real odds, and patterns that directly imply each other are
 * suppressed. The multipliers stack into one rarity score.
 */
export function analyze(d) {
    const n = d.length;
    const hits = [];
    const all = range(0, n - 1);
    const add = (id, idx, mult, note) => {
        const m = Math.max(2, Math.round(mult));
        hits.push({ id, label: NAME[id], note, idx, mult: m, grade: tierOf(m) });
    };
    const same = d.every((x) => x === d[0]);
    let asc = n >= 3;
    let desc = n >= 3;
    for (let i = 1; i < n; i++) {
        if (d[i] - d[i - 1] !== 1)
            asc = false;
        if (d[i] - d[i - 1] !== -1)
            desc = false;
    }
    const full = asc || desc;
    const distinct = new Set(d).size;
    const half = n / 2;
    const ping = n >= 4 && distinct === 2 && d[0] !== d[1] && d.every((x, i) => x === d[i % 2]);
    const pal = n >= 3 && d.every((x, i) => x === d[n - 1 - i]);
    const echo = n >= 6 && n % 2 === 0 && d.every((x, i) => i < half || x === d[i - half]);
    const binary = d.every((x) => x <= 1);
    // Runs of one digit
    if (same) {
        add('jackpot', all, 10 ** (n - 1));
    }
    else {
        let i = 0;
        while (i < n) {
            let j = i;
            while (j + 1 < n && d[j + 1] === d[i])
                j++;
            const k = j - i + 1;
            if (k >= 2)
                add(RUN_ID[Math.min(k, 7)], range(i, j), 3 * 10 ** (k - 2));
            i = j + 1;
        }
    }
    // Runs that count up or down
    if (full) {
        add('stairway', all, 10 ** n / (2 * (11 - n)));
    }
    else {
        let i = 0;
        while (i < n - 1) {
            const dir = d[i + 1] - d[i];
            if (dir === 1 || dir === -1) {
                let j = i + 1;
                while (j + 1 < n && d[j + 1] - d[j] === dir)
                    j++;
                const k = j - i + 1;
                if (k >= 3)
                    add(k === 3 ? 'steps' : k === 4 ? 'stairs' : 'ladder', range(i, j), 15 * 10 ** (k - 3));
                i = j;
            }
            else {
                i++;
            }
        }
    }
    // Whole-number shapes
    if (ping)
        add('pingpong', all, 10 ** n / 90);
    if (pal && !same && !ping)
        add('palindrome', all, 10 ** Math.floor(half));
    if (echo && !same && !ping)
        add('echo', all, 10 ** half);
    // Binary numbers are full of repeats that score on their own, so 3^n (not 5^n) keeps the stack fair.
    if (binary && !same)
        add('binary', all, 3 ** n);
    if (!same && d.every((x) => x % 2 === 0))
        add('even', all, 2 ** n);
    if (!same && d.every((x) => x % 2 === 1))
        add('odd', all, 2 ** n);
    if (n >= 6 && distinct === n && !full) {
        let perms = 1;
        for (let i = 0; i < n; i++)
            perms *= 10 - i;
        add('rainbow', all, 10 ** n / perms);
    }
    if (n >= 4 && d[0] === d[n - 1] && !pal && !same && !ping)
        add('bookends', [0, n - 1], 4);
    const sevens = all.filter((i) => d[i] === 7);
    if (sevens.length >= 3)
        add('lucky7', sevens, sevens.length >= 5 ? 777 : sevens.length === 4 ? 77 : 7);
    // Properties of the value itself
    const s = d.join('');
    const v = parseInt(s, 10);
    // Exact doubling instead of bitwise maths: numbers can be 12 digits long, past the 32-bit range.
    let pw = 16;
    while (pw < v)
        pw *= 2;
    const p2 = v >= 16 && pw === v;
    if (p2)
        add('pow2', all, 10 ** n / (3.32 * n), `2^${Math.round(Math.log2(v))}`);
    const rt = Math.round(Math.sqrt(v));
    if (!p2 && v >= 16 && rt * rt === v)
        add('square', all, 10 ** half, `${rt} × ${rt}`);
    if (isPrime(v))
        add('prime', all, PRIME_MULT[n] ?? 17);
    // Secrets
    for (const [id, seq, m] of SECRETS) {
        const at = s.indexOf(seq);
        if (at >= 0)
            add(id, range(at, at + seq.length - 1), m);
    }
    hits.sort((a, b) => a.mult - b.mult);
    const rarity = hits.reduce((r, h) => r * h.mult, 1);
    return { digits: d, hits, rarity, tier: tierOf(rarity) };
}
/**
 * Final look of a number: every digit claimed by a pattern fuses into the
 * material of the overall tier, unclaimed digits stay stone.
 */
export function finalMats(a) {
    const m = a.digits.map(() => 0);
    for (const h of a.hits)
        for (const i of h.idx)
            m[i] = a.tier;
    return m;
}
export const toDigits = (s) => s.split('').map(Number);
/** Strongest verified number; not a claim of an exhaustive global maximum. */
export const BEST_VERIFIED_NUMBER = '177771177771';
export const bestVerifiedRoll = () => analyze(toDigits(BEST_VERIFIED_NUMBER));
export const FAIR = { repeat: 0, mirror: 0 };
function draw(i, d, n, dice) {
    if (dice.repeat + dice.mirror > 0) {
        const r = Math.random();
        if (i > 0 && r < dice.repeat)
            return d[i - 1];
        const partner = n - 1 - i;
        if (partner >= 0 && partner < i && r < dice.repeat + dice.mirror)
            return d[partner];
    }
    return Math.floor(Math.random() * 10);
}
export function rollDigits(n, dice = FAIR) {
    const d = [];
    for (let i = 0; i < n; i++)
        d.push(draw(i, d, n, dice));
    return d;
}
/** Flip a single digit in place, keeping the rest of the number. */
export function flipDigit(d, i, dice = FAIR) {
    const next = d.slice();
    next[i] = draw(i, next, next.length, dice);
    return next;
}
/**
 * Luck works honestly: it rolls extra hidden numbers and keeps the rarest.
 * Luck 2.5 means two candidates, plus a 50% chance of a third.
 */
export function rollBest(n, luck, dice = FAIR) {
    const tries = Math.max(1, Math.floor(luck) + (Math.random() < luck % 1 ? 1 : 0));
    let best = null;
    for (let t = 0; t < tries; t++) {
        const a = analyze(rollDigits(n, dice));
        if (!best || a.rarity > best.rarity)
            best = a;
    }
    return best;
}
