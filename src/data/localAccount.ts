import type { MembershipTier } from './membership';

const LOCAL_ACCOUNT_KEY = 'qishi.preview-account';

export interface PreviewAccountSession {
  email: string;
  name: string;
  tier: MembershipTier;
  signedInAt: string;
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
      storage.removeItem(LOCAL_ACCOUNT_KEY);
      return null;
    }
    return {
      email: parsed.email,
      name: parsed.name,
      tier: parsed.tier === 'plus' ? 'plus' : 'free',
      signedInAt: parsed.signedInAt,
    } satisfies PreviewAccountSession;
  } catch {
    storage.removeItem(LOCAL_ACCOUNT_KEY);
    return null;
  }
}

export function getPreviewAccountSession() {
  if (typeof window === 'undefined') return null;
  return (
    readSession(window.localStorage) ??
    readSession(window.sessionStorage)
  );
}

export function savePreviewAccountSession(
  session: PreviewAccountSession,
  persistent: boolean,
) {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(LOCAL_ACCOUNT_KEY);
  window.sessionStorage.removeItem(LOCAL_ACCOUNT_KEY);
  const storage = persistent ? window.localStorage : window.sessionStorage;
  storage.setItem(LOCAL_ACCOUNT_KEY, JSON.stringify(session));
}

export function clearPreviewAccountSession() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(LOCAL_ACCOUNT_KEY);
  window.sessionStorage.removeItem(LOCAL_ACCOUNT_KEY);
}

export function accountNameFromEmail(email: string) {
  const localPart = email.split('@')[0]?.trim();
  return localPart || '栖友';
}
