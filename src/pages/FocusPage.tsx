import {
  ArrowLeft,
  BarChart3,
  Check,
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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { audioEngine } from '../audio/audioEngine';
import { Modal } from '../components/Modal';
import { SceneBackground } from '../components/SceneBackground';
import { SceneCard } from '../components/SceneCard';
import { SoundMixer } from '../components/SoundMixer';
import { useApp } from '../context/AppContext';
import { getScene, scenes } from '../data/scenes';
import type { FocusSession } from '../types';
import { elapsedSeconds, formatClock, formatMinutes } from '../utils';

interface WakeLockNavigator {
  wakeLock?: {
    request: (type: 'screen') => Promise<{ release: () => Promise<void> }>;
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
  const completionStarted = useRef(false);
  const hideTimer = useRef<number | null>(null);
  const wakeLock = useRef<{ release: () => Promise<void> } | null>(null);

  const scene = getScene(activeTimer?.sceneId ?? preferences.selectedSceneId);
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
    const interval = window.setInterval(() => setNow(Date.now()), 250);
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
    const acquire = async () => {
      try {
        const nav = navigator as unknown as WakeLockNavigator;
        wakeLock.current = await nav.wakeLock?.request('screen') ?? null;
      } catch {
        wakeLock.current = null;
      }
    };
    if (activeTimer?.status === 'running') void acquire();
    return () => {
      void wakeLock.current?.release();
      wakeLock.current = null;
    };
  }, [activeTimer?.status]);

  const showNotification = useCallback(() => {
    if (
      preferences.notificationsEnabled &&
      'Notification' in window &&
      Notification.permission === 'granted'
    ) {
      new Notification('这一段专注完成了', {
        body: activeTimer?.goalText ?? '你把时间认真地放在了重要的事情上。',
        icon: '/icons/icon-192.png',
      });
    }
  }, [preferences.notificationsEnabled, activeTimer?.goalText]);

  const completeAutomatically = useCallback(async () => {
    if (!activeTimer || completionStarted.current) return;
    completionStarted.current = true;
    audioEngine.chime();
    showNotification();
    const session = await finishFocus('completed', true);
    setCompleted(session);
    window.setTimeout(() => void audioEngine.fadeOut(), 1200);
    setControlsVisible(true);
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
    if (activeTimer.status === 'running') {
      await pauseFocus();
      await audioEngine.fadeOut();
      setSoundReady(false);
    } else {
      await resumeFocus();
      await audioEngine.fadeIn(preferences.sound);
      setSoundReady(true);
    }
    revealControls();
  };

  const resumeSound = async () => {
    await audioEngine.fadeIn(preferences.sound);
    setSoundReady(true);
  };

  const end = async (save: boolean) => {
    completionStarted.current = true;
    const session = await finishFocus('abandoned', save);
    await audioEngine.fadeOut();
    setEndOpen(false);
    if (session) {
      setCompleted(session);
    } else {
      completionStarted.current = false;
      navigate('/');
    }
  };

  const selectScene = async (sceneId: string) => {
    const nextScene = getScene(sceneId);
    await changeActiveScene(sceneId);
    const next = {
      ...preferences,
      selectedSceneId: sceneId,
      sound: structuredClone(nextScene.recommended),
    };
    await updatePreferences(next);
    await audioEngine.fadeIn(next.sound);
    setSoundReady(true);
    setScenesOpen(false);
  };

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen?.();
    } else {
      await document.exitFullscreen?.();
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
      <div
        className={`focus-screen ${controlsVisible ? 'controls-visible' : 'controls-hidden'} timer-${preferences.timerStyle}`}
      >
        <header className="focus-header liquid-glass">
          <button type="button" className="focus-brand" onClick={() => setEndOpen(true)}>
            <span><Leaf size={18} /></span>
            <strong>栖时</strong>
          </button>
          <div className="focus-scene-name">
            <span className="breathing-dot" />
            {scene.name}
          </div>
          <button type="button" className="icon-button glass-icon" onClick={() => void toggleFullscreen()} aria-label="全屏">
            <Expand size={18} />
          </button>
        </header>

        {!soundReady && activeTimer && (
          <button type="button" className="restore-sound liquid-glass" onClick={() => void resumeSound()}>
            <Volume2 size={17} /> 点击恢复声音
          </button>
        )}

        {activeTimer && (
          <main className="timer-stage">
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
          </main>
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
      </div>
    </SceneBackground>
  );
}
