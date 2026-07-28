import type { ActiveTimer, FocusInterval, FocusSession } from './types';

export const todayKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const dateKeyFromTimestamp = (timestamp: number) =>
  todayKey(new Date(timestamp));

const readMonotonicClock = () => {
  if (typeof performance === 'undefined') return null;
  return {
    origin: performance.timeOrigin,
    now: performance.now(),
  };
};

export const monotonicAnchor = () => {
  const clock = readMonotonicClock();
  return {
    monotonicOrigin: clock?.origin ?? null,
    monotonicSince: clock?.now ?? null,
  };
};

export const elapsedSeconds = (
  timer: ActiveTimer,
  now = Date.now(),
  monotonic = readMonotonicClock(),
) => {
  let live = 0;
  if (timer.status === 'running' && timer.runningSince !== null) {
    const wallClockLive = Math.max(0, (now - timer.runningSince) / 1000);
    const hasMonotonicAnchor =
      monotonic &&
      timer.monotonicOrigin !== null &&
      timer.monotonicOrigin !== undefined &&
      timer.monotonicSince !== null &&
      timer.monotonicSince !== undefined;
    const monotonicLive = hasMonotonicAnchor
      ? (
        monotonic.origin +
        monotonic.now -
        timer.monotonicOrigin! -
        timer.monotonicSince!
      ) / 1000
      : Number.NaN;
    // performance.timeOrigin + performance.now() remains monotonic across a
    // same-browser reload, so a manual wall-clock jump cannot complete a
    // timer instantly. Legacy/browser-restart records fall back to wall time.
    live =
      Number.isFinite(monotonicLive) && monotonicLive >= 0
        ? monotonicLive
        : wallClockLive;
  }
  return Math.max(0, timer.accumulatedSeconds + live);
};

export const closeRunningInterval = (
  timer: ActiveTimer,
  totalElapsedSeconds: number,
): FocusInterval[] => {
  const intervals = timer.focusIntervals ?? [];
  if (timer.runningSince === null) return intervals;
  const liveSeconds = Math.max(
    0,
    totalElapsedSeconds - timer.accumulatedSeconds,
  );
  if (liveSeconds <= 0) return intervals;
  return [
    ...intervals,
    {
      startedAt: timer.runningSince,
      endedAt: timer.runningSince + liveSeconds * 1000,
    },
  ];
};

export const pausedTimerSnapshot = (
  timer: ActiveTimer,
  now = Date.now(),
): ActiveTimer => {
  if (timer.status === 'paused') return timer;
  const accumulatedSeconds = elapsedSeconds(timer, now);
  return {
    ...timer,
    accumulatedSeconds,
    focusIntervals: closeRunningInterval(timer, accumulatedSeconds),
    runningSince: null,
    status: 'paused',
    monotonicOrigin: null,
    monotonicSince: null,
  };
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

export const sessionDayAllocations = (session: FocusSession) => {
  const focusedSeconds = Math.max(0, session.focusedSeconds);
  if (focusedSeconds === 0) return new Map<string, number>();

  const overlaps: Array<{ key: string; milliseconds: number }> = [];
  const appendOverlaps = (rawStart: number, rawEnd: number) => {
    const end = Math.max(rawStart, rawEnd);
    const start = Math.min(rawStart, rawEnd);
    let cursor = start;
    while (cursor < end) {
      const current = new Date(cursor);
      const nextMidnight = new Date(
        current.getFullYear(),
        current.getMonth(),
        current.getDate() + 1,
      ).getTime();
      const boundary = Math.min(end, nextMidnight);
      overlaps.push({
        key: dateKeyFromTimestamp(cursor),
        milliseconds: Math.max(0, boundary - cursor),
      });
      cursor = boundary;
    }
  };

  const intervals = session.focusIntervals?.filter(
    ({ startedAt, endedAt }) =>
      Number.isFinite(startedAt) &&
      Number.isFinite(endedAt) &&
      endedAt > startedAt,
  );
  if (intervals?.length) {
    intervals.forEach(({ startedAt, endedAt }) =>
      appendOverlaps(startedAt, endedAt),
    );
  } else {
    appendOverlaps(session.startedAt, session.endedAt);
  }

  const wallMilliseconds = overlaps.reduce(
    (sum, item) => sum + item.milliseconds,
    0,
  );
  if (wallMilliseconds <= 0) {
    return new Map([[dateKeyFromTimestamp(session.endedAt), focusedSeconds]]);
  }

  const result = new Map<string, number>();
  let allocated = 0;
  overlaps.forEach((item, index) => {
    const seconds =
      index === overlaps.length - 1
        ? focusedSeconds - allocated
        : focusedSeconds * (item.milliseconds / wallMilliseconds);
    result.set(item.key, (result.get(item.key) ?? 0) + seconds);
    allocated += seconds;
  });
  return result;
};

export const dailyFocusTotals = (sessions: FocusSession[]) => {
  const totals = new Map<string, number>();
  sessions.forEach((session) => {
    sessionDayAllocations(session).forEach((seconds, key) => {
      totals.set(key, (totals.get(key) ?? 0) + seconds);
    });
  });
  return totals;
};

export const dayTotal = (sessions: FocusSession[], key = todayKey()) =>
  dailyFocusTotals(sessions).get(key) ?? 0;

export const totalSeconds = (sessions: FocusSession[]) =>
  sessions.reduce((sum, session) => sum + session.focusedSeconds, 0);

export const calculateStreak = (sessions: FocusSession[], now = new Date()) => {
  const totals = dailyFocusTotals(sessions);

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
