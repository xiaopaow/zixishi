import Dexie, { type EntityTable } from 'dexie';
import { normalizePreferences, scenes } from './data/scenes';
import type {
  ActiveTimer,
  BackupPayload,
  FocusInterval,
  FocusSession,
  Preferences,
  Task,
} from './types';
import { pausedTimerSnapshot } from './utils';

interface SettingRecord {
  key: string;
  value: Preferences;
}

interface ActiveRecord {
  key: string;
  value: ActiveTimer;
}

class QishiDatabase extends Dexie {
  tasks!: EntityTable<Task, 'id'>;
  sessions!: EntityTable<FocusSession, 'id'>;
  settings!: EntityTable<SettingRecord, 'key'>;
  active!: EntityTable<ActiveRecord, 'key'>;

  constructor() {
    super('qishi-focus-v1');
    this.version(1).stores({
      tasks: 'id, date, order, completedAt',
      sessions: 'id, endedAt, sceneId, status, taskId',
      settings: 'key',
      active: 'key',
    });
    this.version(2)
      .stores({
        tasks: 'id, date, order, completedAt',
        sessions: 'id, endedAt, sceneId, status, taskId',
        settings: 'key',
        active: 'key',
      })
      .upgrade(async (transaction) => {
        await transaction
          .table<SettingRecord>('settings')
          .toCollection()
          .modify((record) => {
            record.value = normalizePreferences(record.value);
          });
      });
  }
}

export const db = new QishiDatabase();

export const loadAll = async () => {
  const [tasks, sessions, setting, active] = await Promise.all([
    db.tasks.orderBy('order').toArray(),
    db.sessions.orderBy('endedAt').reverse().toArray(),
    db.settings.get('preferences'),
    db.active.get('current'),
  ]);
  return {
    tasks,
    sessions,
    preferences: normalizePreferences(setting?.value),
    activeTimer: active?.value ?? null,
  };
};

export const savePreferences = (preferences: Preferences) =>
  db.settings.put({
    key: 'preferences',
    value: normalizePreferences(preferences),
  });

export const saveActiveTimer = (timer: ActiveTimer | null) =>
  timer
    ? db.active.put({ key: 'current', value: timer })
    : db.active.delete('current');

export const ACTIVE_TIMER_CONFLICT_MESSAGE = '已有专注正在其他页面进行';

export const createActiveTimer = (timer: ActiveTimer) =>
  db.transaction('rw', db.active, async () => {
    const existing = await db.active.get('current');
    if (existing) throw new Error(ACTIVE_TIMER_CONFLICT_MESSAGE);
    const initial = { ...timer, revision: timer.revision ?? 0 };
    await db.active.put({ key: 'current', value: initial });
    return initial;
  });

export const updateActiveTimer = (
  expectedId: string,
  expectedRevision: number,
  timer: ActiveTimer,
) =>
  db.transaction('rw', db.active, async () => {
    const current = await db.active.get('current');
    if (
      !current ||
      current.value.id !== expectedId ||
      (current.value.revision ?? 0) !== expectedRevision
    ) {
      throw new Error('计时状态已在其他页面发生变化');
    }
    const next = { ...timer, revision: expectedRevision + 1 };
    await db.active.put({ key: 'current', value: next });
    return next;
  });

export const finalizeActiveTimer = (
  expectedId: string,
  expectedRevision: number,
  session: FocusSession | null,
) =>
  db.transaction('rw', db.sessions, db.active, async () => {
    const current = await db.active.get('current');
    if (
      !current ||
      current.value.id !== expectedId ||
      (current.value.revision ?? 0) !== expectedRevision
    ) {
      throw new Error('计时状态已在其他页面发生变化');
    }
    if (session) await db.sessions.put(session);
    await db.active.delete('current');
  });

export const exportData = async (): Promise<BackupPayload> => {
  const exportedAt = Date.now();
  return db.transaction(
    'r',
    db.tasks,
    db.sessions,
    db.settings,
    db.active,
    async () => {
      const [tasks, sessions, setting, active] = await Promise.all([
        db.tasks.orderBy('order').toArray(),
        db.sessions.orderBy('endedAt').reverse().toArray(),
        db.settings.get('preferences'),
        db.active.get('current'),
      ]);
      return {
        version: 3,
        exportedAt,
        tasks,
        sessions,
        preferences: normalizePreferences(setting?.value),
        activeTimer: active?.value
          ? pausedTimerSnapshot(active.value, exportedAt)
          : null,
      };
    },
  );
};

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const MAX_TASKS = 5_000;
const MAX_SESSIONS = 20_000;
const MAX_INTERVALS = 1_024;
const MAX_SESSION_SECONDS = 31 * 24 * 60 * 60;
const MAX_SESSION_MILLISECONDS = MAX_SESSION_SECONDS * 1000;
const SCENE_IDS = new Set(scenes.map(({ id }) => id));
const hasUniqueIds = (rows: Array<{ id: string }>) =>
  new Set(rows.map(({ id }) => id)).size === rows.length;
