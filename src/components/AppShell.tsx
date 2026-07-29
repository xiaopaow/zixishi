import {
  BarChart3,
  Home,
  Leaf,
  Settings,
  TimerReset,
  UserRound,
} from 'lucide-react';
import { useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { getScene } from '../data/scenes';
import { useAccountSession } from '../hooks/useAccountSession';
import { useApp } from '../context/AppContext';

const navigation = [
  { to: '/app', label: '首页', icon: Home },
  { to: '/room', label: '专注室', icon: TimerReset },
  { to: '/track', label: '轨迹', icon: BarChart3 },
  { to: '/settings', label: '设置', icon: Settings },
];

export function AppShell() {
  const { preferences } = useApp();
  const location = useLocation();
  const scene = getScene(preferences.selectedSceneId);
  const account = useAccountSession();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [location.pathname]);

  return (
    <div
      className="app-shell"
      style={{
        '--shell-wallpaper': `image-set(url("${scene.posterAvif}") type("image/avif"), url("${scene.poster}") type("image/webp"))`,
      } as React.CSSProperties}
    >
      <div className="shell-backdrop" aria-hidden="true" />
      <header className="topbar">
        <NavLink to="/app" className="brand" aria-label="栖时自习室首页">
          <span className="brand-mark"><Leaf size={19} strokeWidth={1.8} /></span>
          <span>
            <strong>栖时</strong>
            <small>QISHI FOCUS</small>
          </span>
        </NavLink>
        <nav className="desktop-nav" aria-label="主导航">
          {navigation.map(({ to, label, icon: Icon }) => (
            <NavLink
              to={to}
              key={to}
              end={to === '/app'}
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              <Icon size={17} strokeWidth={1.8} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="topbar-actions">
          <div className="topbar-note">
            <span className="breathing-dot" />
            数据仅保存在本机
          </div>
          <NavLink
            to="/"
            className="account-entry"
            aria-label={account ? `${account.name}的栖时账号` : '登录或注册栖时账号'}
          >
            <UserRound size={16} />
            <span>{account?.name || '登录'}</span>
          </NavLink>
        </div>
      </header>

      <main
        id="main-content"
        data-route={location.pathname}
        tabIndex={-1}
        className="page-container"
        key={location.pathname}
      >
        <Outlet />
      </main>

      <nav className="mobile-nav" aria-label="主导航">
        {navigation.map(({ to, label, icon: Icon }) => (
          <NavLink
            to={to}
            key={to}
            end={to === '/app'}
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            <Icon size={20} strokeWidth={1.8} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
