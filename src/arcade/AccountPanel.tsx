import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import {
  createLocalAccount,
  listLocalAccounts,
  signInLocalAccount,
  signOutCloud,
  type ArcadeAccount,
} from './cloud';
import { lookupName } from './game/board';

interface Props { account: ArcadeAccount | null; onAuthChanged: (account: ArcadeAccount | null) => void; }

export function AccountPanel({ account, onAuthChanged }: Props) {
  const [creating, setCreating] = useState(false);
  const [username, setUsername] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(''); setNote('');
    try {
      if (!/^[a-z0-9_]{3,16}$/i.test(username)) throw new Error('Use 3–16 letters, numbers, or underscores for your player name.');
      if (await lookupName(username) === 'taken') throw new Error('That player name is already occupied on the global leaderboard. Please choose another.');
      onAuthChanged(createLocalAccount(username));
      setUsername('');
      setCreating(false);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not create your account. Please try again.'); }
    finally { setBusy(false); }
  }

  if (account) return <div className="account-bar"><div className={`account-session${account.role === 'admin' ? ' is-admin' : ''}`}>
    <div className="account-copy"><b>{account.name.toUpperCase()}</b><span>Local saves · global leaderboard</span></div>
    <Button variant="arcade" size="arcade" className="btn btn-sm account-signout" disabled={busy} onClick={async () => {
      setBusy(true); setError('');
      try { await signOutCloud(); onAuthChanged(null); } catch (e) { setError(e instanceof Error ? e.message : 'Could not sign out.'); } finally { setBusy(false); }
    }}>SIGN OUT</Button>
    {error && <p className="account-error" role="alert">{error}</p>}
  </div></div>;

  const saved = listLocalAccounts();

  return <div className="account-bar">
    {creating ? (
      <form className="account-form cloud-account-form is-create" onSubmit={submit}>
        <div className="account-form-head"><b>CREATE ACCOUNT</b><span>Local saves · global leaderboard</span></div>
        <label>PLAYER NAME<input value={username} onChange={(e) => setUsername(e.target.value.replace(/[^A-Za-z0-9_]/g, ''))} autoComplete="username" maxLength={16} minLength={3} required placeholder="3–16 CHARACTERS" /></label>
        <div className="account-actions">
          <Button variant="arcade" size="arcade" type="submit" className="btn btn-sm btn-gold" disabled={busy}>{busy ? 'CREATING' : 'CREATE'}</Button>
          <Button variant="arcade" size="arcade" type="button" className="btn btn-sm" disabled={busy} onClick={() => { setCreating(false); setError(''); }}>BACK</Button>
        </div>
        {error && <p className="account-error" role="alert">{error}</p>}
        {note && <p className="account-note" role="status">{note}</p>}
      </form>
    ) : (
      <div className="account-form cloud-account-form">
        <div className="account-form-head"><b>PLAYER</b><span>Local saves · global leaderboard</span></div>
        {saved.length > 0 && (
          <div className="account-actions">
            {saved.map((a) => (
              <Button key={a.id} variant="arcade" size="arcade" type="button" className="btn btn-sm" disabled={busy} onClick={() => {
                setBusy(true); setError('');
                try { onAuthChanged(signInLocalAccount(a.id)); } catch (e) { setError(e instanceof Error ? e.message : 'Could not sign in.'); } finally { setBusy(false); }
              }}>{a.name.toUpperCase()}</Button>
            ))}
          </div>
        )}
        <Button variant="arcade" size="arcade" type="button" className="btn btn-sm btn-gold" disabled={busy} onClick={() => { setCreating(true); setError(''); }}>
          {saved.length > 0 ? 'NEW PLAYER' : 'CREATE ACCOUNT'}
        </Button>
        {error && <p className="account-error" role="alert">{error}</p>}
      </div>
    )}
  </div>;
}
