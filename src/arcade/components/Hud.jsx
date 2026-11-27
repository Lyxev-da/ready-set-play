import { Button } from '@/components/ui/button';
import { dailyReady } from '../game/state';
import { useCountUp } from '../game/useCountUp';
import { fmt, fmtShort } from '../game/format';
import { PixelIcon } from './PixelIcon';
import { Txt } from './Txt';
export function Hud({ save, accountName, isAdmin, onGift, onMute, onMode }) {
    const hard = save.mode === 'hardcore';
    const coins = useCountUp(save.coins, 450);
    const gift = dailyReady(save);
    return (<header className="hud">
      <h1 className="logo" aria-label="One in a Zillion">
        <span className="logo-sm" aria-hidden="true">
          ONE IN A
        </span>
        <span className="logo-lg" aria-hidden="true">
          ZILLION
        </span>
      </h1>

      <div className="hud-right">
        <Button variant="arcade" size="arcade" type="button" className={`btn btn-sm profile-chip${isAdmin ? ' is-admin' : ''}${accountName === 'GUEST' ? ' is-guest' : ''}`} onClick={onMode} title="Player profile. Open the mode select screen." aria-label={`${accountName === 'GUEST' ? 'Playing as guest' : `Signed in as ${accountName}`}. Open the mode select screen.`}>
          <PixelIcon name={isAdmin ? 'skull' : 'user'} size={2}/>
          <span>{accountName.toUpperCase()}</span>
        </Button>

        <Button variant="arcade" size="arcade" type="button" className={`btn btn-sm mode-chip${hard ? ' is-hard' : ''}`} onClick={onMode} aria-label={`${hard ? 'Hardcore' : 'Standard'} mode. Open the mode select screen.`} title={`${hard ? 'Hardcore' : 'Standard'} mode · change mode`}>
          <PixelIcon name={hard ? 'skull' : 'star'} size={2}/>
          <span>{hard ? 'HARDCORE' : 'STANDARD'}</span>
        </Button>

        <div className="stat" role="img" aria-label={`${fmt(save.coins)} coins`}>
          <PixelIcon name="coin" size={2}/>
          <span>{fmtShort(coins)}</span>
        </div>

        {gift ? (<Button variant="arcade" size="arcade" type="button" className="btn btn-sm btn-gold gift-btn" onClick={onGift} aria-label="Claim your daily gift">
            <PixelIcon name="gift" size={2}/>
            <span>GIFT</span>
          </Button>) : (<div className="stat stat-streak" role="img" aria-label={`Gift streak: ${save.daily.streak} day${save.daily.streak === 1 ? '' : 's'}. Come back tomorrow for the next one.`} title="Daily gift streak. Come back tomorrow.">
            <PixelIcon name="flame" size={2}/>
            <span>{save.daily.streak}</span>
          </div>)}

        <Button variant="arcade" size="arcade" type="button" className="btn btn-sm btn-icon" onClick={onMute} aria-label={save.muted ? 'Turn sound on' : 'Turn sound off'}>
          <PixelIcon name={save.muted ? 'soundOff' : 'soundOn'} size={2}/>
        </Button>
      </div>
    </header>);
}
export function Toasts({ toasts, onPick }) {
    return (<div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (<Button variant="arcade" size="arcade" key={t.id} type="button" className={`toast toast-${t.kind}${t.grade != null ? ` t-${t.grade}` : ''}`} onClick={() => onPick(t)}>
          <b>{t.title}</b>
          <span>
            <Txt>{t.text}</Txt>
          </span>
        </Button>))}
    </div>);
}
