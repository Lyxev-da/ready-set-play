import { Button } from '@/components/ui/button';
import { useEffect, useRef, useState } from 'react';
import { PATTERNS, TIERS } from '../game/patterns';
import { EVOLVE_MAX, EVOLVE_NAMES, evolveIconFor, familyName, digitsOf, UPGRADE_GROUPS, QUESTS, upTierOf, upgradesFor, } from '../game/state';
import { boardPubkey, setDevPublish, syncBoard, useBoard } from '../game/board';
import { fmt, fmtShort } from '../game/format';
import { MiniNumber } from './Tile';
import { PixelIcon } from './PixelIcon';
import { Txt } from './Txt';
const TABS = [
    { id: 'shop', label: 'SHOP', title: 'UPGRADES', icon: 'up' },
    { id: 'dex', label: 'DEX', title: 'NUMBER DEX', icon: 'book' },
    { id: 'quests', label: 'QUESTS', title: 'QUESTS', icon: 'star' },
    { id: 'vault', label: 'VAULT', title: 'VAULT', icon: 'trophy' },
    { id: 'board', label: 'BOARD', title: 'LEADERBOARD', icon: 'trophy' },
    { id: 'admin', label: 'DEV', title: 'ZZZK DEV MODE', icon: 'skull' },
];
export function Panel({ save, tab, open, account, isAdmin, saveNotice, onTab, onClose, onBuy, onEvolve, onClaim, onSwitchMode, onExportSave, onImportSave, onMute, onToggleFx, onAdminAction, forced, forceNote, onForce }) {
    const hard = save.mode === 'hardcore';
    const tabs = TABS.filter((t) => t.id !== 'admin' || isAdmin);
    const claimable = QUESTS.filter((q) => {
        const [a, b] = q.prog(save);
        return a >= b && !save.claimed.includes(q.id);
    }).length;
    const affordable = upgradesFor(save.mode).filter((u) => save.up[u.id] < u.max && save.coins >= u.cost(save.up[u.id])).length;
    const badges = { shop: affordable, quests: claimable };
    const current = tabs.find((t) => t.id === tab) ?? tabs[0];
    return (<>
      <div className={`sheet-backdrop${open ? ' is-open' : ''}`} onClick={onClose} aria-hidden="true"/>
      <aside className={`panel${open ? ' is-open' : ''}`} aria-label="Upgrades and collection">
        <div className={`tabs tabs-${tabs.length}`} role="tablist" aria-label="Sections">
          {tabs.map((t) => (<Button variant="arcade" size="arcade" key={t.id} type="button" role="tab" id={`tab-${t.id}`} aria-selected={tab === t.id} aria-controls="panel-body" className="tab" onClick={() => onTab(t.id)}>
              <PixelIcon name={t.icon} size={2}/>
              <span>{t.label}</span>
              {!!badges[t.id] && (<b className={`badge${t.id === 'quests' ? ' is-hot' : ''}`} aria-label={`${badges[t.id]} ready`}>
                  {badges[t.id]}
                </b>)}
            </Button>))}
        </div>

        <div id="panel-body" className="panel-body" role="tabpanel" aria-labelledby={`tab-${tab}`}>
          <div className="panel-head">
            <h2>{current.title}</h2>
            {isAdmin && (<span className="panel-mode is-admin-badge" aria-label="Signed in as zzzk with developer access">
                <PixelIcon name="skull" size={2}/>
                ZZZK DEV
              </span>)}
            {!isAdmin && account && (<span className="panel-mode is-account-badge" aria-label={`Signed in as ${account.name}`}>
                <PixelIcon name="user" size={2}/>
                {account.name.toUpperCase()}
              </span>)}
            {hard && (<span className="panel-mode" aria-label="Hardcore save">
                <PixelIcon name="skull" size={2}/>
                HARDCORE
              </span>)}
            <Button variant="arcade" size="arcade" type="button" className="btn btn-sm btn-icon sheet-close" onClick={onClose} aria-label="Close panel">
              <PixelIcon name="close" size={2}/>
            </Button>
          </div>
          <div className="panel-scroll">
            {tab === 'shop' && <Shop save={save} onBuy={onBuy} onEvolve={onEvolve}/>}
            {tab === 'dex' && <Dex save={save}/>}
            {tab === 'quests' && <Quests save={save} onClaim={onClaim}/>}
            {tab === 'vault' && (<Vault save={save} account={account} saveNotice={saveNotice} onSwitchMode={onSwitchMode} onExportSave={onExportSave} onImportSave={onImportSave} onMute={onMute} onToggleFx={onToggleFx}/>)}
            {tab === 'board' && <Leaderboard save={save} account={account} onSwitchMode={onSwitchMode}/>}
            {tab === 'admin' && isAdmin && (<AdminPanel save={save} account={account} onAdminAction={onAdminAction} forced={forced} forceNote={forceNote} onForce={onForce}/>)}
          </div>
        </div>
      </aside>
    </>);
}
/* ---------- shop ---------- */
function Shop({ save, onBuy, onEvolve }) {
    const hard = save.mode === 'hardcore';
    const list = upgradesFor(save.mode);
    const owned = (id) => (id === 'nudge' ? ` · ${save.tickets} in hand` : '');
    const groups = UPGRADE_GROUPS.map((g) => ({ ...g, items: list.filter((u) => u.group === g.id) })).filter((g) => g.items.length);
    return (<>
      {hard && (<p className="shop-note">
          <PixelIcon name="skull" size={2}/>
          <span>
            <b>PURE LUCK.</b> Hardcore sells only digit slots and auto-roll. Luck, charms, coins and speed boosts are
            not for sale.
          </span>
        </p>)}
      {groups.map((g) => (<section key={g.id} className="shop-group">
          <h3 className="shop-group-title">
            <span>{g.id}</span>
            <small>{g.blurb}</small>
          </h3>
          <ul className="stack">
            {g.items.map((u) => {
                const lv = save.up[u.id];
                const tier = upTierOf(save, u.id);
                const maxed = lv >= u.max;
                const nextTier = tier < EVOLVE_MAX ? tier + 1 : null;
                const canEvolve = maxed && nextTier !== null;
                const cost = u.cost(lv);
                const can = save.coins >= cost;
                const name = familyName(u, tier);
                const icon = evolveIconFor(u, tier);
                return (<li key={u.id} className={`card${canEvolve ? ' can-evolve' : ''}`}>
              <div className={`card-icon ev-${tier}`}>
                <PixelIcon name={icon} size={3}/>
              </div>
              <div className="card-main">
                <div className="card-top">
                  <h3 className={`card-title clover-name${tier > 0 ? ` t-${Math.min(tier + 3, 8)}` : ''}`}>{name}</h3>
                  <span className="card-lv">
                    {maxed ? (canEvolve ? 'READY' : tier >= EVOLVE_MAX ? 'TRANSCENDED' : 'MAX') : `LV ${lv}/${u.max}`}
                  </span>
                </div>
                <p className="card-desc">
                  <Txt>{u.desc}</Txt>
                </p>
                <div className="card-foot">
                  <span className="card-fx">
                    <Txt>{`${u.show(lv, tier)}${owned(u.id)}`}</Txt>
                    {!maxed && (<>
                        {' > '}
                        <b>
                          <Txt>{u.show(lv + 1, tier)}</Txt>
                        </b>
                      </>)}
                  </span>
                  {canEvolve ? (<Button variant="arcade" size="arcade" type="button" className="btn btn-sm btn-evolve" onClick={() => onEvolve(u.id)} aria-label={`Reset ${name} and earn ${familyName(u, nextTier)}`}>
                      EVOLVE INTO {EVOLVE_NAMES[nextTier]}
                    </Button>) : !maxed ? (<Button variant="arcade" size="arcade" type="button" className="btn btn-sm btn-gold" disabled={!can} onClick={() => onBuy(u.id)} aria-label={`Buy ${name} for ${fmt(cost)} coins`}>
                      <PixelIcon name="coin" size={2}/>
                      {fmtShort(cost)}
                    </Button>) : (<span className="clover-final">{tier >= EVOLVE_MAX ? 'FULLY TRANSCENDED' : 'MAXED OUT'}</span>)}
                </div>
                {canEvolve ? (<p className="clover-warning">
                    RESET LEVELS? The new {familyName(u, nextTier).toLowerCase()} is 1.2x stronger and grants{' '}
                    {u.per(nextTier)}. Only this upgrade resets.
                  </p>) : !maxed && !can ? (<div className="bar" role="img" aria-label={`${Math.floor((save.coins / cost) * 100)}% of the way to affording this`}>
                    <i style={{ width: `${Math.min(100, (save.coins / cost) * 100)}%` }}/>
                  </div>) : null}
              </div>
            </li>);
            })}
          </ul>
        </section>))}
    </>);
}
/* ---------- dex ---------- */
function Dex({ save }) {
    const n = digitsOf(save);
    const tiersFound = save.tiers.filter((c) => c > 0).length;
    const patsFound = PATTERNS.filter((p) => save.dex[p.id]).length;
    return (<>
      <h3 className="sec-title">
        TIERS <span>{tiersFound}/{TIERS.length}</span>
      </h3>
      <ul className="tier-list">
        {TIERS.map((t, i) => {
            const count = save.tiers[i] ?? 0;
            const first = save.tierFirst[i];
            return (<li key={t.id} className="tier-row">
              {count ? <span className={`np-mini mat-${i}`}>{t.name}</span> : <span className="np-mini mat-blank">? ? ?</span>}
              {count && first ? (<MiniNumber digits={first}/>) : (<span className="tier-need">
                  <Txt>{i === 0 ? 'No pattern at all' : `Rarity ×${fmt(t.min)} or more`}</Txt>
                </span>)}
              {count > 0 && <span className="tier-count">×{fmtShort(count)}</span>}
            </li>);
        })}
      </ul>

      <h3 className="sec-title">
        PATTERNS <span>{patsFound}/{PATTERNS.length}</span>
      </h3>
      <ul className="stack">
        {PATTERNS.map((p) => {
            const e = save.dex[p.id];
            const hidden = !!p.secret && !e;
            const mats = p.mask.split('').map((c) => (c === '1' ? p.grade : 0));
            return (<li key={p.id} className={`card pat${e ? '' : ' is-unfound'}`}>
              <div className="card-main">
                <div className="card-top">
                  <h4 className={`card-title${e ? ` t-${p.grade}` : ''}`}>{hidden ? 'SECRET' : p.name}</h4>
                  <span className="card-lv">{e ? `FOUND ×${fmtShort(e.n)}` : n < p.min ? `NEEDS ${p.min} DIGITS` : 'NOT FOUND'}</span>
                </div>
                <p className="card-desc">{p.hint}</p>
                <div className="pat-foot">
                  {hidden ? <MiniNumber digits="????" mats={[-1, -1, -1, -1]} dim/> : <MiniNumber digits={p.ex} mats={mats} dim={!e}/>}
                  {e && (<span className="pat-best">
                      <Txt>{`Best stack ×${fmt(e.best)}`}</Txt>
                    </span>)}
                </div>
              </div>
            </li>);
        })}
      </ul>
    </>);
}
/* ---------- quests ---------- */
function Quests({ save, onClaim }) {
    const rows = QUESTS.map((q) => {
        const [a, b] = q.prog(save);
        const claimed = save.claimed.includes(q.id);
        return { q, a: Math.min(a, b), b, claimed, ready: !claimed && a >= b };
    }).sort((x, y) => (x.ready ? 0 : x.claimed ? 2 : 1) - (y.ready ? 0 : y.claimed ? 2 : 1));
    return (<ul className="stack">
      {rows.map(({ q, a, b, claimed, ready }) => (<li key={q.id} className={`card quest${claimed ? ' is-claimed' : ''}${ready ? ' is-ready' : ''}`}>
          <div className="card-main">
            <div className="card-top">
              <h3 className="card-title">{q.name}</h3>
              <span className="quest-reward">
                <PixelIcon name="coin" size={2}/>
                {fmtShort(q.reward)}
              </span>
            </div>
            <p className="card-desc">
              <Txt>{q.desc}</Txt>
            </p>
            {claimed ? (<p className="quest-done">
                <PixelIcon name="check" size={2}/> CLAIMED
              </p>) : ready ? (<Button variant="arcade" size="arcade" type="button" className="btn btn-sm btn-gold quest-claim" onClick={() => onClaim(q.id)}>
                CLAIM REWARD
              </Button>) : (<div className="quest-prog">
                <div className="bar" role="img" aria-label={`${fmt(a)} of ${fmt(b)}`}>
                  <i style={{ width: `${(a / b) * 100}%` }}/>
                </div>
                <span aria-hidden="true">
                  {fmtShort(a)}/{fmtShort(b)}
                </span>
              </div>)}
          </div>
        </li>))}
    </ul>);
}
/* ---------- vault and account files ---------- */
function Vault({ save, account, saveNotice, onSwitchMode, onExportSave, onImportSave, onMute, onToggleFx, }) {
    const top = save.best[0];
    const input = useRef(null);
    const accountLabel = account ? account.name.toUpperCase() : 'GUEST RUN';
    return (<>
      <div className={`account-vault${account?.role === 'admin' ? ' is-admin' : ''}`}>
        <div className="account-avatar" aria-hidden="true">
          <PixelIcon name={account?.role === 'admin' ? 'skull' : 'user'} size={3}/>
        </div>
        <div className="account-copy">
          <b>{accountLabel}</b>
          <span>{account ? (account.role === 'admin' ? 'ZZZK dev-access account' : 'Arcade account · on the global leaderboard') : 'No account. The global leaderboard is locked.'}</span>
        </div>
      </div>

      <section className="save-file" aria-labelledby="save-file-title">
        <h3 id="save-file-title" className="sec-title">SAVE FILE</h3>
        <p className="save-file-copy">
          Export both mode runs into one portable JSON file. Save files do not contain your account password.
        </p>
        <div className="save-file-actions">
          <Button variant="arcade" size="arcade" type="button" className="btn btn-sm btn-gold" onClick={onExportSave}>
            EXPORT SAVE
          </Button>
          <Button variant="arcade" size="arcade" type="button" className="btn btn-sm" onClick={() => input.current?.click()}>
            IMPORT SAVE
          </Button>
          <input ref={input} type="file" accept="application/json,.json" className="sr-only" onChange={(e) => {
            const file = e.currentTarget.files?.[0];
            if (file)
                onImportSave(file);
            e.currentTarget.value = '';
        }}/>
        </div>
        {saveNotice && <p className="save-file-notice" role="status"><Txt>{saveNotice}</Txt></p>}
      </section>

      <section className="settings" aria-labelledby="settings-title">
        <h3 id="settings-title" className="sec-title">
          SETTINGS
        </h3>
        <ul className="settings-list">
          <li>
            <div>
              <b>SOUND</b>
              <span>Blips, chimes and fanfares.</span>
            </div>
            <Button variant="arcade" size="arcade" type="button" className={`btn btn-sm toggle${save.muted ? '' : ' is-on'}`} onClick={onMute} aria-pressed={!save.muted}>
              {save.muted ? 'OFF' : 'ON'}
            </Button>
          </li>
          <li>
            <div>
              <b>SPECIAL FX</b>
              <span>Tier spectacles: nebula lightning, pillars of light, gravity wells.</span>
            </div>
            <Button variant="arcade" size="arcade" type="button" className={`btn btn-sm toggle${save.fxOn ? ' is-on' : ''}`} onClick={onToggleFx} aria-pressed={save.fxOn}>
              {save.fxOn ? 'ON' : 'OFF'}
            </Button>
          </li>
        </ul>
      </section>

      <h3 className="sec-title">RUN STATS</h3>
      <dl className="stats">
        <div>
          <dt>ROLLS</dt>
          <dd>{fmtShort(save.rolls)}</dd>
        </div>
        <div>
          <dt>BEST</dt>
          <dd>{top ? `×${fmt(top.rarity)}` : '-'}</dd>
        </div>
        <div>
          <dt>EARNED</dt>
          <dd>{fmtShort(save.earned)}</dd>
        </div>
      </dl>

      <h3 className="sec-title">BEST ROLLS</h3>
      {save.best.length === 0 ? (<p className="empty">Nothing here yet. Roll anything better than COMMON and it gets a shelf.</p>) : (<ol className="rolls">
          {save.best.map((r, i) => (<li key={r.digits} className="roll-row-item">
              <span className="rank">{i + 1}</span>
              <MiniNumber digits={r.digits}/>
              <span className={`roll-tier t-${r.tier}`}>
                {TIERS[r.tier].name}
                <small>×{fmt(r.rarity)}</small>
              </span>
            </li>))}
        </ol>)}

      <h3 className="sec-title">RECENT</h3>
      {save.recent.length === 0 ? (<p className="empty">Your last ten rolls will show up here.</p>) : (<ul className="rolls">
          {save.recent.map((r) => (<li key={r.at} className="roll-row-item is-compact">
              <MiniNumber digits={r.digits}/>
              <span className={`roll-tier t-${r.tier}`}>
                {TIERS[r.tier].name}
                <small>×{fmt(r.rarity)}</small>
              </span>
            </li>))}
        </ul>)}

      <div className="vault-foot">
        <p>
          <b>{save.mode === 'hardcore' ? 'HARDCORE' : 'STANDARD'}</b> save. Each mode keeps its own progress.
        </p>
        <Button variant="arcade" size="arcade" type="button" className="btn btn-sm" onClick={onSwitchMode}>
          CHANGE MODE
        </Button>
      </div>
    </>);
}
/* ---------- leaderboard ---------- */
function ago(ts) {
    if (!ts)
        return 'never';
    const sec = Math.max(0, Math.round((Date.now() - ts) / 1000));
    if (sec < 45)
        return 'just now';
    if (sec < 3600)
        return `${Math.round(sec / 60)} min ago`;
    if (sec < 86400)
        return `${Math.round(sec / 3600)} h ago`;
    return `${Math.round(sec / 86400)} d ago`;
}
function BoardLine({ row, rank, isMe }) {
    return (<li className={`board-row${isMe ? ' is-me' : ''}${row.dev ? ' is-admin' : ''}`}>
      <span className="board-rank">{rank}</span>
      <div className="board-player">
        <b>
          {row.name.toUpperCase()}
          {row.tag && <i className="board-tag">#{row.tag}</i>}
          {row.dev && <small>DEV</small>}
          {isMe && <small>YOU</small>}
        </b>
        <span className={`board-digits${row.digits.length > 9 ? ' is-long' : ''}`}>
          <MiniNumber digits={row.digits}/>
        </span>
      </div>
      <div className="board-score">
        <b className={`t-${row.tier}`}>×{fmt(row.rarity)}</b>
        <small className={`t-${row.tier}`}>{TIERS[row.tier].name}</small>
        <span>
          {fmtShort(row.rolls)} {row.rolls === 1 ? 'roll' : 'rolls'}
        </span>
      </div>
    </li>);
}
function Leaderboard({ save, account, onSwitchMode }) {
    const [filter, setFilter] = useState(save.mode);
    const board = useBoard();
    useEffect(() => {
        if (account)
            void syncBoard(account);
    }, [account]);
    if (!account) {
        return (<div className="leaderboard-lock">
        <PixelIcon name="lock" size={4}/>
        <h3>ACCOUNTS ONLY</h3>
        <p>A local player profile can publish your best roll on the global leaderboard. Profiles and saved progress stay on this device.</p>
        <ol>
          <li>Create or sign in on the mode select screen.</li>
          <li>Your best roll is ranked worldwide, separately in Standard and Hardcore.</li>
        </ol>
        <Button variant="arcade" size="arcade" type="button" className="btn btn-gold" onClick={onSwitchMode}>
          OPEN ACCOUNT SCREEN
        </Button>
      </div>);
    }
    const myPk = boardPubkey(account);
    const rows = board.rows[filter];
    const top = rows.slice(0, 50);
    const myIndex = rows.findIndex((r) => r.id === myPk);
    const mine = myIndex >= 0 ? rows[myIndex] : null;
    const hiddenDev = account.role === 'admin' && !board.devPublish;
    const modeName = filter === 'normal' ? 'STANDARD' : 'HARDCORE';
    const headline = board.status === 'live'
        ? `LIVE · ${board.sourcesOk}/${board.sourcesTotal} RELAYS`
        : board.status === 'offline'
            ? 'OFFLINE'
            : 'CONNECTING';
    const detail = board.status === 'live'
        ? board.syncedAt
            ? `Worldwide board. Synced ${ago(board.syncedAt)}.`
            : 'Worldwide board. Syncing now.'
        : board.status === 'offline'
            ? `No relay reachable. Showing the last sync (${ago(board.syncedAt)}).`
            : 'Reaching the worldwide board.';
    return (<>
      <div className={`board-status is-${board.status}`}>
        <i className="board-lamp" aria-hidden="true"/>
        <div className="board-status-text" role="status">
          <b>
            <Txt>{headline}</Txt>
          </b>
          <span>
            <Txt>{detail}</Txt>
          </span>
        </div>
        <Button variant="arcade" size="arcade" type="button" className="btn btn-sm" onClick={() => void syncBoard(account, { force: true })} disabled={board.busy}>
          {board.busy ? 'SYNCING' : 'REFRESH'}
        </Button>
      </div>

      <div className="board-tabs" role="tablist" aria-label="Leaderboard mode">
        {['normal', 'hardcore'].map((m) => (<Button variant="arcade" size="arcade" key={m} type="button" role="tab" aria-selected={filter === m} className="board-tab" onClick={() => setFilter(m)}>
            {m === 'normal' ? 'STANDARD' : 'HARDCORE'}
          </Button>))}
      </div>

      <p className={`board-me${mine ? ' is-listed' : ''}`}>
        {hiddenDev ? ('Dev scores are hidden from the board. Turn on PUBLISH DEV SCORES in the DEV tab to appear here.') : mine ? (<>
            <b>
              <Txt>{`YOU ARE #${myIndex + 1} OF ${rows.length}`}</Txt>
            </b>{' '}
            in {modeName}.
            {mine.tag && ` An earlier player holds this name, so you are listed as ${mine.name.toUpperCase()}#${mine.tag}.`}
            {board.pending && !board.busy && ' Your latest score is waiting to be sent.'}
          </>) : board.pending && !board.busy ? ('Your score is saved on this device and will be sent as soon as a relay is reachable.') : (`Not ranked in ${modeName} yet. Roll a number with at least one pattern in this mode to enter.`)}
      </p>

      {rows.length === 0 ? (<div className="empty board-empty">
          {board.status === 'offline'
                ? 'Could not reach the leaderboard. Check your connection, then press REFRESH.'
                : board.status === 'live' && !board.busy
                    ? `Nobody is ranked in ${modeName} yet. Roll a pattern and take first place.`
                    : 'Loading the worldwide board.'}
        </div>) : (<ol className="board">
          {top.map((row, index) => (<BoardLine key={row.id} row={row} rank={index + 1} isMe={row.id === myPk}/>))}
        </ol>)}
      {mine && myIndex >= 50 && (<ol className="board board-own" aria-label="Your position">
          <BoardLine row={mine} rank={myIndex + 1} isMe/>
        </ol>)}

      <p className="board-foot">
        Signed-in players publish their username and best number to this public board. Every device recomputes the rarity
        from the digits, so a score cannot be inflated.
      </p>
    </>);
}
/* ---------- zzzk local developer tools ---------- */
function AdminPanel({ save, account, forced, forceNote, onAdminAction, onForce, }) {
    const hard = save.mode === 'hardcore';
    const hardcoreBadge = hard ? 'HARDCORE' : 'STANDARD';
    const board = useBoard();
    return (<div className="admin-panel">
      <div className="admin-head">
        <PixelIcon name="skull" size={5}/>
        <div>
          <h3>ZZZK DEV MODE</h3>
          <p>Special access for verified developer accounts. These tools change your active save and sync it to Cloud.</p>
        </div>
      </div>

      <dl className="admin-readout">
        <div><dt>PROFILE</dt><dd>ZZZK / {hardcoreBadge}</dd></div>
        <div><dt>LEVELS</dt><dd>{save.up.luck}/20 CLOVER</dd></div>
        <div><dt>EVOLVED</dt><dd>{Object.values(save.upTier).filter((t) => t >= EVOLVE_MAX).length}/6 MAX</dd></div>
      </dl>

      <section className="force-panel" aria-labelledby="force-title">
        <h4 id="force-title" className="force-title">FORCE NEXT RARITY</h4>
        <p className="force-copy">Pick a tier. The next roll is forged onto it, then the forge switches off by itself.</p>
        <div className="force-grid">
          {TIERS.map((t, i) => (<Button variant="arcade" size="arcade" key={t.id} type="button" className={`force-btn mat-${i}${forced === i ? ' is-on' : ''}`} onClick={() => onForce(i)} aria-pressed={forced === i}>
              {t.name}
              <small>{i === 0 ? 'NO PATTERN' : `×${fmt(t.min)}+`}</small>
            </Button>))}
        </div>
        <div className="force-foot">
          <span>{forced === null ? 'FORGE OFF' : `LOCKED: ${TIERS[forced].name}`}</span>
          <Button variant="arcade" size="arcade" type="button" className="btn btn-sm" onClick={() => onForce(null)} disabled={forced === null}>
            CLEAR
          </Button>
        </div>
        {forceNote && (<p className="force-note" role="status">
            {forceNote}
          </p>)}
      </section>

      <ul className="settings-list admin-publish">
        <li>
          <div>
            <b>PUBLISH DEV SCORES</b>
            <span>Publishes this developer account on the global board. Turn off to hide its rolls from players.</span>
          </div>
          <Button variant="arcade" size="arcade" type="button" className={`btn btn-sm toggle${board.devPublish ? ' is-on' : ''}`} onClick={() => setDevPublish(!board.devPublish, account)} aria-pressed={board.devPublish}>
            {board.devPublish ? 'ON' : 'OFF'}
          </Button>
        </li>
      </ul>

      <div className="admin-tools">
        <Button variant="arcade" size="arcade" type="button" className="admin-tool" onClick={() => onAdminAction('coins')}>
          <PixelIcon name="coin" size={3}/>
          <span><b>GRANT 1B COINS</b><small>Adds 1,000,000,000 to coins and earned total.</small></span>
        </Button>
        <Button variant="arcade" size="arcade" type="button" className="admin-tool" onClick={() => onAdminAction('maxEvolve')}>
          <PixelIcon name="cloverTranscendent" size={3}/>
          <span><b>MAX ALL EVOLUTIONS</b><small>Every family becomes Transcendent, with its levels reset.</small></span>
        </Button>
        <Button variant="arcade" size="arcade" type="button" className="admin-tool" onClick={() => onAdminAction('maxAll')}>
          <PixelIcon name={hard ? 'slot' : 'up'} size={3}/>
          <span><b>{hard ? 'MAX LEGAL HARDCORE' : 'MAX ALL UPGRADES'}</b><small>{hard ? 'This still only grants digits and auto-roll.' : 'Maxes every Standard upgrade and clover tier.'}</small></span>
        </Button>
        <Button variant="arcade" size="arcade" type="button" className="admin-tool" onClick={() => onAdminAction('claims')}>
          <PixelIcon name="check" size={3}/>
          <span><b>MARK ALL QUESTS CLAIMED</b><small>Clears every quest badge without paying rewards.</small></span>
        </Button>
      </div>
      <Button variant="arcade" size="arcade" type="button" className="btn btn-sm admin-danger" onClick={() => onAdminAction('reset')}>
        <PixelIcon name="close" size={2}/> RESET THE ACTIVE RUN
      </Button>
      <p className="admin-warning">Reset does not touch your account password, the other mode, or other player accounts.</p>
    </div>);
}
