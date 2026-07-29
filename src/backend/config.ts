const runtimeConfig = globalThis.__QISHI_CONFIG__;

const buildProjectUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const buildPublishableKey = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.VITE_SUPABASE_ANON_KEY
)?.trim();
const runtimeProjectUrl = runtimeConfig?.VITE_SUPABASE_URL?.trim();
const runtimePublishableKey = (
  runtimeConfig?.VITE_SUPABASE_PUBLISHABLE_KEY ??
  runtimeConfig?.VITE_SUPABASE_ANON_KEY
)?.trim();

export const supabaseProjectUrl = buildProjectUrl || runtimeProjectUrl;
export const supabasePublishableKey =
  buildPublishableKey || runtimePublishableKey;

export const supabaseConfigured = Boolean(
  supabaseProjectUrl && supabasePublishableKey,
);

export const publicAppUrl = (
  import.meta.env.VITE_PUBLIC_APP_URL ||
  runtimeConfig?.VITE_PUBLIC_APP_URL ||
  (typeof window === 'undefined' ? '' : window.location.origin)
).replace(/\/+$/, '');
