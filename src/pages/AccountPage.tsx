import {
  ArrowRight,
  CircleAlert,
  Eye,
  EyeOff,
  Leaf,
  LockKeyhole,
  LogOut,
  Mail,
  ShieldCheck,
  Sparkles,
  TicketCheck,
  UserRound,
} from 'lucide-react';
import {
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  onSupabasePasswordRecovery,
  registerWithInvite,
  sendPasswordReset,
  signInWithPassword,
  signOutSupabaseAccount,
  supabaseConfigured,
  updateSupabasePassword,
} from '../backend/supabase';
import { ScenePicture } from '../components/ScenePicture';
import { getScene } from '../data/scenes';
import { clearPreviewAccountSession } from '../data/localAccount';
import { useAccountSessionState } from '../hooks/useAccountSession';

type AccountMode = 'login' | 'register';
type AccountField =
  | 'name'
  | 'email'
  | 'password'
  | 'confirmPassword'
  | 'inviteCode'
  | 'terms';
type FieldErrors = Partial<Record<AccountField, string>>;
type Notice = {
  tone: 'error' | 'success' | 'info';
  message: string;
};

const accountScene = getScene('snow-tea');
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const invitePattern = /^[A-Za-z0-9-]{6,24}$/;

const AccountBackdrop = memo(function AccountBackdrop() {
  return (
    <div className="account-backdrop-layer" aria-hidden="true">
      <ScenePicture
        scene={accountScene}
        className="account-backdrop"
        fallbackToPoster
        sizes="100vw"
        alt=""
      />
      <div className="account-shade" />
    </div>
  );
});

const fieldOrder: AccountField[] = [
  'name',
  'email',
  'password',
  'confirmPassword',
  'inviteCode',
  'terms',
];

