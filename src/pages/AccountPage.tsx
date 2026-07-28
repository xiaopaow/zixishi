import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Leaf,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  TicketCheck,
  UserRound,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ScenePicture } from '../components/ScenePicture';
import { getScene } from '../data/scenes';
import {
  membershipPlans,
  PREVIEW_INVITE_CODE,
} from '../data/membership';

type AccountMode = 'login' | 'register';

export function AccountPage() {
  const [mode, setMode] = useState<AccountMode>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const navigate = useNavigate();
  const plusPlan = useMemo(
    () => membershipPlans.find((plan) => plan.id === 'plus')!,
    [],
  );
  const scene = getScene('snow-tea');

  const previewAccountFlow = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') ?? '').trim();
    const password = String(form.get('password') ?? '');
    const submittedInviteCode = String(form.get('inviteCode') ?? '').trim();

    if (!email || !password) {
      setStatus('请先填写邮箱和密码。');
      return;
    }
    if (
      mode === 'register' &&
      !/^[A-Za-z0-9-]{6,16}$/.test(submittedInviteCode)
    ) {
      setStatus('邀请码需为 6～16 位字母、数字或连字符；有效性将在服务端校验。');
      return;
    }
    if (
      mode === 'register' &&
      submittedInviteCode.toUpperCase() !== PREVIEW_INVITE_CODE
    ) {
      setStatus('预览邀请码不正确，可点击下方按钮领取本地预览码。');
      return;
    }
    setStatus(
      mode === 'login'
        ? '登录界面已就绪；接入账号服务后即可安全登录。'
        : '注册界面已就绪；当前不会上传或保存你填写的密码。',
    );
    navigate('/?welcome=1', { replace: true });
  };

  return (
    <main className="account-page">
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
            账号与会员服务正在准备中。现在，你仍可完整使用本机任务、
            计时、声音与轨迹；未来登录后再选择是否同步。
          </p>
          <div className="account-trust-row">
            <span><ShieldCheck size={15} /> 默认本地优先</span>
            <span><LockKeyhole size={15} /> 密码不在本机保存</span>
          </div>
        </div>

        <div className="account-glass-shell">
          <section className="account-card" aria-labelledby="account-title">
            <div className="account-mode-switch" aria-label="账号操作">
              <button
                type="button"
                className={mode === 'login' ? 'selected' : ''}
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
                onClick={() => {
                  setMode('register');
                  setStatus('');
                }}
              >
                注册
              </button>
            </div>

            <div className="account-title">
              <span><UserRound size={18} /></span>
              <div>
                <small>本地预览 · 尚未连接账号服务</small>
                <h2 id="account-title">
                  {mode === 'login' ? '欢迎回来' : '创建你的栖时账号'}
                </h2>
              </div>
            </div>

            <form className="account-form" onSubmit={previewAccountFlow}>
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
              <label>
                <span>邮箱</span>
                <div className="account-input">
                  <Mail size={17} />
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="name@example.com"
                    required
                  />
                </div>
              </label>
              <label>
                <span>密码</span>
                <div className="account-input">
                  <LockKeyhole size={17} />
                  <input
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
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
                      placeholder="输入 6～16 位邀请码"
                      minLength={6}
                      maxLength={16}
                      value={inviteCode}
                      onChange={(event) => setInviteCode(event.target.value)}
                      required
                    />
                  </div>
                  <button
                    type="button"
                    className="invite-request"
                    onClick={() => {
                      setInviteCode(PREVIEW_INVITE_CODE);
                      setStatus(`已填入本地预览码 ${PREVIEW_INVITE_CODE}，仅用于演示注册流程。`);
                    }}
                  >
                    暂无邀请码？领取本地预览码 <ArrowRight size={13} />
                  </button>
                </label>
              )}

              <div className="account-form-meta">
                <label>
                  <input type="checkbox" defaultChecked />
                  <span>{mode === 'login' ? '保持登录' : '同意未来的服务与隐私条款'}</span>
                </label>
                {mode === 'login' && <button type="button">忘记密码</button>}
              </div>

              <button type="submit" className="account-submit">
                {mode === 'login' ? '继续登录' : '创建账号'}
                <ArrowRight size={17} />
              </button>
              <p className="account-form-note" aria-live="polite">
                {status || '演示阶段不会创建远程账号，也不会保存你输入的密码。'}
              </p>
            </form>
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