const isShortIdOrNull = (value: unknown) =>
  value === null ||
  (typeof value === 'string' && value.length > 0 && value.length <= 128);
const isValidDateKey = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(year, month - 1, day);
  return (
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
  );
};

const isTask = (value: unknown): value is Task => {
  if (!value || typeof value !== 'object') return false;
  const task = value as Partial<Task>;
  return (
    typeof task.id === 'string' &&
    task.id.length > 0 &&
    task.id.length <= 128 &&
    typeof task.title === 'string' &&
    task.title.length <= 80 &&
    typeof task.date === 'string' &&
    isValidDateKey(task.date) &&
    isFiniteNumber(task.order) &&
    Number.isInteger(task.order) &&
    task.order >= 0 &&
    isFiniteNumber(task.createdAt) &&
    task.createdAt >= 0 &&
    (task.completedAt === null ||
      (isFiniteNumber(task.completedAt) &&
        task.completedAt >= task.createdAt))
  );
};

const isFocusInterval = (value: unknown): value is FocusInterval => {
  if (!value || typeof value !== 'object') return false;
  const interval = value as { startedAt?: unknown; endedAt?: unknown };
  return (
    isFiniteNumber(interval.startedAt) &&
    interval.startedAt >= 0 &&
    isFiniteNumber(interval.endedAt) &&
    interval.endedAt >= interval.startedAt &&
    interval.endedAt - interval.startedAt <= MAX_SESSION_MILLISECONDS
  );
};

const intervalsFit = (
  intervals: FocusInterval[],
  lowerBound: number,
  upperBound: number,
) => {
  let previousEnd = lowerBound;
  return intervals.every((interval) => {
    const valid =
      interval.startedAt >= lowerBound &&
      interval.endedAt <= upperBound &&
      interval.startedAt >= previousEnd;
    previousEnd = interval.endedAt;
    return valid;
  });
};

const isSession = (value: unknown): value is FocusSession => {
  if (!value || typeof value !== 'object') return false;
  const session = value as Partial<FocusSession>;
  const structurallyValid =
    typeof session.id === 'string' &&
    session.id.length > 0 &&
    session.id.length <= 128 &&
    (session.mode === 'countdown' || session.mode === 'stopwatch') &&
    ((session.mode === 'countdown' &&
      isFiniteNumber(session.targetSeconds) &&
      session.targetSeconds > 0 &&
      session.targetSeconds <= 180 * 60) ||
      (session.mode === 'stopwatch' && session.targetSeconds === null)) &&
    isFiniteNumber(session.focusedSeconds) &&
    session.focusedSeconds >= 0 &&
    session.focusedSeconds <= MAX_SESSION_SECONDS &&
    typeof session.goalText === 'string' &&
    session.goalText.length <= 120 &&
    isShortIdOrNull(session.taskId) &&
    (session.taskTitle === undefined ||
      session.taskTitle === null ||
      (typeof session.taskTitle === 'string' && session.taskTitle.length <= 80)) &&
    typeof session.sceneId === 'string' &&
    SCENE_IDS.has(session.sceneId) &&
    isFiniteNumber(session.startedAt) &&
    session.startedAt >= 0 &&
    isFiniteNumber(session.endedAt) &&
    session.endedAt >= session.startedAt &&
    session.endedAt - session.startedAt <= MAX_SESSION_MILLISECONDS &&
    (session.status === 'completed' || session.status === 'abandoned') &&
    (session.focusIntervals === undefined ||
      (Array.isArray(session.focusIntervals) &&
        session.focusIntervals.length <= MAX_INTERVALS &&
        session.focusIntervals.every(isFocusInterval)));
  if (!structurallyValid) return false;
  const validSession = session as FocusSession;
  const focusedWallSeconds = validSession.focusIntervals?.length
    ? validSession.focusIntervals.reduce(
      (sum, interval) => sum + (interval.endedAt - interval.startedAt) / 1000,
      0,
    )
    : (validSession.endedAt - validSession.startedAt) / 1000;
  const focusedTolerance = Math.max(5, focusedWallSeconds * 0.01);
  return (
    validSession.focusedSeconds <= focusedWallSeconds + focusedTolerance &&
    (validSession.focusIntervals === undefined ||
      intervalsFit(
        validSession.focusIntervals,
        validSession.startedAt,
        validSession.endedAt,
      ))
  );
};

