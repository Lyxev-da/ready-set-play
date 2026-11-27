import { Button } from '@/components/ui/button';
import { useMemo } from 'react';
import { GLYPHS } from '../game/glyphs';
import { analyze, finalMats, toDigits } from '../game/patterns';
/**
 * One digit block: a procedural 16×20 pixel texture with a 5×7 bitmap digit
 * on top. Size comes from the --px custom property (one texel).
 */
export function Tile({ ch, mat, animKey = 0, anim = '', live = false, nudge = false, onNudge, flipping = false, label, }) {
    const d = GLYPHS[ch] ?? GLYPHS['?'];
    const cls = [
        'tile',
        `mat-${mat < 0 ? 'blank' : mat}`,
        anim,
        live ? 'is-live' : '',
        flipping ? 'is-flipping' : '',
        onNudge ? 'is-nudgeable' : '',
        mat >= 3 ? 'shiny' : '',
    ]
        .filter(Boolean)
        .join(' ');
    const face = (<>
      <i className="tile-face"/>
      <svg className={`tile-glyph${nudge ? ' nudge' : ''}`} viewBox="0 0 5.5 7.5" shapeRendering="crispEdges" aria-hidden="true">
        <path className="g-sh" d={d} transform="translate(0.5 0.5)"/>
        <path className="g-ink" d={d}/>
      </svg>
    </>);
    return (<div className="tile-slot">
      {onNudge ? (<Button variant="arcade" size="arcade" key={animKey} type="button" className={cls} onClick={onNudge} aria-label={label ?? 'Nudge this digit'} disabled={flipping}>
          {face}
        </Button>) : (<div key={animKey} className={cls}>
          {face}
        </div>)}
    </div>);
}
/** A whole number as small tiles, for lists. Materials are derived from its patterns unless given. */
export function MiniNumber({ digits, mats, dim = false }) {
    const m = useMemo(() => mats ?? finalMats(analyze(toDigits(digits))), [digits, mats]);
    return (<span className={`mini${dim ? ' is-dim' : ''}`} role="img" aria-label={digits.split('').join(' ')}>
      {digits.split('').map((c, i) => (<Tile key={i} ch={c} mat={m[i] ?? 0}/>))}
    </span>);
}