export function AccountPage() {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<AccountMode>(() =>
    searchParams.get('mode') === 'register' ? 'register' : 'login',
  );
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [notice, setNotice] = useState<Notice | null>(() =>
    searchParams.get('confirmed') === '1'
      ? {
          tone: 'success',
          message: '邮箱已经确认，可以继续登录栖时。',
        }
      : null,
  );
  const [recoveryMode, setRecoveryMode] = useState(
    () => searchParams.get('recovery') === '1',
  );
  const { session, loading: sessionLoading } = useAccountSessionState();
  const navigate = useNavigate();
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const recoveryPasswordRef = useRef<HTMLInputElement>(null);

  const returnTo = useMemo(() => {
    const requested = searchParams.get('returnTo');
    if (
      requested?.startsWith('/') &&
      requested !== '/' &&
      !requested.startsWith('//') &&
      !requested.startsWith('/account')
    ) {
      return requested;
    }
    return '/app';
  }, [searchParams]);

  useEffect(() => {
    if (!supabaseConfigured) return;
    return onSupabasePasswordRecovery(() => setRecoveryMode(true));
  }, []);

  useEffect(() => {
    if (sessionLoading || (session && !recoveryMode)) return;
    const frame = window.requestAnimationFrame(() => {
      if (recoveryMode) {
        recoveryPasswordRef.current?.focus({ preventScroll: true });
      } else {
        firstFieldRef.current?.focus({ preventScroll: true });
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [mode, recoveryMode, session, sessionLoading]);

  const clearFieldError = (field: AccountField) => {
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const focusFirstError = (
    form: HTMLFormElement,
    errors: FieldErrors,
  ) => {
    const firstInvalid = fieldOrder.find((field) => errors[field]);
    if (!firstInvalid) return;
    const control = form.elements.namedItem(firstInvalid);
    if (control instanceof HTMLElement) {
      control.focus({ preventScroll: true });
    }
  };

  const switchMode = (nextMode: AccountMode) => {
    setMode(nextMode);
    setShowPassword(false);
    setFieldErrors({});
    setNotice(null);
  };

  const accountFlow = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const submittedEmail = String(data.get('email') ?? '').trim();
    const password = String(data.get('password') ?? '');
    const confirmPassword = String(data.get('confirmPassword') ?? '');
    const submittedName = String(data.get('name') ?? '').trim();
    const submittedInviteCode = String(data.get('inviteCode') ?? '').trim();
    const errors: FieldErrors = {};

    if (!recoveryMode) {
      if (!submittedEmail) {
        errors.email = '请输入邮箱。';
      } else if (!emailPattern.test(submittedEmail)) {
        errors.email = '请输入有效的邮箱地址。';
      }
    }
    if (!password) {
      errors.password = recoveryMode ? '请输入新密码。' : '请输入密码。';
    } else if (password.length < 8) {
      errors.password = '密码至少需要 8 位。';
    }
    if (!recoveryMode && mode === 'register') {
      if (!submittedName) {
        errors.name = '请填写你的称呼。';
      }
      if (!confirmPassword) {
        errors.confirmPassword = '请再次输入密码。';
      } else if (confirmPassword !== password) {
        errors.confirmPassword = '两次输入的密码不一致。';
      }
      if (!invitePattern.test(submittedInviteCode)) {
        errors.inviteCode = '邀请码须为 6～24 位字母、数字或连字符。';
      }
      if (data.get('terms') !== 'on') {
        errors.terms = '注册前需要同意服务与隐私说明。';
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setNotice({
        tone: 'error',
        message: '请检查标出的内容后再继续。',
      });
      focusFirstError(form, errors);
      return;
    }
    if (!supabaseConfigured) {
      setNotice({
        tone: 'error',
        message: '账号服务尚未连接，请稍后再试。',
      });
      return;
    }

    setSubmitting(true);
    setFieldErrors({});
    setNotice(null);
    try {
      if (recoveryMode) {
        await updateSupabasePassword(password);
        await signOutSupabaseAccount();
        setRecoveryMode(false);
        setMode('login');
        navigate('/?mode=login', { replace: true });
        setNotice({
          tone: 'success',
          message: '密码已更新，请使用新密码登录。',
        });
        return;
      }
      if (mode === 'register') {
        const result = await registerWithInvite({
          email: submittedEmail,
          password,
          name: submittedName,
          inviteCode: submittedInviteCode,
        });
        if (result.emailConfirmationRequired) {
          setNotice({
            tone: 'success',
            message: '账号已创建，请打开验证邮件后再登录。',
          });
          return;
        }
      } else {
        await signInWithPassword(submittedEmail, password);
      }
      navigate(
        returnTo === '/app' ? '/app?welcome=1' : returnTo,
        { replace: true },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      setNotice({
        tone: 'error',
        message: message.includes('Invalid login credentials')
          ? '邮箱或密码不正确。'
          : message.includes('Email not confirmed')
            ? '请先完成邮箱验证。'
            : message || '账号服务暂时不可用，请稍后重试。',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const requestPasswordReset = async () => {
    const normalizedEmail = email.trim();
    if (!normalizedEmail || !emailPattern.test(normalizedEmail)) {
      const errors = { email: '先填写有效的注册邮箱。' };
      setFieldErrors(errors);
      setNotice({
        tone: 'error',
        message: '填写邮箱后才能发送密码重置邮件。',
      });
      firstFieldRef.current?.focus({ preventScroll: true });
      return;
    }
    if (!supabaseConfigured) {
      setNotice({
        tone: 'error',
        message: '账号服务尚未连接，暂时无法发送密码重置邮件。',
      });
      return;
    }
    try {
      await sendPasswordReset(normalizedEmail);
      setNotice({
        tone: 'success',
        message: '密码重置邮件已发送，请检查收件箱。',
      });
    } catch (error) {
      setNotice({
        tone: 'error',
        message: error instanceof Error
          ? error.message
          : '发送失败，请稍后重试。',
      });
    }
  };

  const signOut = async () => {
    try {
      if (supabaseConfigured) {
        await signOutSupabaseAccount();
      } else {
        clearPreviewAccountSession();
      }
      setNotice({
        tone: 'success',
        message: '已经安全退出登录。',
      });
    } catch (error) {
      setNotice({
        tone: 'error',
        message: error instanceof Error
          ? error.message
          : '退出失败，请稍后重试。',
      });
    }
  };

  const renderFieldError = (field: AccountField) =>
    fieldErrors[field] ? (
      <small className="account-field-error" id={`${field}-error`}>
        <CircleAlert size={12} />
        {fieldErrors[field]}
      </small>
    ) : null;

  return (
    <main
      id="main-content"
      data-route="/"
      tabIndex={-1}
      className="account-page"
    >
      <AccountBackdrop />

      <section className="account-entry-layout">
        <header className="account-product-brand">
          <span className="account-brand-mark">
            <Leaf size={21} strokeWidth={1.7} />
          </span>
          <div>
            <strong>栖时</strong>
            <small>东方疗愈自习室</small>
          </div>
          <p>坐下来，把这一刻留给真正重要的事。</p>
        </header>

        <div className="account-glass-shell">
          <section className="account-card" aria-labelledby="account-title">
            {sessionLoading && !recoveryMode ? (
              <div
                className="account-session account-session-loading"
                role="status"
              >
                <span className="loading-leaf" aria-hidden="true">栖</span>
                <small>正在恢复安全会话</small>
                <h1 id="account-title">稍等片刻</h1>
                <p>已经登录过的设备不需要重复输入密码。</p>
              </div>
            ) : session && !recoveryMode ? (
              <div className="account-session">
                <span className="account-session-avatar" aria-hidden="true">
                  {session.name.slice(0, 1)}
                </span>
                <small>栖时账号 · 已保持登录</small>
                <h1 id="account-title">{session.name}，欢迎回来</h1>
                <p>{session.email}</p>
                <div className="account-session-badges">
                  <span><ShieldCheck size={14} /> 会话自动续期</span>
                  <span>
                    <Sparkles size={14} />
                    栖时 {session.tier === 'plus' ? 'Plus' : 'Free'}
                  </span>
                </div>
                <button
                  type="button"
                  className="account-submit"
                  onClick={() => navigate('/app')}
                >
                  进入今日自习室 <ArrowRight size={17} />
                </button>
                <button
                  type="button"
                  className="account-signout"
                  onClick={() => void signOut()}
                >
                  <LogOut size={15} /> 退出登录
                </button>
                <p className="account-data-note">
                  任务、计时、声音与轨迹仍默认保存在当前设备。
                </p>
              </div>
            ) : (
              <>
                {!recoveryMode && (
                  <div className="account-mode-switch" aria-label="账号操作">
                    <button
                      type="button"
                      className={mode === 'login' ? 'selected' : ''}
                      aria-pressed={mode === 'login'}
                      onClick={() => switchMode('login')}
                    >
                      登录
                    </button>
                    <button
                      type="button"
                      className={mode === 'register' ? 'selected' : ''}
                      aria-pressed={mode === 'register'}
                      onClick={() => switchMode('register')}
                    >
                      邀请码注册
                    </button>
                  </div>
                )}

                <div className="account-title">
                  <span><UserRound size={18} /></span>
                  <div>
                    <small>
                      {supabaseConfigured
                        ? '安全账号服务 · 已连接'
                        : '账号服务 · 暂时不可用'}
                    </small>
                    <h1 id="account-title">
                      {recoveryMode
                        ? '设置新密码'
                        : mode === 'login'
                          ? '欢迎回来'
                          : '创建栖时账号'}
                    </h1>
                  </div>
                </div>

                <form
                  className="account-form"
                  onSubmit={accountFlow}
                  noValidate
                >
                  {recoveryMode && (
                    <input
                      type="email"
                      name="username"
                      autoComplete="username"
                      value={session?.email ?? ''}
                      readOnly
                      hidden
                    />
                  )}

                  {!recoveryMode && mode === 'register' && (
                    <label>
                      <span>你的称呼</span>
                      <div
                        className={`account-input ${
                          fieldErrors.name ? 'has-error' : ''
                        }`}
                      >
                        <UserRound size={17} />
                        <input
                          ref={firstFieldRef}
                          name="name"
                          autoComplete="name"
                          placeholder="怎么称呼你"
                          maxLength={28}
                          aria-invalid={Boolean(fieldErrors.name)}
                          aria-describedby={
                            fieldErrors.name ? 'name-error' : undefined
                          }
                          onChange={() => clearFieldError('name')}
                        />
                      </div>
                      {renderFieldError('name')}
                    </label>
                  )}

                  {!recoveryMode && (
                    <label>
                      <span>邮箱</span>
                      <div
                        className={`account-input ${
                          fieldErrors.email ? 'has-error' : ''
                        }`}
                      >
                        <Mail size={17} />
                        <input
                          ref={mode === 'login' ? firstFieldRef : undefined}
                          name="email"
                          type="email"
                          value={email}
                          onChange={(event) => {
                            setEmail(event.target.value);
                            clearFieldError('email');
                          }}
                          autoComplete="email"
                          inputMode="email"
                          placeholder="name@example.com"
                          aria-invalid={Boolean(fieldErrors.email)}
                          aria-describedby={
                            fieldErrors.email ? 'email-error' : undefined
                          }
                        />
                      </div>
                      {renderFieldError('email')}
                    </label>
                  )}

                  <label>
                    <span>{recoveryMode ? '新密码' : '密码'}</span>
                    <div
                      className={`account-input ${
                        fieldErrors.password ? 'has-error' : ''
                      }`}
                    >
                      <LockKeyhole size={17} />
                      <input
                        ref={recoveryMode ? recoveryPasswordRef : undefined}
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete={
                          recoveryMode || mode === 'register'
                            ? 'new-password'
                            : 'current-password'
                        }
                        placeholder="至少 8 位"
                        minLength={8}
                        aria-invalid={Boolean(fieldErrors.password)}
                        aria-describedby={
                          fieldErrors.password ? 'password-error' : undefined
                        }
                        onChange={() => clearFieldError('password')}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowPassword((current) => !current)
                        }
                        aria-label={
                          showPassword ? '隐藏密码' : '显示密码'
                        }
                      >
                        {showPassword
                          ? <EyeOff size={17} />
                          : <Eye size={17} />}
                      </button>
                    </div>
                    {renderFieldError('password')}
                  </label>

                  {!recoveryMode && mode === 'register' && (
                    <>
                      <label>
                        <span>确认密码</span>
                        <div
                          className={`account-input ${
                            fieldErrors.confirmPassword ? 'has-error' : ''
                          }`}
                        >
                          <LockKeyhole size={17} />
                          <input
                            name="confirmPassword"
                            type={showPassword ? 'text' : 'password'}
                            autoComplete="new-password"
                            placeholder="再次输入密码"
                            minLength={8}
                            aria-invalid={Boolean(
                              fieldErrors.confirmPassword,
                            )}
                            aria-describedby={
                              fieldErrors.confirmPassword
                                ? 'confirmPassword-error'
                                : undefined
                            }
                            onChange={() =>
                              clearFieldError('confirmPassword')
                            }
                          />
                        </div>
                        {renderFieldError('confirmPassword')}
                      </label>

                      <label>
                        <span className="invite-label">
                          内测邀请码
                          <em>由主理人定向发放</em>
                        </span>
                        <div
                          className={`account-input ${
                            fieldErrors.inviteCode ? 'has-error' : ''
                          }`}
                        >
                          <TicketCheck size={17} />
                          <input
                            name="inviteCode"
                            autoComplete="one-time-code"
                            placeholder="输入 6～24 位邀请码"
                            minLength={6}
                            maxLength={24}
                            aria-invalid={Boolean(fieldErrors.inviteCode)}
                            aria-describedby={
                              fieldErrors.inviteCode
                                ? 'inviteCode-error'
                                : undefined
                            }
                            onChange={() =>
                              clearFieldError('inviteCode')
                            }
                          />
                        </div>
                        {renderFieldError('inviteCode')}
                      </label>
                    </>
                  )}

                  {!recoveryMode && mode === 'login' && (
                    <div className="account-form-actions">
                      <span><ShieldCheck size={13} /> 登录状态会自动保持</span>
                      <button
                        type="button"
                        onClick={() => void requestPasswordReset()}
                      >
                        忘记密码
                      </button>
                    </div>
                  )}

                  {!recoveryMode && mode === 'register' && (
                    <div className="account-terms">
                      <label>
                        <input
                          type="checkbox"
                          name="terms"
                          onChange={() => clearFieldError('terms')}
                        />
                        <span>
                          我已阅读并同意服务与隐私说明
                        </span>
                      </label>
                      {renderFieldError('terms')}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="account-submit"
                    disabled={submitting}
                  >
                    {submitting
                      ? '正在安全连接…'
                      : recoveryMode
                        ? '保存新密码'
                        : mode === 'login'
                          ? '继续登录'
                          : '创建账号'}
                    <ArrowRight size={17} />
                  </button>

                  {notice ? (
                    <p
                      className={`account-notice ${notice.tone}`}
                      role={notice.tone === 'error' ? 'alert' : 'status'}
                      aria-live="polite"
                    >
                      {notice.tone === 'error'
                        ? <CircleAlert size={14} />
                        : <ShieldCheck size={14} />}
                      {notice.message}
                    </p>
                  ) : (
                    <p className="account-data-note">
                      {recoveryMode
                        ? '保存后会退出恢复会话，请使用新密码登录。'
                        : mode === 'register'
                          ? '邀请码只在服务端校验和核销，用户无法自行生成。'
                          : '密码不会保存在本机，账号会话将安全续期。'}
                    </p>
                  )}
                </form>
              </>
            )}
          </section>
        </div>

        <aside className="account-plus-badge" aria-label="栖时 Plus 预告">
          <Sparkles size={15} />
          <span>
            <strong>栖时 Plus</strong>
            <small>跨设备同步与限定场景即将开放</small>
          </span>
        </aside>
      </section>
    </main>
  );
}
