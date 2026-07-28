import {
  BarChart3,
  Home,
  Leaf,
  Settings,
  TimerReset,
} from 'lucide-react';
import { useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { getScene } from '../data/scenes';
import { useApp } from '../context/AppContext';

const navigation = [
  { to: '/', label: '首页', icon: Home },
  { to: '/room', label: '专注室', icon: TimerReset },
  { to: '/track', label: '轨迹', icon: BarChart3 },
  { to: '/settings', label: '设置', icon: Settings },
];

export function AppShell() {
  const { preferences } = useApp();
  const location = useLocation();
  const scene = getScene(preferences.selectedSceneId);

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
        <NavLink to="/" className="brand" aria-label="栖时首页">
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
              end={to === '/'}
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              <Icon size={17} strokeWidth={1.8} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="topbar-note">
          <span className="breathing-dot" />
          数据仅保存在本机
        </div>
      </header>

      <main className="page-container" key={location.pathname}>
        <Outlet />
      </main>

      <nav className="mobile-nav" aria-label="主导航">
        {navigation.map(({ to, label, icon: Icon }) => (
          <NavLink
            to={to}
            key={to}
            end={to === '/'}
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
