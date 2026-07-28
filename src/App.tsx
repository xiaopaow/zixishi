import { lazy, Suspense, useEffect, useRef } from 'react';
import { App as NativeApp } from '@capacitor/app';
import type { PluginListenerHandle } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import {
  BrowserRouter,
  HashRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { useApp } from './context/AppContext';
import {
  isNativeApp,
  NATIVE_FOCUS_BACK_EVENT,
} from './native/mobile';
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
  const navigate = useNavigate();
  const initialRoute = useRef(true);
  const locationPath = useRef(location.pathname);
  const navigateRef = useRef(navigate);
  locationPath.current = location.pathname;
  navigateRef.current = navigate;

  useEffect(() => {
    if (!isNativeApp) return;
    let disposed = false;
    const handles: PluginListenerHandle[] = [];
    const retain = (promise: Promise<PluginListenerHandle>) => {
      void promise.then((handle) => {
        if (disposed) {
          void handle.remove();
        } else {
          handles.push(handle);
        }
      });
    };

    retain(
      NativeApp.addListener('backButton', ({ canGoBack }) => {
        if (document.querySelector('[role="dialog"]')) {
          window.dispatchEvent(
            new KeyboardEvent('keydown', {
              key: 'Escape',
              bubbles: true,
            }),
          );
          return;
        }
        if (document.fullscreenElement) {
          void document.exitFullscreen?.();
          return;
        }
        if (locationPath.current === '/focus') {
          window.dispatchEvent(new Event(NATIVE_FOCUS_BACK_EVENT));
          return;
        }
        if (locationPath.current === '/') {
          void NativeApp.minimizeApp();
          return;
        }
        if (canGoBack) {
          navigateRef.current(-1);
        } else {
          navigateRef.current('/', { replace: true });
        }
      }),
    );

    retain(
      LocalNotifications.addListener(
        'localNotificationActionPerformed',
        ({ notification }) => {
          if (notification.extra?.route === '/focus') {
            navigateRef.current('/focus');
          }
        },
      ),
    );

    return () => {
      disposed = true;
      handles.forEach((handle) => void handle.remove());
    };
  }, []);

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
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById('main-content')?.focus({
            preventScroll: false,
          });
        }}
      >
        跳到主要内容
      </a>
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
  return isNativeApp ? (
    <HashRouter>
      <AppRoutes />
    </HashRouter>
  ) : (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
