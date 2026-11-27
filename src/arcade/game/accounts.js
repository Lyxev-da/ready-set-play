import { loadSave, sanitizeSave, storeSave } from './state';
import { getActiveAccount, getSigningKey, profileStorageKey } from '../cloud';

export const DEV_NAME = 'zzzk';
export const currentAccount = getActiveAccount;
export const isDevAccount = (account) => account?.role === 'admin';
export const modeKey = (account, mode) => account ? profileStorageKey(account.id, mode) : undefined;
export const loadProfile = (account, mode) => loadSave(mode, modeKey(account, mode));
export const storeProfile = (account, save) => storeSave(save, modeKey(account, save.mode));
export const hasProfile = (account, mode) => loadProfile(account, mode).rolls > 0;
export const accountSecret = (account) => getSigningKey(account.id);

export function createSaveEnvelope(account) {
  return {
    game: 'One in a Zillion', format: 'one-in-a-zillion-save', version: 1,
    owner: account?.name ?? 'guest', exportedAt: new Date().toISOString(),
    modes: { normal: loadProfile(account, 'normal'), hardcore: loadProfile(account, 'hardcore') },
  };
}
export const saveEnvelopeText = (account) => JSON.stringify(createSaveEnvelope(account), null, 2);
export function parseSaveEnvelope(text) {
  const obj = JSON.parse(text);
  if (obj?.format === 'one-in-a-zillion-save' && obj.modes && typeof obj.modes === 'object') {
    return { modes: { normal: sanitizeSave(obj.modes.normal, 'normal'), hardcore: sanitizeSave(obj.modes.hardcore, 'hardcore') } };
  }
  if (obj && (obj.mode === 'normal' || obj.mode === 'hardcore')) {
    return { modes: {
      normal: sanitizeSave(obj.mode === 'normal' ? obj : loadSave('normal'), 'normal'),
      hardcore: sanitizeSave(obj.mode === 'hardcore' ? obj : loadSave('hardcore'), 'hardcore'),
    } };
  }
  throw new Error('That file is not a One in a Zillion save.');
}
export function importSaveEnvelope(account, envelope) {
  storeProfile(account, envelope.modes.normal);
  storeProfile(account, envelope.modes.hardcore);
}