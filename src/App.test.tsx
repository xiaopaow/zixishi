// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import App from './App';

const accountMock = vi.hoisted(() => ({
  session: null as null | {
    id: string;
    email: string;
    name: string;
    role: 'member' | 'admin';
  },
}));

const backendMock = vi.hoisted(() => ({
  registerWithInvite: vi.fn(),
  sendPasswordReset: vi.fn(),
  signInWithPassword: vi.fn(),
  signOutSupabaseAccount: vi.fn(),
  updateSupabasePassword: vi.fn(),
}));

vi.mock('./hooks/useAccountSession', () => ({
  useAccountSession: () => accountMock.session,
  useAccountSessionState: () => ({
    session: accountMock.session,
    loading: false,
  }),
}));

vi.mock('./backend/supabase', () => ({
  onSupabasePasswordRecovery: () => () => undefined,
  registerWithInvite: backendMock.registerWithInvite,
  sendPasswordReset: backendMock.sendPasswordReset,
  signInWithPassword: backendMock.signInWithPassword,
  signOutSupabaseAccount: backendMock.signOutSupabaseAccount,
  supabaseConfigured: true,
  updateSupabasePassword: backendMock.updateSupabasePassword,
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
  vi.stubGlobal(
    'requestAnimationFrame',
    (callback: FrameRequestCallback) => window.setTimeout(callback, 0),
  );
  vi.stubGlobal(
    'cancelAnimationFrame',
    (handle: number) => window.clearTimeout(handle),
  );
});

afterEach(() => {
  cleanup();
  accountMock.session = null;
  backendMock.registerWithInvite.mockReset();
  backendMock.sendPasswordReset.mockReset();
  backendMock.signInWithPassword.mockReset();
  backendMock.signOutSupabaseAccount.mockReset();
  backendMock.updateSupabasePassword.mockReset();
  window.history.replaceState({}, '', '/');
});

describe('产品化账号入口', () => {
  it('在根路径直接显示登录与邀请码注册入口', async () => {
    render(<App />);

    expect(
      await screen.findByRole('heading', { name: '欢迎回来' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '邀请码注册' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('产品介绍')).not.toBeInTheDocument();
  });

  it('登录与注册切换不会重新挂载背景，并校验确认密码', async () => {
    const { container } = render(<App />);
    await screen.findByRole('heading', { name: '欢迎回来' });
    const backdrop = container.querySelector('.account-backdrop-layer');

    fireEvent.click(screen.getByRole('button', { name: '邀请码注册' }));

    expect(
      screen.getByRole('heading', { name: '创建栖时账号' }),
    ).toBeInTheDocument();
    expect(container.querySelector('.account-backdrop-layer')).toBe(backdrop);

    fireEvent.change(screen.getByPlaceholderText('怎么称呼你'), {
      target: { value: '小栖' },
    });
    fireEvent.change(screen.getByPlaceholderText('name@example.com'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('至少 8 位'), {
      target: { value: 'password-a' },
    });
    fireEvent.change(screen.getByPlaceholderText('再次输入密码'), {
      target: { value: 'password-b' },
    });
    fireEvent.change(screen.getByPlaceholderText('输入 6～24 位邀请码'), {
      target: { value: 'QISHI-TEST' },
    });
    fireEvent.click(
      screen.getByRole('checkbox', {
        name: '我已阅读并同意服务与隐私说明',
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: '创建账号' }));

    expect(screen.getByText('两次输入的密码不一致。')).toBeInTheDocument();
    expect(backendMock.registerWithInvite).not.toHaveBeenCalled();
  });

  it('将未登录访问受保护页面的用户送回根入口并保留目标', async () => {
    window.history.replaceState({}, '', '/room');

    render(<App />);

    expect(
      await screen.findByRole('heading', { name: '欢迎回来' }),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(window.location.pathname).toBe('/');
      expect(new URLSearchParams(window.location.search).get('returnTo')).toBe(
        '/room',
      );
    });
    expect(screen.queryByText('选择你的专注场景')).not.toBeInTheDocument();
  });

  it('兼容旧账号链接并保留注册与返回参数', async () => {
    window.history.replaceState(
      {},
      '',
      '/account?mode=register&returnTo=%2Froom',
    );

    render(<App />);

    expect(
      await screen.findByRole('heading', { name: '创建栖时账号' }),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(window.location.pathname).toBe('/');
      expect(new URLSearchParams(window.location.search).get('mode')).toBe(
        'register',
      );
      expect(new URLSearchParams(window.location.search).get('returnTo')).toBe(
        '/room',
      );
    });
  });

  it('已登录重新打开时显示欢迎确认而不是密码表单', () => {
    accountMock.session = {
      id: 'member-1',
      email: 'member@example.com',
      name: '小栖',
      role: 'member',
    };

    render(<App />);

    expect(
      screen.getByRole('heading', { name: '小栖，欢迎回来' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /进入今日自习室/ }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('密码')).not.toBeInTheDocument();
  });
});
