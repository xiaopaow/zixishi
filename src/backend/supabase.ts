import {
  createClient,
  type Session,
  type SupabaseClient,
  type User,
} from '@supabase/supabase-js';
import type { MembershipTier } from '../data/membership';
import {
  publicAppUrl,
  supabaseConfigured,
  supabaseProjectUrl,
  supabasePublishableKey,
} from './config';

export { supabaseConfigured } from './config';

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient() {
  if (!supabaseConfigured) return null;
  if (!supabaseInstance) {
    supabaseInstance = createClient(
      supabaseProjectUrl!,
      supabasePublishableKey!,
      {
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
      },
    );
  }
  return supabaseInstance;
}

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
  const client = getSupabaseClient();
  if (!account || !client) return account;
  const { data, error } = await client
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
  const client = getSupabaseClient();
  if (!client) return null;
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  return accountWithProfile(data.session);
}

export function onSupabaseAccountChange(
  listener: (account: AccountSession | null) => void,
) {
  const client = getSupabaseClient();
  if (!client) return () => undefined;
  const {
    data: { subscription },
  } = client.auth.onAuthStateChange((_event, session) => {
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
  const client = getSupabaseClient();
  if (!client) throw new Error('账号服务尚未配置');
  const { data, error } = await client.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        display_name: input.name.trim(),
        invite_code: input.inviteCode.trim().toUpperCase(),
      },
      emailRedirectTo: `${publicAppUrl}/?confirmed=1`,
    },
  });
  if (error) throw error;
  return {
    account: accountFromSupabaseSession(data.session),
    emailConfirmationRequired: !data.session,
  };
}

export async function signInWithPassword(email: string, password: string) {
  const client = getSupabaseClient();
  if (!client) throw new Error('账号服务尚未配置');
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return accountFromSupabaseSession(data.session);
}

export async function signOutSupabaseAccount() {
  const client = getSupabaseClient();
  if (!client) return;
  const { error } = await client.auth.signOut();
  if (error) throw error;
}

export async function sendPasswordReset(email: string) {
  const client = getSupabaseClient();
  if (!client) throw new Error('账号服务尚未配置');
  const { error } = await client.auth.resetPasswordForEmail(email, {
    redirectTo: `${publicAppUrl}/?recovery=1`,
  });
  if (error) throw error;
}

export function onSupabasePasswordRecovery(listener: () => void) {
  const client = getSupabaseClient();
  if (!client) return () => undefined;
  const {
    data: { subscription },
  } = client.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') listener();
  });
  return () => subscription.unsubscribe();
}

export async function updateSupabasePassword(password: string) {
  const client = getSupabaseClient();
  if (!client) throw new Error('账号服务尚未配置');
  const { error } = await client.auth.updateUser({ password });
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
  const client = getSupabaseClient();
  if (!client) throw new Error('账号服务尚未配置');
  const { error } = await client.rpc('admin_create_invite', {
    code: input.code,
    max_uses: input.maxUses,
    expires_at: input.expiresAt,
    note: input.note || null,
  });
  if (error) throw error;
}

export async function listOwnerInvites() {
  const client = getSupabaseClient();
  if (!client) return [] as InviteSummary[];
  const { data, error } = await client.rpc('admin_list_invites');
  if (error) throw error;
  return (data ?? []) as InviteSummary[];
}

export async function revokeOwnerInvite(inviteId: string) {
  const client = getSupabaseClient();
  if (!client) throw new Error('账号服务尚未配置');
  const { error } = await client.rpc('admin_revoke_invite', {
    invite_id: inviteId,
  });
  if (error) throw error;
}
