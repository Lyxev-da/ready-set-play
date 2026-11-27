const UNITS = [
    [1e18, 'Qi'],
    [1e15, 'Qa'],
    [1e12, 'T'],
    [1e9, 'B'],
    [1e6, 'M'],
];
/** Full number up to a million, then abbreviated (1.25M, 7.77B…). */
export function fmt(n) {
    if (!Number.isFinite(n))
        return '???';
    const v = Math.round(n);
    if (v < 1e6)
        return v.toLocaleString('en-US');
    for (const [u, s] of UNITS) {
        if (v >= u) {
            const x = v / u;
            return (x >= 100 ? x.toFixed(0) : x >= 10 ? x.toFixed(1) : x.toFixed(2)) + s;
        }
    }
    return String(v);
}
/** Tighter variant for prices and wallets. */
export function fmtShort(n) {
    const v = Math.round(n);
    if (v < 10000)
        return v.toLocaleString('en-US');
    if (v < 1e6)
        return (v / 1e3).toFixed(v < 1e5 ? 1 : 0) + 'K';
    return fmt(v);
}
