import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Leaf,
  LogOut,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  TicketCheck,
  UserRound,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  onSupabasePasswordRecovery,
  registerWithInvite,
  sendPasswordReset,
  signInWithPassword,
  signOutSupabaseAccount,
  supabaseConfigured,
  updateSupabasePassword,
} from '../backend/supabase';
import { InviteManager } from '../components/InviteManager';
import { ScenePicture } from '../components/ScenePicture';
import { getScene } from '../data/scenes';
import { membershipPlans } from '../data/membership';
import { clearPreviewAccountSession } from '../data/localAccount';
import { useAccountSession } from '../hooks/useAccountSession';

type AccountMode = 'login' | 'register';

export function AccountPage() {
  const [mode, setMode] = useState<AccountMode>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(
    () => new URLSearchParams(window.location.search).get('recovery') === '1',
  );
  const session = useAccountSession();
  const navigate = useNavigate();
  const plusPlan = useMemo(
    () => membershipPlans.find((plan) => plan.id === 'plus')!,
    [],
  );
  const scene = getScene('snow-tea');

  useEffect(() => {
    if (!supabaseConfigured) return;
    return onSupabasePasswordRecovery(() => setRecoveryMode(true));
  }, []);

  const accountFlow = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const submittedEmail = String(form.get('email') ?? '').trim();
    const password = String(form.get('password') ?? '');
    const submittedName = String(form.get('name') ?? '').trim();
    const submittedInviteCode = String(form.get('inviteCode') ?? '').trim();

    if ((!recoveryMode && !submittedEmail) || !password) {
      setStatus(recoveryMode ? '请输入新密码。' : '请先填写邮箱和密码。');
      return;
    }
    if (
      mode === 'register' &&
      !/^[A-Za-z0-9-]{6,24}$/.test(submittedInviteCode)
    ) {
      setStatus('邀请码须为 6～24 位字母、数字或连字符。');
      return;
    }
    if (!supabaseConfigured) {
      setStatus('账号服务尚未连接。创建 Supabase 项目后即可启用真实登录与邀请码核验。');
      return;
    }

    setSubmitting(true);
    setStatus('');
    try {
      if (recoveryMode) {
        await updateSupabasePassword(password);
        await signOutSupabaseAccount();
        setRecoveryMode(false);
        setMode('login');
        window.history.replaceState({}, '', '/account');
        setStatus('密码已更新，请使用新密码登录。');
        return;
      }
      if (mode === 'register') {
        const result = await registerWithInvite({
          email: submittedEmail,
          password,
          name: submittedName || submittedEmail.split('@')[0] || '栖友',
          inviteCode: submittedInviteCode,
        });
        if (result.emailConfirmationRequired) {
          setStatus('账号已创建，请先打开验证邮件；验证后即可保持登录。');
          return;
        }
      } else {
        await signInWithPassword(submittedEmail, password);
      }
      navigate('/?welcome=1', { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      setStatus(
        message.includes('Invalid login credentials')
          ? '邮箱或密码不正确。'
          : message.includes('Email not confirmed')
            ? '请先完成邮箱验证。'
            : message || '账号服务暂时不可用，请稍后重试。',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const requestPasswordReset = async () => {
    if (!email.trim()) {
      setStatus('先填写注册邮箱，再发送密码重置邮件。');
      return;
    }
    if (!supabaseConfigured) {
      setStatus('账号服务尚未连接，暂时无法发送密码重置邮件。');
      return;
    }
    try {
      await sendPasswordReset(email.trim());
      setStatus('密码重置邮件已发送，请检查收件箱。');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '发送失败，请稍后重试。');
    }
  };

  return (
    <main
      id="main-content"
      data-route="/account"
      tabIndex={-1}
      className="account-page"
    >
      <ScenePicture
        scene={scene}
        className="account-backdrop"
        fallbackToPoster
        alt=""
        aria-hidden="true"
      />
      <div className="account-shade" aria-hidden="true" />
      <div className="account-orb account-orb-one" aria-hidden="true" />
      <div className="account-orb account-orb-two" aria-hidden="true" />

      <header className="account-header">
        <Link to="/" className="account-brand" aria-label="返回栖时首页">
          <span><Leaf size={19} /></span>
          <div>
            <strong>栖时</strong>
            <small>QISHI ID</small>
          </div>
        </Link>
        <Link to="/" className="account-back-link">
          <ArrowLeft size={16} /> 返回自习室
        </Link>
      </header>

      <section className="account-layout">
        <div className="account-story">
          <span className="account-kicker"><Sparkles size={14} /> QISHI ACCOUNT</span>
          <h1>让每一段认真，<br />在不同设备上继续。</h1>
          <p>
            {supabaseConfigured
              ? '安全账号服务已连接。登录状态会自动续期，本机任务、计时、声音与轨迹仍默认保存在设备中。'
              : '账号服务正在等待 Supabase 项目配置；本机任务、计时、声音与轨迹仍可完整使用。'}
          </p>
          <div className="account-trust-row">
            <span><ShieldCheck size={15} /> 默认本地优先</span>
            <span><LockKeyhole size={15} /> 密码不在本机保存</span>
          </div>
        </div>

        <div className="account-glass-shell">
          <section className="account-card" aria-labelledby="account-title">
            {session && !recoveryMode ? (
              <div className="account-session">
                <span className="account-session-avatar" aria-hidden="true">
                  {session.name.slice(0, 1)}
                </span>
                <small>
                  {supabaseConfigured ? '栖时安全账号 · 已保持登录' : '本地预览账号 · 已保持登录'}
                </small>
                <h2 id="account-title">{session.name}，欢迎回来</h2>
                <p>{session.email}</p>
                <div className="account-session-badges">
                  <span><ShieldCheck size={14} /> 自动续期会话</span>
                  <span><Sparkles size={14} /> 栖时 {session.tier === 'plus' ? 'Plus' : 'Free'}</span>
                </div>
                <button
                  type="button"
                  className="account-submit"
                  onClick={() => navigate('/')}
                >
                  进入今日自习室 <ArrowRight size={17} />
                </button>
                <button
                  type="button"
                  className="account-signout"
                  onClick={() => {
                    void (async () => {
                      try {
                        if (supabaseConfigured) {
                          await signOutSupabaseAccount();
                        } else {
                          clearPreviewAccountSession();
                        }
                        setStatus('已安全退出登录。');
                      } catch (error) {
                        setStatus(
                          error instanceof Error
                            ? error.message
                            : '退出失败，请稍后重试。',
                        );
                      }
                    })();
                  }}
                >
                  <LogOut size={15} /> 退出登录
                </button>
                <p className="account-form-note">
                  密码由账号服务安全处理，客户端只保存可自动续期的会话，不会保存明文密码。
                </p>
                {session.role === 'admin' && <InviteManager />}
              </div>
            ) : (
              <>
                {!recoveryMode && (
                  <div className="account-mode-switch" aria-label="账号操作">
                    <button
                      type="button"
                      className={mode === 'login' ? 'selected' : ''}
                      aria-pressed={mode === 'login'}
                      onClick={() => {
                        setMode('login');
                        setStatus('');
                      }}
                    >
                      登录
                    </button>
                    <button
                      type="button"
                      className={mode === 'register' ? 'selected' : ''}
                      aria-pressed={mode === 'register'}
                      onClick={() => {
                        setMode('register');
                        setStatus('');
                      }}
                    >
                      注册
                    </button>
                  </div>
                )}

                <div className="account-title">
                  <span><UserRound size={18} /></span>
                  <div>
                    <small>
                      {supabaseConfigured ? '安全账号服务 · 已连接' : '账号服务 · 等待项目配置'}
                    </small>
                    <h2 id="account-title">
                      {recoveryMode
                        ? '设置你的新密码'
                        : mode === 'login'
                          ? '欢迎回来'
                          : '创建你的栖时账号'}
                    </h2>
                  </div>
                </div>

                <form className="account-form" onSubmit={accountFlow}>
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
              {mode === 'register' && (
                <label>
                  <span>你的称呼</span>
                  <div className="account-input">
                    <UserRound size={17} />
                    <input
                      name="name"
                      autoComplete="name"
                      placeholder="怎么称呼你"
                      maxLength={28}
                    />
                  </div>
                </label>
              )}
                  {!recoveryMode && (
                    <label>
                      <span>邮箱</span>
                      <div className="account-input">
                        <Mail size={17} />
                        <input
                          name="email"
                          type="email"
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                          autoComplete="email"
                          placeholder="name@example.com"
                          required
                        />
                      </div>
                    </label>
                  )}
              <label>
                <span>{recoveryMode ? '新密码' : '密码'}</span>
                <div className="account-input">
                  <LockKeyhole size={17} />
                  <input
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={
                      recoveryMode || mode === 'register'
                        ? 'new-password'
                        : 'current-password'
                    }
                    placeholder="至少 8 位"
                    minLength={8}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={showPassword ? '隐藏密码' : '显示密码'}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </label>
              {mode === 'register' && (
                <label>
                  <span className="invite-label">
                    内测邀请码 <em>封闭测试阶段必填</em>
                  </span>
                  <div className="account-input">
                    <TicketCheck size={17} />
                    <input
                      name="inviteCode"
                      autoComplete="one-time-code"
                      placeholder="输入 6～24 位邀请码"
                      minLength={6}
                      maxLength={24}
                      required
                    />
                  </div>
                  <small className="invite-distribution-note">
                    邀请码由栖时主理人定向发放，暂不开放自助领取。
                  </small>
                </label>
              )}

                  {!recoveryMode && (
                    <div className="account-form-meta">
                      <label>
                        <input
                          type="checkbox"
                          name={mode === 'login' ? 'remember' : 'terms'}
                          defaultChecked
                          required={mode === 'register'}
                        />
                        <span>{mode === 'login' ? '保持登录' : '同意未来的服务与隐私条款'}</span>
                      </label>
                      {mode === 'login' && (
                        <button type="button" onClick={() => void requestPasswordReset()}>
                          忘记密码
                        </button>
                      )}
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
              <p className="account-form-note" aria-live="polite">
                {status ||
                  (supabaseConfigured
                    ? recoveryMode
                      ? '保存后当前恢复会话会自动退出，请重新登录。'
                      : '邀请码只在服务端校验和核销，用户无法自行生成。'
                    : '尚未配置 Supabase；当前不会发送账号或密码。')}
              </p>
                </form>
              </>
            )}
          </section>

          <aside className="membership-preview" aria-label="未来会员权益">
            <div>
              <span className="plus-mark"><Sparkles size={14} /></span>
              <div>
                <small>即将开放</small>
                <strong>{plusPlan.name}</strong>
              </div>
            </div>
            <div className="membership-benefits">
              {plusPlan.benefits.map(({ title, icon: Icon }) => (
                <span key={title}><Icon size={14} /> {title}</span>
              ))}
            </div>
            <p><Check size={13} /> 核心计时、任务和基础场景将继续免费</p>
          </aside>
        </div>
      </section>
    </main>
  );
}
