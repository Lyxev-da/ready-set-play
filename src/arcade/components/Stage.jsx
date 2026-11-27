import { Button } from '@/components/ui/button';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Fx } from '../game/fx';
import { TIERS, tierOf } from '../game/patterns';
import { baseLuck, chargeEvery, effectiveLuck, isCharged, nudgeCap, nudgeEvery } from '../game/state';
import { useCountUp } from '../game/useCountUp';
import { fmt } from '../game/format';
import { Tile } from './Tile';
import { PixelIcon } from './PixelIcon';
export function Stage({ view, save, busy, canNudge, api, onRoll, onBestRoll, onNudge, onAuto, onShop }) {
    const root = useRef(null);
    const inner = useRef(null);
    const back = useRef(null);
    const front = useRef(null);
    const tray = useRef(null);
    const [box, setBox] = useState({ w: 900, h: 640 });
    const [tick, setTick] = useState(0);
    const [spacePressed, setSpacePressed] = useState(false);
    const n = view.digits.length;
    const maxPx = box.h < 460 ? 3 : box.h < 600 ? 4 : box.h < 700 ? 5 : 6;
    // Halved texel sizes below 2px keep long evolved numbers (up to 12 digits) on screen.
    const px = Math.max(1.5, Math.min(maxPx, Math.floor(((box.w - 24) / (18 * n + 10)) * 2) / 2));
    // Point the wall light at the middle of the tile tray.
    const aimLight = () => {
        const el = root.current;
        const t = tray.current;
        const fx = api.current.fx;
        if (!el || !t || !fx)
            return;
        const r = el.getBoundingClientRect();
        const q = t.getBoundingClientRect();
        if (!r.width || !r.height)
            return;
        fx.setCenter((q.left + q.width / 2 - r.left) / r.width, (q.top + q.height / 2 - r.top) / r.height);
    };
    useEffect(() => {
        const el = root.current;
        const b = back.current;
        const f = front.current;
        if (!el || !b || !f)
            return;
        const handle = api.current;
        const fx = new Fx(b, f);
        fx.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        handle.fx = fx;
        const measure = () => {
            const r = el.getBoundingClientRect();
            fx.resize(r.width, r.height, r.width < 640 ? 3 : 4);
            setBox({ w: Math.round(r.width), h: Math.round(r.height) });
            aimLight();
        };
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        measure();
        fx.start();
        return () => {
            ro.disconnect();
            fx.stop();
            handle.fx = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [api]);
    useLayoutEffect(aimLight);
    // Hand the game loop a way to find tiles and shake the stage.
    useEffect(() => {
        const handle = api.current;
        handle.tilePos = (i) => {
            const el = root.current;
            const t = tray.current;
            if (!el || !t)
                return [0.5, 0.4];
            const r = el.getBoundingClientRect();
            const q = (t.children[i] ?? t).getBoundingClientRect();
            return [(q.left + q.width / 2 - r.left) / r.width, (q.top + q.height / 2 - r.top) / r.height];
        };
        handle.shake = (level) => {
            const el = inner.current;
            if (!el)
                return;
            el.classList.remove('shake-1', 'shake-2', 'shake-3');
            void el.offsetWidth;
            el.classList.add(`shake-${level}`);
        };
    }, [api]);
    // Unlocked tiles cycle digits while spinning, and a nudged tile spins on its own.
    const spinning = (view.phase === 'spin' && view.locked < n) || view.nudgeIdx >= 0;
    useEffect(() => {
        if (!spinning)
            return;
        const id = window.setInterval(() => setTick((t) => t + 1), 60);
        return () => window.clearInterval(id);
    }, [spinning]);
    // Give SPACE / Enter the same tactile downward push as clicking the arcade button.
    useEffect(() => {
        let releaseTimer = 0;
        let downAt = 0;
        const onDown = (e) => {
            if (e.code !== 'Space' && e.code !== 'Enter')
                return;
            const t = e.target;
            if (t && t.closest('button, a, input, textarea, select, [role="tab"]') && !t.closest('.roll-btn'))
                return;
            window.clearTimeout(releaseTimer);
            downAt = performance.now();
            setSpacePressed(true);
        };
        const release = () => {
            window.clearTimeout(releaseTimer);
            const wait = Math.max(0, 110 - (performance.now() - downAt));
            if (wait > 0) {
                releaseTimer = window.setTimeout(() => setSpacePressed(false), wait);
            }
            else {
                setSpacePressed(false);
            }
        };
        const onUp = (e) => {
            if (e.code === 'Space' || e.code === 'Enter')
                release();
        };
        const onBlur = () => {
            window.clearTimeout(releaseTimer);
            setSpacePressed(false);
        };
        window.addEventListener('keydown', onDown);
        window.addEventListener('keyup', onUp);
        window.addEventListener('blur', onBlur);
        return () => {
            window.clearTimeout(releaseTimer);
            window.removeEventListener('keydown', onDown);
            window.removeEventListener('keyup', onUp);
            window.removeEventListener('blur', onBlur);
        };
    }, []);
    const done = view.phase === 'done';
    const dark = view.phase === 'dark';
    const tier = view.tier ?? 0;
    const hard = save.mode === 'hardcore';
    const every = chargeEvery(save);
    const charged = !hard && isCharged(save);
    const luck = effectiveLuck(save);
    const boosted = !hard && luck > baseLuck(save);
    const nudgeable = canNudge && done && !busy;
    const isTouch = typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches;
    const pot = Math.max(1, nudgeCap(save));
    const hasAuto = save.up.auto > 0;
    const announce = done
        ? `Rolled ${view.digits.join(' ')}. ${TIERS[tier].name}. Rarity times ${fmt(view.rarity)}. ${view.hits.length ? view.hits.map((h) => h.label).join(', ') : 'No pattern'}.`
        : '';
    return (<section ref={root} className={`stage${dark ? ' is-dark' : ''}${done && tier === 8 ? ' is-glitch' : ''}${done && tier === 11 ? ' is-break' : ''}${done && tier === 9 ? ' is-eclipse' : ''}`} style={{ '--px': `${px}px`, '--tint': TIERS[tier].color }} aria-label="Roll stage">
      <canvas ref={back} className="fx-canvas" aria-hidden="true"/>
      <div className="blackout" aria-hidden="true"/>
      {done && tier >= 6 && <i key={`tint-${view.id}`} className="tier-tint" aria-hidden="true"/>}

      <div ref={inner} className="stage-inner">
        <div className="wall">
          <Banner view={view}/>

          <div className="tray-wrap">
            <div ref={tray} className={`tray tense-${view.tension}${dark ? ' tremble' : ''}${nudgeable ? ' is-nudgeable' : ''}`} role="img" aria-label={view.phase === 'idle'
            ? 'No number rolled yet'
            : done
                ? `Number ${view.digits.join(' ')}`
                : 'Rolling'}>
              {view.digits.map((d, i) => {
            const idle = view.phase === 'idle';
            const flipping = view.nudgeIdx === i;
            const locked = !idle && !flipping && (view.phase !== 'spin' || i < view.locked);
            const ch = idle ? '?' : locked ? String(d) : String((i * 7 + tick * (3 + (i % 3))) % 10);
            return (<Tile key={i} ch={ch} mat={locked || flipping ? view.mats[i] ?? -1 : -1} animKey={view.id * 1000 + view.ak[i]} anim={view.acls[i]} live={view.live.includes(i)} flipping={flipping} nudge={!locked && !idle && (tick + i) % 2 === 0} onNudge={nudgeable && !flipping ? () => onNudge(i) : undefined} label={`Nudge digit ${i + 1} of ${n}`}/>);
        })}
            </div>
            {nudgeable && (<p className="nudge-hint" key={`hint-${view.id}-${save.tickets}`}>
                <PixelIcon name="nudge" size={2}/>
                <span>
                  <b>LUCKY NUDGE</b> · tap a digit{!isTouch ? ` or press ${n > 9 ? '1-9' : `1-${n}`}` : ''} to flip it
                  <i className="nudge-left">· {save.tickets} left</i>
                </span>
              </p>)}
            {view.label && (<div key={`${view.id}-${view.label.k}`} className={`hit-label t-${view.label.grade}`} style={{ left: `calc(var(--px) * ${3 + view.label.at * 18 + 8})` }} aria-hidden="true">
                {view.label.text}
              </div>)}
          </div>


          <ul className="chips" aria-label="Patterns found">
            {view.hits.map((h, i) => (<li key={`${view.id}-${i}`} className={`chip t-${h.grade}`}>
                <span>{h.label}</span>
                {h.note && <small>{h.note}</small>}
                <b>×{fmt(h.mult)}</b>
              </li>))}
            {done && view.hits.length === 0 && <li className="chip chip-none">NO PATTERN</li>}
          </ul>
        </div>

        <div className="deck">
          <div className="deck-meters">
          {hard ? (<div className="charge is-hc" role="img" aria-label="Hardcore mode. Pure luck, ×1.00, no boosts ever.">
              <span>HARDCORE</span>
              <i className="hc-meter" aria-hidden="true"/>
              <b>PURE LUCK ×1.00</b>
            </div>) : (<div className={`charge${charged ? ' is-full' : ''}`} role="img" aria-label={charged ? 'Charged roll ready: triple luck' : `Charge ${save.chargeCount} of ${every}`}>
              <span>{charged ? '×3 LUCK READY' : 'CHARGE'}</span>
              <div className="pips">
                {Array.from({ length: every }, (_, i) => (<i key={i} className={i < save.chargeCount ? 'on' : ''}/>))}
              </div>
            </div>)}

          {!hard && save.up.nudge > 0 && (<div className={`charge nudge-meter${save.tickets > 0 ? ' is-full' : ''}`} role="img" aria-label={`Lucky nudges: ${save.tickets} of ${pot} ready, one banks every ${nudgeEvery(save)} rolls`}>
              <span>NUDGE</span>
              <div className="pips">
                {Array.from({ length: Math.min(12, pot) }, (_, i) => (<i key={i} className={i < save.tickets ? 'on' : ''}/>))}
              </div>
              <b>{save.tickets > 0 ? `${save.tickets} READY` : `1 PER ${nudgeEvery(save)} ROLLS`}</b>
            </div>)}
          </div>

          <div className="roll-row">
            <div className={`luck${boosted ? ' is-boosted' : ''}`}>
              <span className="luck-label">{hard ? 'RAW LUCK' : 'LUCK'}</span>
              <span className="luck-val">×{luck.toFixed(2)}</span>
              {!hard && save.hotStreak > 0 && save.up.streak > 0 && (<span className="luck-streak" key={save.hotStreak} aria-label={`Hot streak ${save.hotStreak}`}>
                  <PixelIcon name="flame" size={2}/>
                  {save.hotStreak}
                </span>)}
              {!hard && save.charm > 0 && <span className="luck-charm">CHARM {save.charm}</span>}
            </div>

            <Button variant="arcade" size="arcade" type="button" className={`btn roll-btn ${charged && !busy ? 'btn-gold is-charged' : 'btn-red'}${spacePressed ? ' is-pressed' : ''}`} onClick={onRoll}>
              <span className="roll-btn-label">{busy ? 'SKIP' : 'ROLL'}</span>
            </Button>

            <div className="auto-cell">
              {hasAuto ? (<Button variant="arcade" size="arcade" type="button" className={`btn btn-sm auto-btn${save.autoOn ? ' is-on' : ''}`} onClick={onAuto} aria-pressed={save.autoOn}>
                  <i className="lamp" aria-hidden="true"/>
                  AUTO
                </Button>) : (<Button variant="arcade" size="arcade" type="button" className="btn btn-sm auto-btn is-locked" onClick={onShop} aria-label="Auto-roller is locked. Open the shop.">
                  <PixelIcon name="lock" size={2}/>
                  AUTO
                </Button>)}
            </div>
          </div>

          <div className="best-roll-row">
            <Button variant="arcade" size="arcade" type="button" className="btn btn-sm btn-gold" disabled={busy} onClick={onBestRoll} aria-label="Roll best number">
              <PixelIcon name="star" size={2}/> ROLL BEST NUMBER
            </Button>
          </div>
          <p className="key-hint">
            <kbd>SPACE</kbd> to roll · press again to skip
          </p>
        </div>
      </div>

      <canvas ref={front} className="fx-canvas fx-front" aria-hidden="true"/>
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
    </section>);
}
/** Payout chips are capped so a long list never pushes the number off small screens. */
const MAX_NOTES = typeof window !== 'undefined' && window.matchMedia('(max-width: 560px)').matches ? 2 : 6;
function Banner({ view }) {
    const shown = useCountUp(view.rarity, 300, true);
    const done = view.phase === 'done';
    const tier = view.tier ?? 0;
    if (view.phase === 'idle') {
        return (<div className="banner is-idle">
        <h2 className="idle-title">ROLL FOR A RARE NUMBER</h2>
        <p className="idle-sub">Every pattern hiding in the digits multiplies its rarity.</p>
      </div>);
    }
    const liveTier = done ? tier : tierOf(shown);
    return (<div className="banner">
      <div className="np-slot">
        {done ? (<div key={view.id} className={`np-anim${view.id ? ' slam' : ''}`}>
            <h2 className={`nameplate mat-${tier}${tier >= 4 ? ' wide' : ''}`}>
              <span>{TIERS[tier].name}</span>
            </h2>
          </div>) : (<span className={`rolling${view.phase === 'dark' ? ' is-alert' : ''}`}>
            {view.phase === 'dark' ? '! ! !' : view.charged ? 'CHARGED ROLL' : view.phase === 'scan' ? 'READING' : 'ROLLING'}
          </span>)}
      </div>

      <div className={`rarity t-${liveTier}`}>
        <small>RARITY</small>
        <span>×{fmt(shown)}</span>
      </div>

      <div className="reward-line">
        {done && view.reward > 0 && (<span key={view.id} className="reward">
            <PixelIcon name="coin" size={2}/>+{fmt(view.reward)}
          </span>)}
        {done &&
            view.flags.map((f) => (<span key={f} className={`flag${f === 'NEW BEST' ? ' is-best' : ''}${f === 'NO CHANGE' ? ' is-nochange' : ''}`}>
              {f}
            </span>))}
        {done &&
            view.notes.slice(0, MAX_NOTES).map((note) => (<span key={note} className="note-chip">
              {note}
            </span>))}
      </div>
    </div>);
}
