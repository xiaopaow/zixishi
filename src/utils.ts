import type { ActiveTimer, FocusSession } from './types';

export const todayKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const dateKeyFromTimestamp = (timestamp: number) =>
  todayKey(new Date(timestamp));

export const elapsedSeconds = (timer: ActiveTimer, now = Date.now()) => {
  const live =
    timer.status === 'running' && timer.runningSince
      ? Math.max(0, (now - timer.runningSince) / 1000)
      : 0;
  return Math.max(0, timer.accumulatedSeconds + live);
};

export const formatClock = (seconds: number) => {
  const safe = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

export const formatMinutes = (seconds: number) => {
  if (seconds < 60) return `${Math.max(0, Math.floor(seconds))} 秒`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours === 0) return `${minutes} 分钟`;
  if (minutes === 0) return `${hours} 小时`;
  return `${hours} 小时 ${minutes} 分`;
};

export const greeting = (date = new Date()) => {
  const hour = date.getHours();
  if (hour < 6) return '夜深了';
  if (hour < 11) return '早上好';
  if (hour < 14) return '中午好';
  if (hour < 18) return '下午好';
  return '晚上好';
};

export const chineseDate = (date = new Date()) =>
  new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(date);

export const dayTotal = (sessions: FocusSession[], key = todayKey()) =>
  sessions
    .filter((session) => dateKeyFromTimestamp(session.endedAt) === key)
    .reduce((sum, session) => sum + session.focusedSeconds, 0);

export const totalSeconds = (sessions: FocusSession[]) =>
  sessions.reduce((sum, session) => sum + session.focusedSeconds, 0);

export const calculateStreak = (sessions: FocusSession[], now = new Date()) => {
  const totals = new Map<string, number>();
  sessions.forEach((session) => {
    const key = dateKeyFromTimestamp(session.endedAt);
    totals.set(key, (totals.get(key) ?? 0) + session.focusedSeconds);
  });

  let cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if ((totals.get(todayKey(cursor)) ?? 0) < 600) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;
  while ((totals.get(todayKey(cursor)) ?? 0) >= 600) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
};

export const monthCalendar = (date = new Date()) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const leading = (first.getDay() + 6) % 7;
  const cells: Array<{ date: Date; inMonth: boolean }> = [];
  for (let index = 0; index < leading; index += 1) {
    cells.push({
      date: new Date(year, month, 1 - leading + index),
      inMonth: false,
    });
  }
  for (let day = 1; day <= last.getDate(); day += 1) {
    cells.push({ date: new Date(year, month, day), inMonth: true });
  }
  while (cells.length % 7 !== 0) {
    const offset = cells.length - leading - last.getDate() + 1;
    cells.push({
      date: new Date(year, month + 1, offset),
      inMonth: false,
    });
  }
  return cells;
};
