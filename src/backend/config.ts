export const supabaseProjectUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
export const supabasePublishableKey = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.VITE_SUPABASE_ANON_KEY
)?.trim();

export const supabaseConfigured = Boolean(
  supabaseProjectUrl && supabasePublishableKey,
);

