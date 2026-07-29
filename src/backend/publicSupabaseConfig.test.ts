import { describe, expect, it } from 'vitest';
import { bundledPublicSupabaseConfig } from './publicSupabaseConfig';

describe('bundled public Supabase config', () => {
  it('only contains browser-safe public credentials', () => {
    expect(bundledPublicSupabaseConfig.projectUrl).toMatch(
      /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i,
    );
    expect(bundledPublicSupabaseConfig.publishableKey).toMatch(
      /^sb_publishable_[A-Za-z0-9_-]+$/,
    );
    expect(bundledPublicSupabaseConfig.publishableKey).not.toMatch(
      /service_role|sb_secret_/i,
    );
  });
});
