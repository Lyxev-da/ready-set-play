import { getSprite, SPRITE_SIZE } from './pixelSprites';

/**
 * Rich 20×20 pixel-art icon. `size` keeps the legacy footprint (roughly the
 * old 9px glyphs × size) while the underlying artwork carries far more detail.
 * Shop plates scale the SVG up further in CSS so upgrades read as tiny items.
 */
export function PixelIcon({ name, size = 2, className, recolor }) {
    const runs = getSprite(name);
    const display = Math.max(8, Math.round(size * 10));

    return (
        <svg
            className={['pixel-icon', className].filter(Boolean).join(' ')}
            data-icon={name}
            width={display}
            height={display}
            viewBox={`0 0 ${SPRITE_SIZE} ${SPRITE_SIZE}`}
            shapeRendering="crispEdges"
            aria-hidden="true"
            focusable="false"
            style={{ flex: 'none', imageRendering: 'pixelated' }}
        >
            {runs.map((r, i) => (
                <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={recolor ?? r.c} />
            ))}
        </svg>
    );
}
