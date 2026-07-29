import { describe, expect, it } from 'vitest';
import { createRandomInviteCode } from './supabase';

describe('owner invite codes', () => {
  it('creates an unambiguous owner-distributed code', () => {
    const code = createRandomInviteCode();
    expect(code).toMatch(/^QISHI-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
    expect(code.slice('QISHI-'.length)).not.toMatch(/[01IO]/);
  });

  it('does not reuse one fixed preview code', () => {
    const generated = new Set(
      Array.from({ length: 16 }, () => createRandomInviteCode()),
    );
    expect(generated.size).toBeGreaterThan(1);
  });
});
