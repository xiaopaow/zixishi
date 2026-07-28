/** @vitest-environment jsdom */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  accountNameFromEmail,
  clearPreviewAccountSession,
  getPreviewAccountSession,
  savePreviewAccountSession,
} from './localAccount';

const account = {
  email: 'reader@example.com',
  name: '小栖',
  tier: 'free' as const,
  signedInAt: '2026-07-28T04:00:00.000Z',
};

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe('preview account session', () => {
  it('keeps a remembered login in local storage without storing a password', () => {
    savePreviewAccountSession(account, true);

    expect(getPreviewAccountSession()).toEqual(account);
    expect(window.localStorage.length).toBe(1);
    expect(window.sessionStorage.length).toBe(0);
    expect(window.localStorage.getItem('qishi.preview-account')).not.toContain(
      'password',
    );
  });

  it('keeps a non-remembered login only for the current tab', () => {
    savePreviewAccountSession(account, false);

    expect(getPreviewAccountSession()).toEqual(account);
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(1);

    clearPreviewAccountSession();
    expect(getPreviewAccountSession()).toBeNull();
  });

  it('derives a friendly local name from the email address', () => {
    expect(accountNameFromEmail('quiet.reader@example.com')).toBe(
      'quiet.reader',
    );
  });

  it('fails gracefully when browser storage is unavailable', () => {
    const previous = { ...account, name: '原账号' };
    savePreviewAccountSession(previous, true);
    const write = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new DOMException('Blocked', 'SecurityError');
      });

    expect(() => savePreviewAccountSession(account, true)).not.toThrow();
    expect(savePreviewAccountSession(account, true)).toBeNull();
    expect(getPreviewAccountSession()?.name).toBe('原账号');
    write.mockRestore();
  });
});
