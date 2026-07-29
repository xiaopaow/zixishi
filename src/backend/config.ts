type QishiRuntimeConfig = {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  VITE_SUPABASE_ANON_KEY?: string;
  VITE_PUBLIC_APP_URL?: string;
};

const runtimeConfig = (
  globalThis as typeof globalThis & {
    __QISHI_CONFIG__?: QishiRuntimeConfig;
  }
).__QISHI_CONFIG__;

export const supabaseProjectUrl = (
  import.meta.env.VITE_SUPABASE_URL ??
  runtimeConfig?.VITE_SUPABASE_URL
)?.trim();
export const supabasePublishableKey = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  runtimeConfig?.VITE_SUPABASE_PUBLISHABLE_KEY ??
  runtimeConfig?.VITE_SUPABASE_ANON_KEY
)?.trim();

export const supabaseConfigured = Boolean(
  supabaseProjectUrl && supabasePublishableKey,
);

export const publicAppUrl = (
  import.meta.env.VITE_PUBLIC_APP_URL ||
  runtimeConfig?.VITE_PUBLIC_APP_URL ||
  (typeof window === 'undefined' ? '' : window.location.origin)
).replace(/\/+$/, '');
