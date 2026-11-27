import { analyze } from './patterns';
const BUDGET = 12000;
const rnd = (k) => Math.floor(Math.random() * k);
/** Candidate families rotate so repeats, runs, palindromes and random numbers all get tried. */
function candidate(n, i) {
    switch (i % 6) {
        case 0: {
            const d = rnd(10);
            return Array.from({ length: n }, () => d);
        }
        case 1: {
            const k = 1 + rnd(Math.min(3, n));
            const block = Array.from({ length: k }, () => rnd(10));
            return Array.from({ length: n }, (_, j) => block[j % k]);
        }
        case 2: {
            const half = Array.from({ length: Math.ceil(n / 2) }, () => rnd(10));
            return Array.from({ length: n }, (_, j) => (j < half.length ? half[j] : half[n - 1 - j]));
        }
        case 3: {
            const start = rnd(10);
            const dir = rnd(2) ? 1 : -1;
            return Array.from({ length: n }, (_, j) => (((start + dir * j) % 10) + 10) % 10);
        }
        case 4: {
            const d = rnd(10);
            const out = Array.from({ length: n }, () => d);
            const changes = rnd(3);
            for (let c = 0; c < changes; c++)
                out[rnd(n)] = rnd(10);
            return out;
        }
        default:
            return Array.from({ length: n }, () => rnd(10));
    }
}
export function forgeTier(n, target) {
    let below = null;
    for (let i = 0; i < BUDGET; i++) {
        const a = analyze(candidate(n, i));
        if (a.tier === target)
            return { analysis: a, exact: true };
        if (a.tier < target && (!below || a.tier > below.tier || (a.tier === below.tier && a.rarity > below.rarity))) {
            below = a;
        }
    }
    return { analysis: below ?? analyze(candidate(n, 5)), exact: false };
}