const isActiveTimer = (value: unknown): value is ActiveTimer => {
  if (!value || typeof value !== 'object') return false;
  const timer = value as Partial<ActiveTimer>;
  const structurallyValid =
    typeof timer.id === 'string' &&
    timer.id.length > 0 &&
    timer.id.length <= 128 &&
    (timer.mode === 'countdown' || timer.mode === 'stopwatch') &&
    ((timer.mode === 'countdown' &&
      isFiniteNumber(timer.targetSeconds) &&
      timer.targetSeconds > 0 &&
      timer.targetSeconds <= 180 * 60) ||
      (timer.mode === 'stopwatch' && timer.targetSeconds === null)) &&
    typeof timer.goalText === 'string' &&
    timer.goalText.length <= 120 &&
    isShortIdOrNull(timer.taskId) &&
    typeof timer.sceneId === 'string' &&
    SCENE_IDS.has(timer.sceneId) &&
    isFiniteNumber(timer.startedAt) &&
    timer.startedAt >= 0 &&
    (timer.runningSince === null ||
      (isFiniteNumber(timer.runningSince) &&
        timer.runningSince >= timer.startedAt &&
        timer.runningSince - timer.startedAt <= MAX_SESSION_MILLISECONDS)) &&
    isFiniteNumber(timer.accumulatedSeconds) &&
    timer.accumulatedSeconds >= 0 &&
    timer.accumulatedSeconds <= MAX_SESSION_SECONDS &&
    (timer.revision === undefined ||
      (Number.isInteger(timer.revision) &&
        timer.revision >= 0 &&
        timer.revision <= Number.MAX_SAFE_INTEGER)) &&
    (timer.monotonicOrigin === undefined ||
      timer.monotonicOrigin === null ||
      (isFiniteNumber(timer.monotonicOrigin) && timer.monotonicOrigin >= 0)) &&
    (timer.monotonicSince === undefined ||
      timer.monotonicSince === null ||
      (isFiniteNumber(timer.monotonicSince) && timer.monotonicSince >= 0)) &&
    (timer.status === 'running' || timer.status === 'paused') &&
    ((timer.status === 'running' && timer.runningSince !== null) ||
      (timer.status === 'paused' && timer.runningSince === null)) &&
    (timer.focusIntervals === undefined ||
      (Array.isArray(timer.focusIntervals) &&
        timer.focusIntervals.length <= MAX_INTERVALS &&
        timer.focusIntervals.every(isFocusInterval)));
  if (!structurallyValid) return false;
  const validTimer = timer as ActiveTimer;
  return (
    validTimer.focusIntervals === undefined ||
    intervalsFit(
      validTimer.focusIntervals,
      validTimer.startedAt,
      validTimer.startedAt + MAX_SESSION_MILLISECONDS,
    )
  );
};

const isBackup = (value: unknown): value is BackupPayload => {
  if (!value || typeof value !== 'object') return false;
  const payload = value as Partial<BackupPayload>;
  const structurallyValid =
    (payload.version === 1 ||
      payload.version === 2 ||
      payload.version === 3) &&
    isFiniteNumber(payload.exportedAt) &&
    payload.exportedAt >= 0 &&
    Array.isArray(payload.tasks) &&
    payload.tasks.length <= MAX_TASKS &&
    payload.tasks.every(isTask) &&
    hasUniqueIds(payload.tasks) &&
    Array.isArray(payload.sessions) &&
    payload.sessions.length <= MAX_SESSIONS &&
    payload.sessions.every(isSession) &&
    hasUniqueIds(payload.sessions) &&
    Boolean(payload.preferences) &&
    typeof payload.preferences === 'object' &&
    (payload.version !== 3 ||
      payload.activeTimer === null ||
      isActiveTimer(payload.activeTimer));
  if (!structurallyValid) return false;
  const validPayload = payload as BackupPayload;
  if (validPayload.version !== 3 || !validPayload.activeTimer) return true;
  return (
    validPayload.activeTimer.startedAt <= validPayload.exportedAt &&
    (validPayload.activeTimer.runningSince === null ||
      validPayload.activeTimer.runningSince <= validPayload.exportedAt) &&
    validPayload.exportedAt - validPayload.activeTimer.startedAt <=
      MAX_SESSION_MILLISECONDS &&
    !validPayload.sessions.some(
      ({ id }) => id === validPayload.activeTimer?.id,
    )
  );
};

export const importData = async (value: unknown) => {
  if (!isBackup(value)) {
    throw new Error('备份文件格式不正确');
  }
  await db.transaction('rw', db.tasks, db.sessions, db.settings, db.active, async () => {
    await Promise.all([
      db.tasks.clear(),
      db.sessions.clear(),
      db.settings.clear(),
      db.active.clear(),
    ]);
    await db.tasks.bulkPut(value.tasks);
    await db.sessions.bulkPut(value.sessions);
    await savePreferences(normalizePreferences(value.preferences));
    if (value.version === 3 && value.activeTimer) {
      await saveActiveTimer(
        pausedTimerSnapshot(
          {
            ...value.activeTimer,
            monotonicOrigin: null,
            monotonicSince: null,
          },
          value.exportedAt,
        ),
      );
    }
  });
};

export const clearData = async () => {
  await db.transaction('rw', db.tasks, db.sessions, db.settings, db.active, async () => {
    await Promise.all([
      db.tasks.clear(),
      db.sessions.clear(),
      db.settings.clear(),
      db.active.clear(),
    ]);
  });
};
