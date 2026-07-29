import {
  ArrowLeft,
  BarChart3,
  Check,
  Coffee,
  Expand,
  Image,
  Leaf,
  Minimize2,
  Music2,
  Pause,
  Play,
  RotateCcw,
  Shrink,
  Timer,
  Volume2,
  X,
} from 'lucide-react';
import { App as NativeApp } from '@capacitor/app';
import { SystemBars } from '@capacitor/core';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { audioEngine } from '../audio/audioEngine';
import { Modal } from '../components/Modal';
import { SceneBackground } from '../components/SceneBackground';
import { SceneCard } from '../components/SceneCard';
import { SoundMixer } from '../components/SoundMixer';
import { useApp } from '../context/AppContext';
import { getScene, scenes, soundForScene } from '../data/scenes';
import {
  isNativeApp,
  NATIVE_FOCUS_BACK_EVENT,
} from '../native/mobile';
import { useScenePresence } from '../hooks/useScenePresence';
import type { FocusSession } from '../types';
import { elapsedSeconds, formatClock, formatMinutes } from '../utils';

interface WakeLockSentinel {
  release: () => Promise<void>;
  addEventListener?: (type: 'release', listener: () => void) => void;
}

interface WakeLockNavigator {
  wakeLock?: {
    request: (type: 'screen') => Promise<WakeLockSentinel>;
  };
}

