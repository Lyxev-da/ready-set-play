import { Button } from '@/components/ui/button';
import { AccountPanel } from '../AccountPanel';
import { useEffect, useMemo, useRef } from 'react';
import { Fx } from '../game/fx';
import { loadProfile, hasProfile, } from '../game/accounts';
import { fmt, fmtShort } from '../game/format';
import { TIERS } from '../game/patterns';
import { PixelIcon } from './PixelIcon';
import { Txt } from './Txt';
const INFO = {
    normal: {
        mode: 'normal',
        name: 'STANDARD',
        eyebrow: 'THE FULL ARCADE',
        desc: 'Every upgrade on the shelf. Stack luck, coins and faster rolls, then chase the rarer tiers.',
        plate: 'mat-2',
        rules: [
            { ok: true, text: 'Loaded dice, lucky nudges, streaks and coin boosts' },
            { ok: true, text: 'Daily ×2 luck charm' },
            { ok: true, text: 'Auto-roll and extra digit slots' },
            { ok: true, text: 'All 26 patterns and 9 tiers' },
        ],
    },
    hardcore: {
        mode: 'hardcore',
        name: 'HARDCORE',
        eyebrow: 'PURE RAW LUCK',
        desc: 'Nothing boosts your odds. Luck is sealed at ×1.00, so every rare number is earned by the dice alone.',
        plate: 'mat-5',
        rules: [
            { ok: false, text: 'No luck upgrades' },
            { ok: false, text: 'No charms or charge bonuses' },
            { ok: false, text: 'No coin or speed boosts' },
            { ok: true, text: 'Only digit slots and auto-roll for sale' },
        ],
    },
};
const ORDER = ['normal', 'hardcore'];
export function StartScreen({ account, onAuthChanged, onPick }) {
    const root = useRef(null);
    const back = useRef(null);
    const front = useRef(null);
    const saves = useMemo(() => ({ saves: { normal: loadProfile(account, 'normal'), hardcore: loadProfile(account, 'hardcore') }, made: { normal: hasProfile(account, 'normal'), hardcore: hasProfile(account, 'hardcore') } }), [account]);
    useEffect(() => {
        const el = root.current;
        const b = back.current;
        const f = front.current;
        if (!el || !b || !f)
            return;
        const fx = new Fx(b, f);
        fx.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const measure = () => {
            const r = el.getBoundingClientRect();
            fx.resize(r.width, r.height, r.width < 640 ? 3 : 4);
            fx.setCenter(0.5, 0.46);
        };
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        measure();
        fx.setLight('#ffa94d', 0.34, 0.22);
        fx.setRain(true, '#9b7b57');
        fx.start();
        return () => {
            ro.disconnect();
            fx.stop();
        };
    }, []);
    return (<div className="start" ref={root}>
      <canvas ref={back} className="fx-canvas" aria-hidden="true"/>
      <div className="start-scrim" aria-hidden="true"/>
      <div className="start-inner">
        <AccountPanel account={account} onAuthChanged={onAuthChanged}/>
        <header className="start-head">
          <h1 className="logo start-logo" aria-label="One in a Zillion">
            <span className="logo-sm" aria-hidden="true">
              ONE IN A
            </span>
            <span className="logo-lg" aria-hidden="true">
              ZILLION
            </span>
          </h1>
          <p className="start-title">CHOOSE YOUR RUN</p>
          <p className="start-sub">
            Roll a number. Every pattern hiding in its digits stacks the rarity. Decide how much help you get.
          </p>
        </header>

        <div className="modes">
          {ORDER.map((m) => (<ModeCard key={m} info={INFO[m]} save={saves.saves[m]} made={saves.made[m]} onPick={onPick}/>))}
        </div>

        <p className="start-foot">
          <PixelIcon name="coin" size={2}/> Progress stays separate per mode and is saved on this device. Local players can rank their best roll on the global leaderboard. Guests can still play.
        </p>
      </div>
      <canvas ref={front} className="fx-canvas fx-front" aria-hidden="true"/>
    </div>);
}
function ModeCard({ info, save, made, onPick, }) {
    const hard = info.mode === 'hardcore';
    const started = made && save.rolls > 0;
    const best = save.best[0];
    const tiers = save.tiers.filter((c) => c > 0).length;
    const icon = hard ? 'skull' : 'star';
    return (<article className={`mode-card${hard ? ' is-hardcore' : ''}`} aria-labelledby={`mode-${info.mode}`}>
      <div className="mode-top">
        <span className={`mode-plate ${info.plate}`} id={`mode-${info.mode}`}>
          {info.name}
        </span>
        <span className="mode-icon" aria-hidden="true">
          <PixelIcon name={icon} size={3}/>
        </span>
      </div>
      <p className="mode-eyebrow">{info.eyebrow}</p>
      <p className="mode-desc">
        <Txt>{info.desc}</Txt>
      </p>

      <ul className="mode-rules">
        {info.rules.map((r) => (<li key={r.text} className={r.ok ? 'is-yes' : 'is-no'}>
            <PixelIcon name={r.ok ? 'check' : 'close'} size={2}/>
            <span>{r.text}</span>
          </li>))}
      </ul>

      <div className="mode-save">
        {started ? (<>
            <span>
              <b>{fmtShort(save.rolls)}</b> ROLLS
            </span>
            <span>
              <b>{best ? `×${fmt(best.rarity)}` : '—'}</b> BEST
            </span>
            <span>
              <b>
                {tiers}/{TIERS.length}
              </b>{' '}
              TIERS
            </span>
          </>) : (<span className="mode-fresh">{hard ? 'A FRESH CHASE' : 'A FRESH SAVE'}</span>)}
      </div>

      <Button variant="arcade" size="arcade" type="button" className={`btn mode-cta ${hard ? 'btn-red' : 'btn-gold'}`} onClick={() => onPick(info.mode)} aria-label={`${started ? 'Continue' : 'Start'} ${info.name} mode`}>
        <PixelIcon name={icon} size={2}/>
        {started ? 'CONTINUE' : 'START RUN'}
      </Button>
    </article>);
}
