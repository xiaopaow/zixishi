import { useEffect, useState } from 'react';
import { supabaseConfigured } from '../backend/config';
import type { AccountSession } from '../backend/supabase';
import {
  ACCOUNT_SESSION_EVENT,
  getPreviewAccountSession,
} from '../data/localAccount';

const previewAccount = (): AccountSession | null => {
  const preview = getPreviewAccountSession();
  return preview
    ? {
        ...preview,
        id: `preview:${preview.email}`,
        role: 'member',
      }
    : null;
};

export function useAccountSession() {
  const [session, setSession] = useState<AccountSession | null>(() =>
    supabaseConfigured ? null : previewAccount(),
  );

  useEffect(() => {
    if (supabaseConfigured) {
      let active = true;
      let unsubscribe: () => void = () => undefined;
      void import('../backend/supabase')
        .then((accountService) => {
          if (!active) return;
          void accountService
            .getSupabaseAccountSession()
            .then((account) => {
              if (active) setSession(account);
            })
            .catch(() => {
              if (active) setSession(null);
            });
          unsubscribe = accountService.onSupabaseAccountChange((account) => {
            if (active) setSession(account);
          });
        })
        .catch(() => {
          if (active) setSession(null);
        });
      return () => {
        active = false;
        unsubscribe();
      };
    }

    const sync = () => setSession(previewAccount());
    window.addEventListener('storage', sync);
    window.addEventListener(ACCOUNT_SESSION_EVENT, sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener(ACCOUNT_SESSION_EVENT, sync);
    };
  }, []);

  return session;
}
