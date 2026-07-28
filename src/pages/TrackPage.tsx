import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Flame,
  Leaf,
  TimerReset,
} from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ScenePicture } from '../components/ScenePicture';
import { useApp } from '../context/AppContext';
import { getScene } from '../data/scenes';
import {
  calculateStreak,
  dailyFocusTotals,
  dayTotal,
  formatMinutes,
  monthCalendar,
  todayKey,
  totalSeconds,
} from '../utils';

const weekdays = ['一', '二', '三', '四', '五', '六', '日'];

export function TrackPage() {
  const { sessions, tasks } = useApp();
  const cells = useMemo(() => monthCalendar(), []);
  const totals = useMemo(() => dailyFocusTotals(sessions), [sessions]);
  const currentMonth = new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
  }).format(new Date());

  return (
    <div className="page track-page">
      <section className="page-title-row">
        <div>
          <span className="eyebrow"><Leaf size={14} /> 专注轨迹</span>
          <h1>每一段安静，都算数</h1>
          <p>不追赶别人，只看看自己已经认真走了多远。</p>
        </div>
      </section>

      <section className="stats-grid">
        <article className="stat-card featured">
          <span><Clock3 size={17} /> 今日专注</span>
          <strong>{formatMinutes(dayTotal(sessions))}</strong>
          <small>今天的时间，花在了重要的事情上</small>
        </article>
        <article className="stat-card">
          <span><TimerReset size={17} /> 累计时长</span>
          <strong>{formatMinutes(totalSeconds(sessions))}</strong>
          <small>共留下 {sessions.length} 条记录</small>
        </article>
        <article className="stat-card">
          <span><CheckCircle2 size={17} /> 完成次数</span>
          <strong>{sessions.filter((item) => item.status === 'completed').length} 次</strong>
          <small>完整走到终点的专注</small>
        </article>
        <article className="stat-card">
          <span><Flame size={17} /> 连续天数</span>
          <strong>{calculateStreak(sessions)} 天</strong>
          <small>每天累计 10 分钟即可点亮</small>
        </article>
      </section>

      <section className="track-grid">
        <article className="glass-card calendar-card">
          <div className="section-heading">
            <div>
              <span className="eyebrow"><CalendarDays size={14} /> 月历</span>
              <h2>{currentMonth}</h2>
            </div>
            <div className="heat-legend"><span /> 少 <span /> <span /> 多</div>
          </div>
          <div className="calendar-grid calendar-weekdays">
            {weekdays.map((weekday) => <span key={weekday}>{weekday}</span>)}
          </div>
          <div className="calendar-grid">
            {cells.map(({ date, inMonth }) => {
              const key = todayKey(date);
              const seconds = totals.get(key) ?? 0;
              const level =
                seconds >= 7200 ? 4 : seconds >= 3600 ? 3 : seconds >= 1200 ? 2 : seconds >= 600 ? 1 : 0;
              return (
                <div
                  key={key}
                  className={`calendar-day level-${level} ${inMonth ? '' : 'outside'} ${key === todayKey() ? 'today' : ''}`}
                  title={`${key} · ${formatMinutes(seconds)}`}
                >
                  <span>{date.getDate()}</span>
                  {seconds > 0 && <small>{Math.floor(seconds / 60)}m</small>}
                </div>
              );
            })}
          </div>
        </article>

        <article className="glass-card history-card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">最近记录</span>
              <h2>专注足迹</h2>
            </div>
          </div>
          <div className="history-list">
            {sessions.length === 0 && (
              <div className="history-empty">
                <Clock3 size={28} strokeWidth={1.3} />
                <p>还没有记录。完成第一段专注后，这里会慢慢亮起来。</p>
                <Link to="/room">去专注室</Link>
              </div>
            )}
            {sessions.slice(0, 12).map((session) => {
              const date = new Date(session.startedAt);
              const taskTitle =
                tasks.find((task) => task.id === session.taskId)?.title ??
                session.taskTitle;
              return (
                <div className="history-item" key={session.id}>
                  <ScenePicture
                    scene={getScene(session.sceneId)}
                    variant="poster"
                    alt=""
                  />
                  <div className="history-copy">
                    <strong>{session.goalText}</strong>
                    <span>
                      {date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                      {' · '}
                      {date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                      {' · '}
                      {session.mode === 'countdown' ? '倒计时' : '正计时'}
                      {' · '}
                      {getScene(session.sceneId).shortName}
                    </span>
                    {taskTitle && <small>关联任务 · {taskTitle}</small>}
                  </div>
                  <div className="history-time">
                    <strong>{formatMinutes(session.focusedSeconds)}</strong>
                    <span className={session.status}>{session.status === 'completed' ? '已完成' : '提前结束'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </article>
      </section>
    </div>
  );
}
