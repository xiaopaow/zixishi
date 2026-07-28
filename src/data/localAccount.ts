import type { MembershipTier } from './membership';

const LOCAL_ACCOUNT_KEY = 'qishi.preview-account';
export const ACCOUNT_SESSION_EVENT = 'qishi-account-session-change';

export interface PreviewAccountSession {
  email: string;
  name: string;
  tier: MembershipTier;
  signedInAt: string;
}

function browserStorage(kind: 'localStorage' | 'sessionStorage') {
  if (typeof window === 'undefined') return undefined;
  try {
    return window[kind];
  } catch {
    return undefined;
  }
}

function safelyRemove(storage: Storage | undefined) {
  try {
    storage?.removeItem(LOCAL_ACCOUNT_KEY);
  } catch {
    // Storage may be denied by browser privacy policy.
  }
}

function readSession(storage: Storage | undefined) {
  if (!storage) return null;
  try {
    const raw = storage.getItem(LOCAL_ACCOUNT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PreviewAccountSession>;
    if (
      typeof parsed.email !== 'string' ||
      typeof parsed.name !== 'string' ||
      typeof parsed.signedInAt !== 'string'
    ) {
      safelyRemove(storage);
      return null;
    }
    return {
      email: parsed.email,
      name: parsed.name,
      tier: parsed.tier === 'plus' ? 'plus' : 'free',
      signedInAt: parsed.signedInAt,
    } satisfies PreviewAccountSession;
  } catch {
    safelyRemove(storage);
    return null;
  }
}

export function getPreviewAccountSession() {
  if (typeof window === 'undefined') return null;
  return (
    readSession(browserStorage('localStorage')) ??
    readSession(browserStorage('sessionStorage'))
  );
}

export function savePreviewAccountSession(
  session: PreviewAccountSession,
  persistent: boolean,
) {
  if (typeof window === 'undefined') return null;
  const local = browserStorage('localStorage');
  const currentTab = browserStorage('sessionStorage');
  const candidates: Array<{
    storage: Storage | undefined;
    mode: 'local' | 'session';
  }> = persistent
    ? [
      { storage: local, mode: 'local' },
      { storage: currentTab, mode: 'session' },
    ]
    : [{ storage: currentTab, mode: 'session' }];
  for (const { storage, mode } of candidates) {
    if (!storage) continue;
    try {
      storage.setItem(LOCAL_ACCOUNT_KEY, JSON.stringify(session));
      if (mode === 'local') safelyRemove(currentTab);
      if (mode === 'session') safelyRemove(local);
      window.dispatchEvent(new Event(ACCOUNT_SESSION_EVENT));
      return mode;
    } catch {
      // Fall back from persistent to current-tab storage when possible.
    }
  }
  return null;
}

export function clearPreviewAccountSession() {
  if (typeof window === 'undefined') return;
  safelyRemove(browserStorage('localStorage'));
  safelyRemove(browserStorage('sessionStorage'));
  window.dispatchEvent(new Event(ACCOUNT_SESSION_EVENT));
}

export function accountNameFromEmail(email: string) {
  const localPart = email.split('@')[0]?.trim();
  return localPart || '栖友';
}
