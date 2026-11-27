import { useEffect, useState } from 'react';
import { StartScreen } from './components/StartScreen';
import { Game } from './components/Game';
import { installTextures } from './game/textures';
import { flushCloudSaves, loadCloudAccount } from './cloud';

export default function GameShell() {
  const [mode, setMode] = useState(null);
  const [account, setAccount] = useState(null);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    installTextures();
    let alive = true;
    const restore = async () => {
      try {
        const player = await loadCloudAccount();
        if (alive) { setAccount(player); setNotice(''); }
      } catch (e) { if (alive) setNotice(e instanceof Error ? e.message : 'Could not restore your account.'); }
      finally { if (alive) setReady(true); }
    };
    void restore();
    const status = (event) => setNotice(event.detail);
    window.addEventListener('cloud-save-status', status);
    return () => {
      alive = false;
      window.removeEventListener('cloud-save-status', status);
      void flushCloudSaves();
    };
  }, []);
  if (!ready) return <main className="arcade-loading" aria-busy="true"><h1>ONE IN A ZILLION</h1><p>OPENING THE ARCADE…</p></main>;
  return <>
    {mode ? <Game key={`${account?.id ?? 'guest'}:${mode}`} mode={mode} account={account} onExit={() => { void flushCloudSaves(); setMode(null); }} /> : <StartScreen account={account} onAuthChanged={setAccount} onPick={setMode} />}
    {notice && <p className="cloud-save-indicator" role="status">{notice}</p>}
  </>;
}