export function FocusPage() {
  const {
    ready,
    activeTimer,
    preferences,
    tasks,
    pauseFocus,
    resumeFocus,
    changeActiveScene,
    finishFocus,
    updatePreferences,
    toggleTask,
  } = useApp();
  const navigate = useNavigate();
  const [now, setNow] = useState(Date.now());
  const [controlsVisible, setControlsVisible] = useState(true);
  const [soundOpen, setSoundOpen] = useState(false);
  const [scenesOpen, setScenesOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const [completed, setCompleted] = useState<FocusSession | null>(null);
  const [soundReady, setSoundReady] = useState(audioEngine.state === 'running');
  const [operationError, setOperationError] = useState('');
  const [nativeImmersive, setNativeImmersive] = useState(false);
  const completionStarted = useRef(false);
  const hideTimer = useRef<number | null>(null);
  const wakeLock = useRef<WakeLockSentinel | null>(null);
  const wakeRetry = useRef<number | null>(null);

  const scene = getScene(activeTimer?.sceneId ?? preferences.selectedSceneId);
  const scenePresence = useScenePresence(
    activeTimer?.status === 'running' ? scene.id : undefined,
  );
  const elapsed = activeTimer ? elapsedSeconds(activeTimer, now) : 0;
  const displaySeconds =
    activeTimer?.mode === 'countdown'
      ? Math.max(0, (activeTimer.targetSeconds ?? 0) - elapsed)
      : elapsed;
  const progress =
    activeTimer?.mode === 'countdown' && activeTimer.targetSeconds
      ? Math.min(1, elapsed / activeTimer.targetSeconds)
      : 0;
  const linkedTask = useMemo(
    () => tasks.find((task) => task.id === (completed?.taskId ?? activeTimer?.taskId)),
    [tasks, completed?.taskId, activeTimer?.taskId],
  );

  const revealControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    if (!soundOpen && !scenesOpen && !endOpen && activeTimer?.status === 'running') {
      hideTimer.current = window.setTimeout(() => setControlsVisible(false), 9000);
    }
  }, [soundOpen, scenesOpen, endOpen, activeTimer?.status]);

  useEffect(() => {
    const interval = window.setInterval(
      () => setNow(Date.now()),
      isNativeApp ? 1000 : 250,
    );
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!ready || activeTimer || completed || completionStarted.current) return;
    navigate('/');
  }, [ready, activeTimer, completed, navigate]);

  useEffect(() => {
    revealControls();
    const events = ['pointermove', 'pointerdown', 'keydown', 'touchstart'];
    events.forEach((name) => window.addEventListener(name, revealControls, { passive: true }));
    return () => {
      events.forEach((name) => window.removeEventListener(name, revealControls));
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
    };
  }, [revealControls]);

  useEffect(() => {
    audioEngine.apply(preferences.sound);
  }, [preferences.sound]);

  useEffect(() => {
    if (!isNativeApp) return;
    let disposed = false;
    const handles: Array<{ remove: () => Promise<void> }> = [];
    const retain = (promise: Promise<{ remove: () => Promise<void> }>) => {
      void promise.then((handle) => {
        if (disposed) {
          void handle.remove();
        } else {
          handles.push(handle);
        }
      });
    };
    retain(
      NativeApp.addListener('pause', () => {
        void audioEngine.suspend();
        setSoundReady(false);
      }),
    );
    retain(
      NativeApp.addListener('resume', () => {
        setSoundReady(audioEngine.state === 'running');
        revealControls();
      }),
    );
    return () => {
      disposed = true;
      handles.forEach((handle) => void handle.remove());
    };
  }, [revealControls]);

  const exitNativeImmersive = useCallback(async () => {
    if (!isNativeApp) return;
    try {
      await SystemBars.show();
    } catch {
      // Immersive mode is optional on devices that restrict system-bar control.
    } finally {
      setNativeImmersive(false);
    }
  }, []);

  useEffect(() => {
    if (!isNativeApp) return;
    const handleNativeBack = () => {
      if (nativeImmersive) {
        void exitNativeImmersive();
      } else {
        setEndOpen(true);
        revealControls();
      }
    };
    window.addEventListener(NATIVE_FOCUS_BACK_EVENT, handleNativeBack);
    return () =>
      window.removeEventListener(NATIVE_FOCUS_BACK_EVENT, handleNativeBack);
  }, [exitNativeImmersive, nativeImmersive, revealControls]);

  useEffect(
    () => () => {
      if (isNativeApp) void SystemBars.show();
    },
    [],
  );

  useEffect(() => {
    if (completed && nativeImmersive) void exitNativeImmersive();
  }, [completed, exitNativeImmersive, nativeImmersive]);

  useEffect(() => {
    let disposed = false;
    const acquire = async () => {
      if (
        disposed ||
        activeTimer?.status !== 'running' ||
        document.visibilityState !== 'visible' ||
        wakeLock.current
      ) {
        return;
      }
      try {
        const nav = navigator as unknown as WakeLockNavigator;
        const sentinel = await nav.wakeLock?.request('screen');
        if (disposed) {
          await sentinel?.release();
          return;
        }
        wakeLock.current = sentinel ?? null;
        sentinel?.addEventListener?.('release', () => {
          if (wakeLock.current !== sentinel) return;
          wakeLock.current = null;
          if (
            !disposed &&
            document.visibilityState === 'visible' &&
            activeTimer?.status === 'running'
          ) {
            wakeRetry.current = window.setTimeout(() => void acquire(), 1000);
          }
        });
      } catch {
        wakeLock.current = null;
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void acquire();
      } else {
        const sentinel = wakeLock.current;
        wakeLock.current = null;
        void sentinel?.release();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    void acquire();
    return () => {
      disposed = true;
      document.removeEventListener('visibilitychange', handleVisibility);
      if (wakeRetry.current) window.clearTimeout(wakeRetry.current);
      void wakeLock.current?.release();
      wakeLock.current = null;
    };
  }, [activeTimer?.status]);

  const showNotification = useCallback(() => {
    if (
      !isNativeApp &&
      preferences.notificationsEnabled &&
      'Notification' in window &&
      Notification.permission === 'granted'
    ) {
      try {
        new Notification('这一段专注完成了', {
          body: activeTimer?.goalText ?? '你把时间认真地放在了重要的事情上。',
          icon: '/icons/icon-192.png',
        });
      } catch {
        // Browser or operating-system policy may change after permission.
      }
    }
  }, [preferences.notificationsEnabled, activeTimer?.goalText]);

  const completeAutomatically = useCallback(async () => {
    if (!activeTimer || completionStarted.current) return;
    completionStarted.current = true;
    try {
      audioEngine.chime();
      showNotification();
      const session = await finishFocus('completed', true);
      setCompleted(session);
      window.setTimeout(() => void audioEngine.fadeOut(), 1200);
      setControlsVisible(true);
    } catch {
      completionStarted.current = false;
      setOperationError('记录暂时无法保存。计时仍保留在本机，请重试或先导出数据。');
    }
  }, [activeTimer, finishFocus, showNotification]);

  useEffect(() => {
    if (
      activeTimer?.mode === 'countdown' &&
      activeTimer.status === 'running' &&
      displaySeconds <= 0
    ) {
      void completeAutomatically();
    }
  }, [activeTimer?.mode, activeTimer?.status, displaySeconds, completeAutomatically]);

  const togglePause = async () => {
    if (!activeTimer) return;
    setOperationError('');
    try {
      if (activeTimer.status === 'running') {
        await pauseFocus();
        await audioEngine.fadeOut();
        setSoundReady(false);
      } else {
        await resumeFocus();
        try {
          await audioEngine.fadeIn(preferences.sound);
          setSoundReady(true);
        } catch {
          setSoundReady(false);
        }
      }
    } catch {
      setOperationError('计时状态已在其他页面更新，正在同步最新状态。');
      setSoundReady(false);
    }
    revealControls();
  };

  const resumeSound = async () => {
    try {
      await audioEngine.fadeIn(preferences.sound);
      setSoundReady(true);
    } catch {
      setSoundReady(false);
    }
  };

  const end = async (save: boolean) => {
    completionStarted.current = true;
    setOperationError('');
    try {
      const session = await finishFocus('abandoned', save);
      await audioEngine.fadeOut();
      setEndOpen(false);
      if (session) {
        setCompleted(session);
      } else {
        navigate('/');
      }
    } catch {
      completionStarted.current = false;
      setEndOpen(false);
      setOperationError('结束操作没有写入成功，计时仍保留，请稍后重试。');
    }
  };

  const selectScene = async (sceneId: string) => {
    await changeActiveScene(sceneId);
    const next = {
      ...preferences,
      selectedSceneId: sceneId,
      sound: soundForScene(preferences, sceneId),
    };
    await updatePreferences(next);
    try {
      await audioEngine.fadeIn(next.sound);
      setSoundReady(true);
    } catch {
      setSoundReady(false);
    }
    setScenesOpen(false);
  };

  const toggleFullscreen = async () => {
    if (isNativeApp) {
      try {
        if (nativeImmersive) {
          await exitNativeImmersive();
        } else {
          await SystemBars.hide();
          setNativeImmersive(true);
        }
      } catch {
        setNativeImmersive(false);
      }
      return;
    }
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen?.();
      } else {
        await document.exitFullscreen?.();
      }
    } catch {
      // Fullscreen is optional and can be rejected by browser policy.
    }
  };

  const toggleTimerStyle = () =>
    updatePreferences({
      ...preferences,
      timerStyle: preferences.timerStyle === 'large' ? 'compact' : 'large',
    });

  if (!activeTimer && !completed) {
    return <div className="focus-loading">正在回到栖时…</div>;
  }

  return (
    <SceneBackground
      scene={scene}
      motionEnabled={preferences.motionEnabled}
      quality={preferences.quality}
    >
      <main
        id="main-content"
        data-route="/focus"
        tabIndex={-1}
        className={`focus-screen ${controlsVisible ? 'controls-visible' : 'controls-hidden'} timer-${preferences.timerStyle}`}
      >
        <header className="focus-header liquid-glass">
          <button
            type="button"
            className="focus-brand"
            onClick={() => setEndOpen(true)}
            aria-label="打开结束专注确认"
          >
            <span><Leaf size={18} /></span>
            <strong>栖时</strong>
          </button>
          <div className="focus-scene-name">
            <span className="breathing-dot" />
            {scene.name}
            {scenePresence.connected && (
              <em>{scenePresence.counts[scene.id] ?? 0} 人同频</em>
            )}
          </div>
          <button
            type="button"
            className="icon-button glass-icon"
            onClick={() => void toggleFullscreen()}
            aria-label={nativeImmersive ? '退出全屏' : '全屏'}
          >
            {nativeImmersive ? <Minimize2 size={18} /> : <Expand size={18} />}
          </button>
        </header>

        {!soundReady && activeTimer && (
          <button type="button" className="restore-sound liquid-glass" onClick={() => void resumeSound()}>
            <Volume2 size={17} /> 点击恢复声音
          </button>
        )}

        {operationError && (
          <div className="focus-operation-error liquid-glass" role="alert">
            <span>{operationError}</span>
            <button
              type="button"
              onClick={() => {
                setOperationError('');
                if (activeTimer?.mode === 'countdown' && displaySeconds <= 0) {
                  void completeAutomatically();
                }
              }}
            >
              {activeTimer?.mode === 'countdown' && displaySeconds <= 0
                ? '重试保存'
                : '知道了'}
            </button>
          </div>
        )}

        {activeTimer?.status === 'paused' && (
          <aside className="away-pause-card liquid-glass" aria-live="polite">
            <span className="away-pause-icon"><Coffee size={18} /></span>
            <div>
              <small>安心离席</small>
              <strong>计时已经暂停</strong>
              <p>去接电话、喝水或休息一下，回来后再继续，不会损失剩余时间。</p>
            </div>
            <button type="button" onClick={() => void togglePause()}>
              <Play size={15} fill="currentColor" /> 回来继续
            </button>
          </aside>
        )}

        {activeTimer && (
          <section className="timer-stage" aria-label="本次专注计时">
            <div className={`timer-display liquid-glass ${activeTimer.status}`}>
              <div className="timer-meta">
                <span>{activeTimer.mode === 'countdown' ? '专注倒计时' : '自由正计时'}</span>
                <button type="button" onClick={() => void toggleTimerStyle()} aria-label="切换计时器大小">
                  {preferences.timerStyle === 'large' ? <Shrink size={16} /> : <Minimize2 size={16} />}
                </button>
              </div>
              <strong className="timer-value">{formatClock(displaySeconds)}</strong>
              <div className="timer-goal">
                <span />
                <p>{activeTimer.goalText}</p>
              </div>
              {activeTimer.mode === 'countdown' && (
                <div className="timer-progress">
                  <span style={{ transform: `scaleX(${progress})` }} />
                </div>
              )}
              {activeTimer.status === 'paused' && <em>暂停中 · 慢一点也没关系</em>}
            </div>
          </section>
        )}

        {activeTimer && (
          <div className="focus-controls liquid-glass">
            <button type="button" onClick={() => setScenesOpen(true)}>
              <Image size={19} /><span>场景</span>
            </button>
            <button type="button" onClick={() => setSoundOpen(true)}>
              <Music2 size={19} /><span>声音</span>
            </button>
            <button type="button" className="pause-control" onClick={() => void togglePause()}>
              {activeTimer.status === 'running' ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
              <span>{activeTimer.status === 'running' ? '暂停' : '继续'}</span>
            </button>
            <button type="button" onClick={() => void toggleTimerStyle()}>
              <Timer size={19} /><span>样式</span>
            </button>
            <button type="button" onClick={() => setEndOpen(true)}>
              <X size={19} /><span>结束</span>
            </button>
          </div>
        )}

        <Modal open={soundOpen} title="调整声音空间" onClose={() => setSoundOpen(false)} className="focus-modal">
          <SoundMixer
            preferences={preferences}
            onChange={(next) => void updatePreferences(next)}
            sceneId={scene.id}
          />
          <button type="button" className="primary-button modal-done" onClick={() => setSoundOpen(false)}>
            <Check size={17} /> 调整好了
          </button>
        </Modal>

        <Modal open={scenesOpen} title="换一方天地" onClose={() => setScenesOpen(false)} className="focus-modal scene-picker-modal">
          <div className="focus-scene-grid">
            {scenes.map((item) => (
              <SceneCard
                compact
                key={item.id}
                scene={item}
                selected={scene.id === item.id}
                onlineCount={scenePresence.connected ? (scenePresence.counts[item.id] ?? 0) : null}
                onSelect={() => void selectScene(item.id)}
              />
            ))}
          </div>
        </Modal>

        <Modal open={endOpen} title="要结束这一段专注吗？" onClose={() => setEndOpen(false)}>
          <div className="modal-body end-session-modal">
            <RotateCcw size={34} strokeWidth={1.35} />
            <p>
              已专注 <strong>{formatMinutes(elapsed)}</strong>。
              {elapsed < 60 ? ' 不足一分钟的记录不会保存。' : ' 你可以保存这段时间，或不留下记录。'}
            </p>
            <div className="modal-actions stacked-mobile">
              <button type="button" className="secondary-button" onClick={() => setEndOpen(false)}>继续专注</button>
              {elapsed >= 60 && (
                <button type="button" className="secondary-button" onClick={() => void end(true)}>保存并结束</button>
              )}
              <button type="button" className="danger-button subtle" onClick={() => void end(false)}>不保存</button>
            </div>
          </div>
        </Modal>

        <Modal open={Boolean(completed)} title="这一段，完成了" className="completion-modal">
          <div className="completion-body">
            <span className="completion-seal"><Check size={34} /></span>
            <span className="eyebrow">今日也有认真生活</span>
            <h3>{completed?.goalText}</h3>
            <p>你不需要时时充满动力。愿意坐下来开始，本身就已经很了不起。</p>
            <div className="completion-stats">
              <div><strong>{formatMinutes(completed?.focusedSeconds ?? 0)}</strong><span>本次专注</span></div>
              <div><strong>{scene.shortName}</strong><span>所处场景</span></div>
            </div>
            {linkedTask && !linkedTask.completedAt && (
              <button type="button" className="mark-task-button" onClick={() => void toggleTask(linkedTask.id)}>
                <Check size={16} /> 同时完成今日任务
              </button>
            )}
            <div className="modal-actions">
              <button type="button" className="secondary-button" onClick={() => navigate('/')}>
                <ArrowLeft size={16} /> 回到首页
              </button>
              <button type="button" className="primary-button" onClick={() => navigate('/track')}>
                <BarChart3 size={16} /> 查看轨迹
              </button>
            </div>
          </div>
        </Modal>
      </main>
    </SceneBackground>
  );
}
