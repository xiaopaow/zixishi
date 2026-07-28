import {
  ArrowRight,
  Check,
  Clock3,
  Monitor,
  Play,
  RotateCcw,
  Sparkles,
  Timer,
  Smartphone,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { audioEngine } from '../audio/audioEngine';
import { SceneCard } from '../components/SceneCard';
import { ScenePicture } from '../components/ScenePicture';
import { SoundMixer } from '../components/SoundMixer';
import { useApp } from '../context/AppContext';
import { getScene, scenes, soundForScene } from '../data/scenes';
import { ACTIVE_TIMER_CONFLICT_MESSAGE } from '../db';
import type { TimerMode } from '../types';
import { todayKey } from '../utils';

const presets = [25, 45, 50, 90];

export function RoomPage() {
  const {
    tasks,
    preferences,
    activeTimer,
    updatePreferences,
    startFocus,
  } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryTask = searchParams.get('task');
  const [mode, setMode] = useState<TimerMode>('countdown');
  const [minutes, setMinutes] = useState(preferences.defaultMinutes);
  const [customOpen, setCustomOpen] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(queryTask);
  const [goal, setGoal] = useState('');
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState('');
  const selectedScene = getScene(preferences.selectedSceneId);
  const todayTasks = useMemo(
    () =>
      tasks
        .filter((task) => task.date === todayKey() && !task.completedAt)
        .sort((a, b) => a.order - b.order),
    [tasks],
  );

  useEffect(() => {
    const selectedTask = tasks.find((task) => task.id === queryTask);
    if (selectedTask) {
      setTaskId(selectedTask.id);
      setGoal(selectedTask.title);
    }
  }, [queryTask, tasks]);

  const selectScene = async (sceneId: string) => {
    const next = {
      ...preferences,
      selectedSceneId: sceneId,
      sound: soundForScene(preferences, sceneId),
    };
    await updatePreferences(next);
    audioEngine.apply(next.sound);
  };

  const begin = async () => {
    if (starting) return;
    setStarting(true);
    setStartError('');
    try {
      await startFocus({
        mode,
        minutes,
        goalText: goal || selectedScene.whisper,
        taskId,
        sceneId: selectedScene.id,
      });
      try {
        await updatePreferences({
          ...preferences,
          defaultMinutes: minutes,
        });
      } catch {
        // The active timer is already safely persisted. A preference write
        // failure must not strand the user outside the focus screen.
      }
      try {
        await audioEngine.start(preferences.sound);
      } catch {
        // Browsers may reject AudioContext resume after the IndexedDB write.
        // The focus screen keeps the timer and offers a sound retry button.
      }
      navigate('/focus');
    } catch (error) {
      setStartError(
        error instanceof Error &&
          error.message === ACTIVE_TIMER_CONFLICT_MESSAGE
          ? '另一页面已经开始专注，请点击上方按钮回到正在进行的计时。'
          : '暂时无法开始计时，请检查浏览器存储权限后重试。',
      );
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="page room-page">
      <section className="page-title-row">
        <div>
          <span className="eyebrow"><Sparkles size={14} /> 专注室</span>
          <h1>为此刻，选一方天地</h1>
          <p>场景、声音和目标准备好后，就让时间安静地向前走。</p>
        </div>
        {activeTimer && (
          <button className="secondary-button" type="button" onClick={() => navigate('/focus')}>
            返回正在进行的专注 <ArrowRight size={16} />
          </button>
        )}
      </section>

      <section className="room-layout">
        <div className="scene-library">
          <div className="scene-library-heading">
            <div>
              <span>场景 · {String(scenes.length).padStart(2, '0')}</span>
              <strong>东方疗愈空间</strong>
            </div>
            <div className="device-hints">
              <span><Monitor size={13} /> 电脑 / 平板沉浸最佳</span>
              <small><Smartphone size={12} /> 手机完整可用</small>
            </div>
          </div>
          <div className="scene-grid">
            {scenes.map((scene) => (
              <SceneCard
                key={scene.id}
                scene={scene}
                selected={selectedScene.id === scene.id}
                onSelect={() => void selectScene(scene.id)}
              />
            ))}
          </div>
        </div>

        <aside className="glass-card setup-panel">
          <div className="setup-scene-summary">
            <ScenePicture scene={selectedScene} variant="poster" alt="" />
            <div>
              <small>当前场景</small>
              <strong>{selectedScene.name}</strong>
              <span>{selectedScene.description}</span>
            </div>
            <Check size={18} />
          </div>

          <div className="setup-section">
            <div className="section-heading compact-heading">
              <div>
                <span className="eyebrow"><Timer size={14} /> 计时方式</span>
              </div>
            </div>
            <div className="segmented">
              <button
                type="button"
                className={mode === 'countdown' ? 'selected' : ''}
                aria-pressed={mode === 'countdown'}
                onClick={() => setMode('countdown')}
              >倒计时</button>
              <button
                type="button"
                className={mode === 'stopwatch' ? 'selected' : ''}
                aria-pressed={mode === 'stopwatch'}
                onClick={() => setMode('stopwatch')}
              >正计时</button>
            </div>
            {mode === 'countdown' && (
              <div className="time-presets">
                {presets.map((value) => (
                  <button
                    type="button"
                    key={value}
                    className={minutes === value && !customOpen ? 'selected' : ''}
                    aria-pressed={minutes === value && !customOpen}
                    onClick={() => {
                      setMinutes(value);
                      setCustomOpen(false);
                    }}
                  >
                    <strong>{value}</strong>
                    <span>分钟</span>
                  </button>
                ))}
                <button
                  type="button"
                  className={customOpen ? 'selected' : ''}
                  aria-pressed={customOpen}
                  onClick={() => setCustomOpen(true)}
                >
                  <RotateCcw size={17} />
                  <span>自定义</span>
                </button>
              </div>
            )}
            {mode === 'countdown' && customOpen && (
              <label className="custom-time">
                <input
                  type="number"
                  min="1"
                  max="180"
                  value={minutes}
                  aria-label="自定义专注时长（分钟）"
                  onChange={(event) =>
                    setMinutes(Math.min(180, Math.max(1, Number(event.target.value))))
                  }
                />
                <span>分钟</span>
              </label>
            )}
            {mode === 'stopwatch' && (
              <div className="stopwatch-note">
                <Clock3 size={18} />
                <span>从 00:00 开始，结束时保存实际专注时长。</span>
              </div>
            )}
          </div>

          <div className="setup-section goal-section">
            <label>
              <span className="eyebrow">本次目标</span>
              <select
                value={taskId ?? ''}
                onChange={(event) => {
                  const id = event.target.value || null;
                  setTaskId(id);
                  const task = tasks.find((item) => item.id === id);
                  if (task) setGoal(task.title);
                }}
              >
                <option value="">不关联今日任务</option>
                {todayTasks.map((task) => (
                  <option value={task.id} key={task.id}>{task.title}</option>
                ))}
              </select>
            </label>
            <label className="goal-textarea-label">
              <span className="sr-only">本次目标说明</span>
              <textarea
                value={goal}
                onChange={(event) => setGoal(event.target.value)}
                placeholder="例如：读完第三章并整理笔记"
                maxLength={120}
                rows={2}
              />
            </label>
            <small>{goal.length}/120</small>
          </div>

          <div className="setup-section">
            <SoundMixer
              preferences={preferences}
              onChange={(next) => void updatePreferences(next)}
              sceneId={selectedScene.id}
              dense
            />
          </div>

          <button
            type="button"
            className="primary-button start-focus-button"
            onClick={() => void begin()}
            disabled={starting || Boolean(activeTimer)}
          >
            <Play size={18} fill="currentColor" />
            {activeTimer ? '已有专注正在进行' : starting ? '正在进入…' : '进入专注'}
          </button>
          {startError && (
            <p className="room-start-error" role="alert">{startError}</p>
          )}
        </aside>
      </section>
    </div>
  );
}
