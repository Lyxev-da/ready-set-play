/**
 * Local account layer.
 *
 * The original project synced accounts and saves through a hosted backend.
 * This port keeps the exact same interface but stores everything on the
 * device: accounts live in localStorage, each owns a random signing key for
 * the public Nostr leaderboard, and saves stay in the same per-account keys
 * the engine already used. Guests play without an account; creating one
 * inherits the browser's guest progress, just like the cloud version did.
 */

export interface ArcadeAccount {
  id: string;
  name: string;
  role: 'player' | 'admin';
  createdAt: number;
}

interface StoredAccount extends ArcadeAccount {
  signingKey: string;
}

const ACCOUNTS_KEY = 'one-in-a-zillion:accounts';
const ACTIVE_KEY = 'one-in-a-zillion:active-account';
const NAME_RE = /^[a-z0-9_]{3,16}$/i;
const DEV_NAME = 'zzzk';

let active: ArcadeAccount | null = null;
let signingKey = '';

export const getActiveAccount = () => active;

export function getSigningKey(id: string) {
  if (!active || active.id !== id || !signingKey) throw new Error('Please sign in again to connect the leaderboard.');
  return signingKey;
}

export const profileStorageKey = (id: string, mode: string) => `one-in-a-zillion:v1:account:${id}:${mode}`;

function readAccounts(): StoredAccount[] {
  try {
    const raw = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) ?? '[]');
    if (!Array.isArray(raw)) return [];
    return raw.filter(
      (a): a is StoredAccount =>
        !!a && typeof a === 'object' && typeof a.id === 'string' && typeof a.name === 'string' && typeof a.signingKey === 'string',
    );
  } catch {
    return [];
  }
}

function writeAccounts(list: StoredAccount[]) {
  try {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(list));
  } catch {
    /* storage unavailable: the session still works */
  }
}

function randomHex(bytes: number) {
  const buf = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(buf, (n) => n.toString(16).padStart(2, '0')).join('');
}

function activate(stored: StoredAccount) {
  active = { id: stored.id, name: stored.name, role: stored.role, createdAt: stored.createdAt };
  signingKey = stored.signingKey;
  try {
    localStorage.setItem(ACTIVE_KEY, stored.id);
  } catch {
    /* ignore */
  }
  return active;
}

/** All accounts stored on this device. */
export function listLocalAccounts(): ArcadeAccount[] {
  return readAccounts().map(({ id, name, role, createdAt }) => ({ id, name, role, createdAt }));
}

/** Is this player name already taken on this device? */
export function localNameTaken(name: string): boolean {
  const lower = name.trim().toLowerCase();
  return readAccounts().some((a) => a.name.toLowerCase() === lower);
}

/**
 * Create a local account: a unique player name plus a fresh random signing
 * key for the leaderboard. A brand-new account inherits this browser's guest
 * progress, mirroring the original cloud behaviour.
 */
export function createLocalAccount(rawName: string): ArcadeAccount {
  const name = rawName.trim().toLowerCase();
  if (!NAME_RE.test(name)) throw new Error('Use 3–16 letters, numbers, or underscores for your player name.');
  const list = readAccounts();
  if (list.some((a) => a.name.toLowerCase() === name)) throw new Error('That player name is already occupied on this device. Please choose another.');
  const stored: StoredAccount = {
    id: randomHex(16),
    name,
    role: name === DEV_NAME ? 'admin' : 'player',
    createdAt: Date.now(),
    signingKey: randomHex(32),
  };
  list.push(stored);
  writeAccounts(list);
  for (const mode of ['normal', 'hardcore'] as const) {
    const guest = localStorage.getItem(`one-in-a-zillion:v1:${mode}`);
    if (guest) localStorage.setItem(profileStorageKey(stored.id, mode), guest);
  }
  return activate(stored);
}

/** Sign in to an existing local account. */
export function signInLocalAccount(id: string): ArcadeAccount {
  const stored = readAccounts().find((a) => a.id === id);
  if (!stored) throw new Error('That account is no longer on this device.');
  return activate(stored);
}

/** Restore the previously active account, if any. */
export async function loadCloudAccount(): Promise<ArcadeAccount | null> {
  try {
    const id = localStorage.getItem(ACTIVE_KEY);
    if (!id) {
      active = null;
      signingKey = '';
      return null;
    }
    const stored = readAccounts().find((a) => a.id === id);
    if (!stored) {
      active = null;
      signingKey = '';
      return null;
    }
    return activate(stored);
  } catch {
    active = null;
    signingKey = '';
    return null;
  }
}

/**
 * Saves are written to localStorage synchronously by the engine itself, so
 * there is nothing to queue or flush here. These stay as no-ops so the rest
 * of the game code does not need to change.
 */
export function queueCloudSave(_key: string, _save: unknown) {
  /* local storage is the save: nothing to sync */
}

export async function flushCloudSaves(): Promise<void> {
  /* nothing pending: saves are already on this device */
}

export async function signOutCloud() {
  active = null;
  signingKey = '';
  try {
    localStorage.removeItem(ACTIVE_KEY);
  } catch {
    /* ignore */
  }
}
