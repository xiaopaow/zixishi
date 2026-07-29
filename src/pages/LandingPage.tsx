import {
  ArrowRight,
  BarChart3,
  CloudRain,
  Headphones,
  Leaf,
  MonitorSmartphone,
  ShieldCheck,
  Sparkles,
  TicketCheck,
  TimerReset,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { ScenePicture } from '../components/ScenePicture';
import { getScene, scenes } from '../data/scenes';
import { useAccountSessionState } from '../hooks/useAccountSession';

const featureCards = [
  {
    icon: TimerReset,
    label: '真实时间计时',
    title: '切到后台，也不会丢掉认真',
    body: '倒计时与正计时都按真实时间校准，暂停、刷新或锁屏后仍能准确继续。',
  },
  {
    icon: Headphones,
    label: '独立声音混合',
    title: '为此刻调一场合适的天气',
    body: '音乐、雨、风、鸟鸣与海浪各自调节，每个场景会记住你喜欢的声音。',
  },
  {
    icon: BarChart3,
    label: '本地专注轨迹',
    title: '把完成过的事，慢慢积成底气',
    body: '任务、专注时长、连续天数与月历热力图默认保存在当前设备。',
  },
];

const steps = [
  ['01', '领取内测码', '由栖时主理人定向发放，每枚邀请码都由服务端核验。'],
  ['02', '创建账号', '使用邮箱、密码和邀请码注册，登录状态会自动安全续期。'],
  ['03', '进入自习室', '选一扇窗、一种声音和一件要完成的事，然后安静开始。'],
];

export function LandingPage() {
  const { session, loading } = useAccountSessionState();
  const heroScene = getScene('snow-tea');
  const publicScenes = scenes.slice(0, 4);
  const primaryTarget = session ? '/app' : '/account?mode=register';

  return (
    <main
      id="main-content"
      data-route="/"
      tabIndex={-1}
      className="landing-page"
    >
      <section className="landing-hero" aria-labelledby="landing-title">
        <ScenePicture
          scene={heroScene}
          className="landing-hero-image"
          fallbackToPoster
          fetchPriority="high"
          alt="雪山云窗茶室"
        />
        <div className="landing-hero-shade" aria-hidden="true" />
        <div className="landing-hero-glow" aria-hidden="true" />

        <header className="landing-header">
          <Link to="/" className="landing-brand" aria-label="栖时产品首页">
            <span><Leaf size={19} strokeWidth={1.8} /></span>
            <div>
              <strong>栖时</strong>
              <small>QISHI FOCUS</small>
            </div>
          </Link>
          <nav aria-label="产品介绍导航">
            <a href="#experience">专注体验</a>
            <a href="#scenes">沉浸场景</a>
            <a href="#beta">内测说明</a>
          </nav>
          <div className="landing-header-actions">
            {session ? (
              <Link to="/app" className="landing-login-link">
                {session.name}，进入自习室
              </Link>
            ) : (
              <Link to="/account?mode=login" className="landing-login-link">
                已有账号登录
              </Link>
            )}
          </div>
        </header>

        <div className="landing-hero-copy">
          <span className="landing-kicker">
            <Sparkles size={14} /> FOCUS · LEARN · GROW
          </span>
          <h1 id="landing-title">把认真，<br />安放在一扇窗里。</h1>
          <p>
            东方疗愈场景、可自由混合的声音与不打扰的专注计时。
            给每一件重要的小事，留下一段安静完成的时间。
          </p>
          <div className="landing-hero-actions">
            <Link
              to={primaryTarget}
              className={`landing-primary-cta ${loading ? 'is-loading' : ''}`}
              aria-busy={loading}
            >
              {session ? '进入今日自习室' : '使用邀请码注册'}
              <ArrowRight size={18} />
            </Link>
            {!session && (
              <Link to="/account?mode=login" className="landing-secondary-cta">
                我已有账号
              </Link>
            )}
          </div>
          <div className="landing-trust-row">
            <span><TicketCheck size={15} /> 邀请制内测</span>
            <span><ShieldCheck size={15} /> 密码不在本机保存</span>
            <span><MonitorSmartphone size={15} /> 手机、平板与电脑适配</span>
          </div>
        </div>

        <div className="landing-hero-note" aria-label="当前版本">
          <span className="breathing-dot" />
          <div>
            <small>PUBLIC PREVIEW</small>
            <strong>介绍页公开 · 自习室需登录</strong>
          </div>
        </div>
      </section>

      <section id="experience" className="landing-section landing-experience">
        <div className="landing-section-heading">
          <span className="landing-kicker"><Leaf size={14} /> 栖时体验</span>
          <h2>不是催你更快，<br />只是陪你更稳地开始。</h2>
          <p>
            打开栖时之后，你只需要做三个选择：今天要完成什么、想在哪个场景里，以及想听见怎样的声音。
          </p>
        </div>
        <div className="landing-feature-grid">
          {featureCards.map(({ icon: Icon, label, title, body }) => (
            <article className="landing-glass-card" key={title}>
              <span className="landing-feature-icon"><Icon size={22} /></span>
              <small>{label}</small>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="scenes" className="landing-section landing-scenes">
        <div className="landing-section-heading landing-heading-row">
          <div>
            <span className="landing-kicker"><CloudRain size={14} /> 沉浸场景</span>
            <h2>先选一扇今天想坐下来的窗。</h2>
          </div>
          <p>进入自习室后可调整画质和关闭动效，低配置手机也能保留安静的氛围。</p>
        </div>
        <div className="landing-scene-grid">
          {publicScenes.map((scene, index) => (
            <article className="landing-scene-card" key={scene.id}>
              <ScenePicture
                scene={scene}
                variant="poster"
                loading={index === 0 ? 'eager' : 'lazy'}
                alt={scene.name}
              />
              <div className="landing-scene-overlay" />
              <div>
                <small>SCENE {String(index + 1).padStart(2, '0')}</small>
                <h3>{scene.name}</h3>
                <p>{scene.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="beta" className="landing-section landing-beta">
        <div className="landing-beta-copy">
          <span className="landing-kicker"><TicketCheck size={14} /> 封闭内测</span>
          <h2>首页可以公开了解，真正的自习室只留给受邀用户。</h2>
          <p>
            邀请码不会在页面上自助领取，由栖时主理人定向发放。注册成功后，任务、场景、轨迹和专注计时才会开放。
          </p>
          <Link to={primaryTarget} className="landing-primary-cta landing-dark-cta">
            {session ? '继续今天的专注' : '我有邀请码，去注册'}
            <ArrowRight size={18} />
          </Link>
        </div>
        <ol className="landing-step-list">
          {steps.map(([number, title, body]) => (
            <li key={number}>
              <span>{number}</span>
              <div>
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <footer className="landing-footer">
        <Link to="/" className="landing-brand">
          <span><Leaf size={18} /></span>
          <div>
            <strong>栖时</strong>
            <small>东方疗愈自习室</small>
          </div>
        </Link>
        <p>核心计时、任务与基础场景将继续免费。当前版本为 Android 封闭内测。</p>
        <div>
          <Link to="/account?mode=login">账号登录</Link>
          <Link to="/account?mode=register">邀请码注册</Link>
        </div>
      </footer>
    </main>
  );
}
