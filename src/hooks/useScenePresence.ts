import { useEffect, useMemo, useState } from 'react';
import type {
  RealtimeChannel,
  SupabaseClient,
} from '@supabase/supabase-js';
import { supabaseConfigured } from '../backend/config';
import { useAccountSession } from './useAccountSession';

const SCENE_PRESENCE_TOPIC = 'qishi:scene-presence';
const HEARTBEAT_MS = 45_000;

interface PresencePayload {
  scene_id?: string;
  focused_at?: string;
  online_at?: string;
}

export function useScenePresence(activeSceneId?: string) {
  const account = useAccountSession();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!supabaseConfigured || !account) {
      setConnected(false);
      setCounts({});
      return;
    }

    let disposed = false;
    let heartbeat = 0;
    let client: SupabaseClient | null = null;
    let channel: RealtimeChannel | null = null;

    void import('../backend/supabase')
      .then((accountService) => {
        if (disposed || !accountService.supabase) return;
        client = accountService.supabase;
        const focusedAt = new Date().toISOString();
        const nextChannel = client.channel(SCENE_PRESENCE_TOPIC, {
          config: {
            private: true,
            presence: {
              key: account.id,
            },
          },
        });
        channel = nextChannel;

        const syncCounts = () => {
          if (disposed) return;
          const next: Record<string, number> = {};
          const state = nextChannel.presenceState<PresencePayload>();
          Object.values(state).forEach((presences) => {
            const latest = [...presences]
              .reverse()
              .find((presence) => typeof presence.scene_id === 'string');
            if (!latest?.scene_id) return;
            next[latest.scene_id] = (next[latest.scene_id] ?? 0) + 1;
          });
          setCounts(next);
        };

        const track = async () => {
          if (!activeSceneId || disposed) return;
          await nextChannel.track({
            scene_id: activeSceneId,
            focused_at: focusedAt,
            online_at: new Date().toISOString(),
          } satisfies PresencePayload);
        };

        nextChannel
          .on('presence', { event: 'sync' }, syncCounts)
          .on('presence', { event: 'join' }, syncCounts)
          .on('presence', { event: 'leave' }, syncCounts)
          .subscribe((status) => {
            if (disposed) return;
            const ready = status === 'SUBSCRIBED';
            setConnected(ready);
            if (!ready) return;
            void track();
            if (activeSceneId) {
              heartbeat = window.setInterval(() => void track(), HEARTBEAT_MS);
            }
          });
      })
      .catch(() => {
        if (!disposed) setConnected(false);
      });

    return () => {
      disposed = true;
      if (heartbeat) window.clearInterval(heartbeat);
      if (channel) void channel.untrack();
      if (client && channel) void client.removeChannel(channel);
    };
  }, [account?.id, activeSceneId]);

  return useMemo(
    () => ({
      counts,
      connected,
      total: Object.values(counts).reduce((sum, value) => sum + value, 0),
    }),
    [connected, counts],
  );
}
