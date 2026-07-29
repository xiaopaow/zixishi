// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import App from './App';

vi.mock('./hooks/useAccountSession', () => ({
  useAccountSession: () => null,
  useAccountSessionState: () => ({
    session: null,
    loading: false,
  }),
}));

vi.mock('./backend/supabase', () => ({
  onSupabasePasswordRecovery: () => () => undefined,
  registerWithInvite: vi.fn(),
  sendPasswordReset: vi.fn(),
  signInWithPassword: vi.fn(),
  signOutSupabaseAccount: vi.fn(),
  supabaseConfigured: true,
  updateSupabasePassword: vi.fn(),
}));

beforeAll(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation(() => ({
      matches: false,
      media: '',
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
});

afterEach(() => {
  cleanup();
  window.history.replaceState({}, '', '/');
});

describe('public entry and protected study room', () => {
  it('shows the product introduction at the public root', () => {
    window.history.replaceState({}, '', '/');

    render(<App />);

    expect(
      screen.getByRole('heading', { name: /把认真/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /使用邀请码注册/ })).toHaveAttribute(
      'href',
      '/account?mode=register',
    );
    expect(screen.queryByText(/今天想完成什么/)).not.toBeInTheDocument();
  });

  it('redirects a signed-out visitor to login before rendering app content', async () => {
    window.history.replaceState({}, '', '/room');

    render(<App />);

    expect(
      await screen.findByRole('heading', { name: '欢迎回来' }),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(window.location.pathname).toBe('/account');
      expect(new URLSearchParams(window.location.search).get('returnTo')).toBe(
        '/room',
      );
    });
    expect(screen.queryByText('选择你的专注场景')).not.toBeInTheDocument();
  });
});
