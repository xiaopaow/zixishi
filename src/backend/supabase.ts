import { createClient, type Session, type User } from '@supabase/supabase-js';
import type { MembershipTier } from '../data/membership';
import {
  supabaseConfigured,
  supabaseProjectUrl,
  supabasePublishableKey,
} from './config';

export { supabaseConfigured } from './config';

export const supabase = supabaseConfigured
  ? createClient(supabaseProjectUrl!, supabasePublishableKey!, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storageKey: 'qishi.auth.session',
      },
      realtime: {
        params: {
          eventsPerSecond: 2,
        },
      },
    })
  : null;

export interface AccountSession {
  id: string;
  email: string;
  name: string;
  tier: MembershipTier;
  role: 'member' | 'admin';
  signedInAt: string;
}

const accountFromUser = (user: User): AccountSession => ({
  id: user.id,
  email: user.email ?? '',
  name:
    (typeof user.user_metadata?.display_name === 'string' &&
      user.user_metadata.display_name.trim()) ||
    user.email?.split('@')[0] ||
    '栖友',
  tier: user.app_metadata?.tier === 'plus' ? 'plus' : 'free',
  role: user.app_metadata?.role === 'admin' ? 'admin' : 'member',
  signedInAt: user.last_sign_in_at ?? user.created_at,
});

export const accountFromSupabaseSession = (session: Session | null) =>
  session ? accountFromUser(session.user) : null;

async function accountWithProfile(session: Session | null) {
  const account = accountFromSupabaseSession(session);
  if (!account || !supabase) return account;
  const { data, error } = await supabase
    .from('profiles')
    .select('display_name,tier,role,membership_expires_at')
    .eq('id', account.id)
    .maybeSingle();
  if (error || !data) return account;
  return {
    ...account,
    name:
      typeof data.display_name === 'string' && data.display_name.trim()
        ? data.display_name
        : account.name,
    tier: data.tier === 'plus' ? 'plus' : 'free',
    role: data.role === 'admin' ? 'admin' : 'member',
  } satisfies AccountSession;
}

export async function getSupabaseAccountSession() {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return accountWithProfile(data.session);
}

export function onSupabaseAccountChange(
  listener: (account: AccountSession | null) => void,
) {
  if (!supabase) return () => undefined;
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    window.setTimeout(() => {
      void accountWithProfile(session)
        .then(listener)
        .catch(() => listener(accountFromSupabaseSession(session)));
    }, 0);
  });
  return () => subscription.unsubscribe();
}

export async function registerWithInvite(input: {
  email: string;
  password: string;
  name: string;
  inviteCode: string;
}) {
  if (!supabase) throw new Error('账号服务尚未配置');
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        display_name: input.name.trim(),
        invite_code: input.inviteCode.trim().toUpperCase(),
      },
    },
  });
  if (error) throw error;
  return {
    account: accountFromSupabaseSession(data.session),
    emailConfirmationRequired: !data.session,
  };
}

export async function signInWithPassword(email: string, password: string) {
  if (!supabase) throw new Error('账号服务尚未配置');
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return accountFromSupabaseSession(data.session);
}

export async function signOutSupabaseAccount() {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function sendPasswordReset(email: string) {
  if (!supabase) throw new Error('账号服务尚未配置');
  const redirectTo = `${window.location.origin}/account?recovery=1`;
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });
  if (error) throw error;
}

export interface InviteSummary {
  id: string;
  code_prefix: string;
  note: string | null;
  max_uses: number;
  used_count: number;
  expires_at: string | null;
  active: boolean;
  created_at: string;
  revoked_at: string | null;
}

export function createRandomInviteCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const random = Array.from(
    bytes,
    (byte) => alphabet[byte % alphabet.length],
  ).join('');
  return `QISHI-${random.slice(0, 4)}-${random.slice(4)}`;
}

export async function createOwnerInvite(input: {
  code: string;
  maxUses: number;
  expiresAt: string | null;
  note: string;
}) {
  if (!supabase) throw new Error('账号服务尚未配置');
  const { error } = await supabase.rpc('admin_create_invite', {
    code: input.code,
    max_uses: input.maxUses,
    expires_at: input.expiresAt,
    note: input.note || null,
  });
  if (error) throw error;
}

export async function listOwnerInvites() {
  if (!supabase) return [] as InviteSummary[];
  const { data, error } = await supabase.rpc('admin_list_invites');
  if (error) throw error;
  return (data ?? []) as InviteSummary[];
}

export async function revokeOwnerInvite(inviteId: string) {
  if (!supabase) throw new Error('账号服务尚未配置');
  const { error } = await supabase.rpc('admin_revoke_invite', {
    invite_id: inviteId,
  });
  if (error) throw error;
}
