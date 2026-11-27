import { useCallback, useEffect, useState } from 'react';
import { useGame } from '../game/useGame';
import { sfx } from '../game/sfx';
import { isDevAccount, modeKey, saveEnvelopeText, parseSaveEnvelope, importSaveEnvelope, } from '../game/accounts';
import { applyDevGrant, canNudge } from '../game/state';
import { reportBest, syncBoard } from '../game/board';
import { Hud, Toasts } from './Hud';
import { Stage } from './Stage';
import { Panel } from './Panel';
export function Game({ mode, account, onExit, }) {
    const profileKey = modeKey(account, mode);
    const game = useGame(mode, profileKey);
    const [tab, setTab] = useState('shop');
    const [open, setOpen] = useState(false);
    const [notice, setNotice] = useState('');
    const [forceNote, setForceNote] = useState('');
    const isAdmin = isDevAccount(account);
    const profileName = account?.name ?? 'GUEST';
    // Global leaderboard: reserve the name and pull the board when a session starts...
    useEffect(() => {
        if (account)
            void syncBoard(account);
    }, [account]);
    // ...and publish whenever this run's best roll changes.
    const bestDigits = game.save.best[0]?.digits ?? '';
    useEffect(() => {
        if (account && bestDigits)
            reportBest(account);
    }, [account, bestDigits]);
    const pickTab = useCallback((t) => {
        sfx.ui();
        if (open && t === tab)
            setOpen(false);
        else {
            setTab(t);
            setOpen(true);
        }
    }, [open, tab]);
    const openTab = useCallback((t) => {
        setTab(t);
        setOpen(true);
    }, []);
    const onToast = useCallback((t) => {
        game.dismissToast(t.id);
        if (t.kind === 'quest')
            openTab('quests');
        else if (t.kind === 'new' || t.kind === 'tier')
            openTab('dex');
    }, [game, openTab]);
    const exportSaveFile = useCallback(() => {
        const blob = new Blob([saveEnvelopeText(account)], { type: 'application/json;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `zillion-${account?.name ?? 'guest'}-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
        sfx.ui();
        setNotice('SAVE FILE DOWNLOADED');
    }, [account]);
    const importSaveFile = useCallback(async (file) => {
        if (file.size > 2_000_000) {
            setNotice('SAVE FILE TOO LARGE');
            sfx.deny();
            return;
        }
        try {
            const envelope = parseSaveEnvelope(await file.text());
            importSaveEnvelope(account, envelope);
            game.replaceSave(envelope.modes[mode]);
            setNotice('SAVE FILE RESTORED');
            sfx.claim();
        }
        catch (e) {
            setNotice(e instanceof Error ? e.message.toUpperCase() : 'NOT A SAVE FILE');
            sfx.deny();
        }
    }, [account, game, mode]);
    const adminAction = useCallback(async (kind) => {
        if (!isAdmin)
            return;
        if (kind === 'reset') {
            const ok = window.confirm('Reset the active run? The whole current mode will become fresh.');
            if (!ok)
                return;
            const fresh = applyDevGrant(game.save, 'reset');
            game.replaceSave(fresh);
            setNotice('ACTIVE RUN RESET');
            return;
        }
        game.admin(kind);
        setNotice(kind === 'claims' ? 'ALL QUESTS CLAIMED (NO COIN PAYOUT)' : 'DEV TOOL APPLIED');
    }, [game, isAdmin]);
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape')
                setOpen(false);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);
    // Dev-only: only zzzk can forge rolls.
    const forceAction = useCallback(async (tier) => {
        if (!isAdmin)
            return;
        sfx.ui();
        setForceNote(game.forceNext(tier));
    }, [game, isAdmin]);
    const { roll } = game;
    const onRoll = useCallback(() => roll.current(), [roll]);
    return (<div className="app">
      <Hud save={game.save} accountName={profileName} isAdmin={isAdmin} onGift={game.claimDaily} onMute={game.toggleMute} onMode={onExit}/>
      <main className="main">
        <Stage view={game.view} save={game.save} busy={game.busy} canNudge={canNudge(game.save)} api={game.stage} onRoll={onRoll} onNudge={(i) => void game.nudge(i)} onAuto={game.toggleAuto} onShop={() => openTab('shop')}/>
        <Panel save={game.save} tab={tab} open={open} account={account} isAdmin={isAdmin} saveNotice={notice} onTab={pickTab} onClose={() => setOpen(false)} onBuy={game.buy} onEvolve={game.evolve} onClaim={game.claim} onSwitchMode={onExit} onExportSave={exportSaveFile} onImportSave={importSaveFile} onMute={game.toggleMute} onToggleFx={game.toggleFx} onAdminAction={adminAction} forced={game.forced} forceNote={forceNote} onForce={forceAction}/>
      </main>
      <Toasts toasts={game.toasts} onPick={onToast}/>
    </div>);
}
