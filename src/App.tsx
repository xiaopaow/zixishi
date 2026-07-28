import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { useApp } from './context/AppContext';
import { FocusPage } from './pages/FocusPage';
import { HomePage } from './pages/HomePage';
import { RoomPage } from './pages/RoomPage';
import { SettingsPage } from './pages/SettingsPage';
import { TrackPage } from './pages/TrackPage';

function AppRoutes() {
  const { ready } = useApp();

  useEffect(() => {
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

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/room" element={<RoomPage />} />
        <Route path="/track" element={<TrackPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="/focus" element={<FocusPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
