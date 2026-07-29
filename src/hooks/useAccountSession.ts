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

export interface AccountSessionState {
  session: AccountSession | null;
  loading: boolean;
}

export function useAccountSessionState() {
  const [state, setState] = useState<AccountSessionState>(() => ({
    session: supabaseConfigured ? null : previewAccount(),
    loading: supabaseConfigured,
  }));

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
              if (active) {
                setState({
                  session: account,
                  loading: false,
                });
              }
            })
            .catch(() => {
              if (active) {
                setState({
                  session: null,
                  loading: false,
                });
              }
            });
          unsubscribe = accountService.onSupabaseAccountChange((account) => {
            if (active) {
              setState({
                session: account,
                loading: false,
              });
            }
          });
        })
        .catch(() => {
          if (active) {
            setState({
              session: null,
              loading: false,
            });
          }
        });
      return () => {
        active = false;
        unsubscribe();
      };
    }

    const sync = () => {
      setState({
        session: previewAccount(),
        loading: false,
      });
    };
    window.addEventListener('storage', sync);
    window.addEventListener(ACCOUNT_SESSION_EVENT, sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener(ACCOUNT_SESSION_EVENT, sync);
    };
  }, []);

  return state;
}

export function useAccountSession() {
  return useAccountSessionState().session;
}
