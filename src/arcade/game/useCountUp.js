import { useEffect, useRef, useState } from 'react';
/**
 * Ticks a number up to its target in chunky steps (arcade score-counter feel).
 * Drops happen instantly. `geo` interpolates multiplicatively, which reads
 * better for scores that jump by ×10 or ×100.
 */
export function useCountUp(target, ms = 320, geo = false) {
    const [value, setValue] = useState(target);
    const current = useRef(target);
    useEffect(() => {
        const start = current.current;
        const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (target <= start || reduced) {
            current.current = target;
            setValue(target);
            return;
        }
        let raf = 0;
        const t0 = performance.now();
        const tick = (now) => {
            const p = Math.min(1, (now - t0) / ms);
            const q = Math.ceil(p * 8) / 8;
            const v = p >= 1
                ? target
                : geo && start >= 1
                    ? Math.round(start * (target / start) ** q)
                    : Math.round(start + (target - start) * q);
            current.current = v;
            setValue(v);
            if (p < 1)
                raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [target, ms, geo]);
    return value;
}
