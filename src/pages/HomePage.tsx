import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Check,
  ChevronRight,
  Circle,
  Clock3,
  Flame,
  Leaf,
  Pencil,
  Play,
  Plus,
  Sparkles,
  Target,
  Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ScenePicture } from '../components/ScenePicture';
import { useApp } from '../context/AppContext';
import { getScene, scenes, soundForScene } from '../data/scenes';
import {
  calculateStreak,
  chineseDate,
  dayTotal,
  formatMinutes,
  greeting,
  todayKey,
} from '../utils';

export function HomePage() {
  const {
    tasks,
    sessions,
    preferences,
    activeTimer,
    addTask,
    renameTask,
    toggleTask,
    deleteTask,
    moveTask,
    updatePreferences,
  } = useApp();
  const navigate = useNavigate();
  const [newTask, setNewTask] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const currentDay = todayKey();
  const todayTasks = useMemo(
    () =>
      tasks
        .filter((task) => task.date === currentDay)
        .sort((a, b) => a.order - b.order),
    [tasks, currentDay],
  );
  const selectedScene = getScene(preferences.selectedSceneId);
  const recentSession = sessions[0];
  const completedCount = todayTasks.filter((task) => task.completedAt).length;

  const submitTask = async (event: React.FormEvent) => {
    event.preventDefault();
    await addTask(newTask);
    setNewTask('');
  };

  const saveRename = async (id: string) => {
    await renameTask(id, editingTitle);
    setEditingId(null);
  };

  return (
    <div className="page home-page">
      {activeTimer && (
        <Link to="/focus" className="resume-banner">
          <span className="resume-icon"><Play size={17} fill="currentColor" /></span>
          <span>
            <small>正在进行</small>
            <strong>{activeTimer.goalText}</strong>
          </span>
          <span className="resume-action">回到专注 <ArrowRight size={16} /></span>
        </Link>
      )}

      <section className="home-intro">
        <div>
          <span className="eyebrow"><Leaf size={14} /> {chineseDate()}</span>
          <h1>{greeting()}，<br />今天想完成什么？</h1>
          <p>不必把一天安排得很满。选一件重要的事，安静做完。</p>
        </div>
        <div className="quick-stats">
          <div>
            <span><Clock3 size={17} /> 今日专注</span>
            <strong>{formatMinutes(dayTotal(sessions))}</strong>
          </div>
          <div>
            <span><Flame size={17} /> 连续专注</span>
            <strong>{calculateStreak(sessions)} 天</strong>
          </div>
        </div>
      </section>

      <section className="home-grid">
        <article className="glass-card focus-hero">
          <ScenePicture
            scene={selectedScene}
            alt={selectedScene.name}
            fallbackToPoster
          />
          <div className="focus-hero-overlay" />
          <div className="focus-hero-copy">
            <span className="eyebrow light"><Sparkles size={14} /> 今日推荐</span>
            <h2>{selectedScene.name}</h2>
            <p>{selectedScene.description}</p>
            <button
              type="button"
              className="primary-button light-button"
              onClick={() => navigate('/room')}
            >
              <Play size={17} fill="currentColor" />
              开始一次专注
            </button>
          </div>
          <div className="hero-scene-dots" aria-label="快速选择场景">
            {scenes.map((scene) => (
              <button
                type="button"
                key={scene.id}
                aria-label={scene.name}
                aria-pressed={preferences.selectedSceneId === scene.id}
                onClick={() =>
                  void updatePreferences({
                    ...preferences,
                    selectedSceneId: scene.id,
                    sound: soundForScene(preferences, scene.id),
                  })
                }
              >
                <ScenePicture scene={scene} variant="poster" alt="" />
              </button>
            ))}
          </div>
        </article>

        <article className="glass-card task-card">
          <div className="section-heading">
            <div>
              <span className="eyebrow"><Target size={14} /> 今日清单</span>
              <h2>一次只做好一件事</h2>
            </div>
            <span className="progress-pill">{completedCount}/{todayTasks.length}</span>
          </div>

          <form className="task-form" onSubmit={submitTask}>
            <input
              value={newTask}
              onChange={(event) => setNewTask(event.target.value)}
              placeholder="添加今天要完成的事…"
              maxLength={80}
              aria-label="新任务"
            />
            <button type="submit" aria-label="添加任务" disabled={!newTask.trim()}>
              <Plus size={18} />
            </button>
          </form>

          <div className="task-list">
            {todayTasks.length === 0 && (
              <div className="empty-tasks">
                <Circle size={22} strokeWidth={1.3} />
                <p>写下一件事，让今天有一个清晰的开始。</p>
              </div>
            )}
            {todayTasks.map((task, index) => (
              <div className={`task-item ${task.completedAt ? 'done' : ''}`} key={task.id}>
                <button
                  type="button"
                  className="task-check"
                  onClick={() => void toggleTask(task.id)}
                  aria-label={task.completedAt ? '标记为未完成' : '标记为完成'}
                >
                  {task.completedAt ? <Check size={15} /> : <span />}
                </button>
                {editingId === task.id ? (
                  <form
                    className="task-edit"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void saveRename(task.id);
                    }}
                  >
                    <input
                      autoFocus
                      value={editingTitle}
                      onChange={(event) => setEditingTitle(event.target.value)}
                      onBlur={() => void saveRename(task.id)}
                      maxLength={80}
                    />
                  </form>
                ) : (
                  <button
                    type="button"
                    className="task-title"
                    onDoubleClick={() => {
                      setEditingId(task.id);
                      setEditingTitle(task.title);
                    }}
                    onClick={() => navigate(`/room?task=${task.id}`)}
                  >
                    {task.title}
                  </button>
                )}
                <div className="task-actions">
                  <button
                    type="button"
                    onClick={() => void moveTask(task.id, -1)}
                    disabled={index === 0}
                    aria-label="上移"
                  ><ArrowUp size={14} /></button>
                  <button
                    type="button"
                    onClick={() => void moveTask(task.id, 1)}
                    disabled={index === todayTasks.length - 1}
                    aria-label="下移"
                  ><ArrowDown size={14} /></button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(task.id);
                      setEditingTitle(task.title);
                    }}
                    aria-label="编辑"
                  ><Pencil size={14} /></button>
                  <button
                    type="button"
                    onClick={() => void deleteTask(task.id)}
                    aria-label="删除"
                  ><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="home-lower-grid">
        <article className="glass-card mini-scene-list">
          <div className="section-heading">
            <div>
              <span className="eyebrow">五境流光</span>
              <h2>换一种心境</h2>
            </div>
            <Link to="/room">全部场景 <ChevronRight size={15} /></Link>
          </div>
          <div className="mini-scenes">
            {scenes.map((scene) => (
              <button
                type="button"
                key={scene.id}
                onClick={() => {
                  void updatePreferences({
                    ...preferences,
                    selectedSceneId: scene.id,
                    sound: soundForScene(preferences, scene.id),
                  });
                  navigate('/room');
                }}
              >
                <ScenePicture
                  scene={scene}
                  variant="poster"
                  alt=""
                  loading="lazy"
                />
                <span>{scene.shortName}</span>
              </button>
            ))}
          </div>
        </article>

        <article className="glass-card recent-card">
          <span className="eyebrow">最近一次</span>
          {recentSession ? (
            <>
              <div className="recent-main">
                <span className="recent-icon"><Clock3 size={21} /></span>
                <div>
                  <strong>{recentSession.goalText}</strong>
                  <p>{getScene(recentSession.sceneId).shortName} · {formatMinutes(recentSession.focusedSeconds)}</p>
                </div>
              </div>
              <Link to="/track">查看专注轨迹 <ArrowRight size={15} /></Link>
            </>
          ) : (
            <div className="recent-empty">
              <p>第一段专注完成后，会在这里留下足迹。</p>
              <Link to="/room">现在开始 <ArrowRight size={15} /></Link>
            </div>
          )}
        </article>
      </section>
    </div>
  );
}
