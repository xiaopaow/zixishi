export const supabaseProjectUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
export const supabasePublishableKey = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.VITE_SUPABASE_ANON_KEY
)?.trim();

export const supabaseConfigured = Boolean(
  supabaseProjectUrl && supabasePublishableKey,
);

export const publicAppUrl = (
  import.meta.env.VITE_PUBLIC_APP_URL ||
  (typeof window === 'undefined' ? '' : window.location.origin)
).replace(/\/+$/, '');
