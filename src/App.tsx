import { lazy, Suspense, useEffect, useRef } from 'react';
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { useApp } from './context/AppContext';
import { HomePage } from './pages/HomePage';

const AccountPage = lazy(() =>
  import('./pages/AccountPage').then(({ AccountPage: page }) => ({
    default: page,
  })),
);
const FocusPage = lazy(() =>
  import('./pages/FocusPage').then(({ FocusPage: page }) => ({
    default: page,
  })),
);
const RoomPage = lazy(() =>
  import('./pages/RoomPage').then(({ RoomPage: page }) => ({
    default: page,
  })),
);
const SettingsPage = lazy(() =>
  import('./pages/SettingsPage').then(({ SettingsPage: page }) => ({
    default: page,
  })),
);
const TrackPage = lazy(() =>
  import('./pages/TrackPage').then(({ TrackPage: page }) => ({
    default: page,
  })),
);

function RouteLoading() {
  return (
    <div className="route-loading" role="status" aria-live="polite">
      <span className="loading-leaf" aria-hidden="true">栖</span>
      <p>正在推开这一扇窗…</p>
    </div>
  );
}

function AppRoutes() {
  const { ready, storageError, refresh } = useApp();
  const location = useLocation();
  const initialRoute = useRef(true);

  useEffect(() => {
    const titles: Record<string, string> = {
      '/': '栖时 · 东方疗愈自习室',
      '/room': '专注室 · 栖时',
      '/track': '专注轨迹 · 栖时',
      '/settings': '设置 · 栖时',
      '/focus': '沉浸专注 · 栖时',
      '/account': '栖时账号 · 登录与注册',
    };
    document.title = titles[location.pathname] ?? '栖时 · 东方疗愈自习室';

    if (initialRoute.current) {
      initialRoute.current = false;
      return;
    }

    let frame = 0;
    let attempts = 0;
    const focusMainContent = () => {
      const main = document.querySelector<HTMLElement>(
        `#main-content[data-route="${location.pathname}"]`,
      );
      if (main) {
        main.focus({ preventScroll: true });
        return;
      }
      attempts += 1;
      if (attempts < 30) {
        frame = window.requestAnimationFrame(focusMainContent);
      }
    };
    frame = window.requestAnimationFrame(focusMainContent);
    return () => window.cancelAnimationFrame(frame);
  }, [location.pathname]);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let frame = 0;
    const updateGlassLight = (event: PointerEvent) => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        const x = `${(event.clientX / window.innerWidth) * 100}%`;
        const y = `${(event.clientY / window.innerHeight) * 100}%`;
        document.documentElement.style.setProperty('--glass-x', x);
        document.documentElement.style.setProperty('--glass-y', y);
        frame = 0;
      });
    };
    window.addEventListener('pointermove', updateGlassLight, { passive: true });
    return () => {
      window.removeEventListener('pointermove', updateGlassLight);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  if (!ready) {
    return (
      <div className="app-loading">
        <span className="loading-leaf">栖</span>
        <p>正在拾起今天的时间…</p>
      </div>
    );
  }

  if (storageError) {
    return (
      <main
        id="main-content"
        data-route={location.pathname}
        tabIndex={-1}
        className="storage-error-page"
      >
        <span className="loading-leaf" aria-hidden="true">栖</span>
        <h1>本机数据暂时无法打开</h1>
        <p>{storageError}</p>
        <button type="button" className="primary-button" onClick={() => void refresh()}>
          重新尝试
        </button>
      </main>
    );
  }

  return (
    <>
      <a className="skip-link" href="#main-content">跳到主要内容</a>
      <Suspense fallback={<RouteLoading />}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/room" element={<RoomPage />} />
            <Route path="/track" element={<TrackPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="/focus" element={<FocusPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
