import { useEffect, useState } from 'react';
import {
  ACCOUNT_SESSION_EVENT,
  getPreviewAccountSession,
} from '../data/localAccount';

export function usePreviewAccountSession() {
  const [session, setSession] = useState(getPreviewAccountSession);

  useEffect(() => {
    const sync = () => setSession(getPreviewAccountSession());
    window.addEventListener('storage', sync);
    window.addEventListener(ACCOUNT_SESSION_EVENT, sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener(ACCOUNT_SESSION_EVENT, sync);
    };
  }, []);

  return session;
}
