import Dexie, { type EntityTable } from 'dexie';
import { normalizePreferences } from './data/scenes';
import type {
  ActiveTimer,
  BackupPayload,
  FocusSession,
  Preferences,
  Task,
} from './types';

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

export const exportData = async (): Promise<BackupPayload> => {
  const { tasks, sessions, preferences, activeTimer } = await loadAll();
  return {
    version: 3,
    exportedAt: Date.now(),
    tasks,
    sessions,
    preferences,
    activeTimer,
  };
};

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isTask = (value: unknown): value is Task => {
  if (!value || typeof value !== 'object') return false;
  const task = value as Partial<Task>;
  return (
    typeof task.id === 'string' &&
    typeof task.title === 'string' &&
    typeof task.date === 'string' &&
    isFiniteNumber(task.order) &&
    task.order >= 0 &&
    isFiniteNumber(task.createdAt) &&
    task.createdAt >= 0 &&
    (task.completedAt === null ||
      (isFiniteNumber(task.completedAt) && task.completedAt >= 0))
  );
};

const isFocusInterval = (value: unknown) => {
  if (!value || typeof value !== 'object') return false;
  const interval = value as { startedAt?: unknown; endedAt?: unknown };
  return (
    isFiniteNumber(interval.startedAt) &&
    interval.startedAt >= 0 &&
    isFiniteNumber(interval.endedAt) &&
    interval.endedAt >= interval.startedAt
  );
};

const isSession = (value: unknown): value is FocusSession => {
  if (!value || typeof value !== 'object') return false;
  const session = value as Partial<FocusSession>;
  return (
    typeof session.id === 'string' &&
    (session.mode === 'countdown' || session.mode === 'stopwatch') &&
    ((session.mode === 'countdown' &&
      isFiniteNumber(session.targetSeconds) &&
      session.targetSeconds > 0) ||
      (session.mode === 'stopwatch' && session.targetSeconds === null)) &&
    isFiniteNumber(session.focusedSeconds) &&
    session.focusedSeconds >= 0 &&
    typeof session.goalText === 'string' &&
    (session.taskId === null || typeof session.taskId === 'string') &&
    typeof session.sceneId === 'string' &&
    isFiniteNumber(session.startedAt) &&
    session.startedAt >= 0 &&
    isFiniteNumber(session.endedAt) &&
    session.endedAt >= 0 &&
    (session.status === 'completed' || session.status === 'abandoned') &&
    (session.focusIntervals === undefined ||
      (Array.isArray(session.focusIntervals) &&
        session.focusIntervals.every(isFocusInterval)))
  );
};

const isActiveTimer = (value: unknown): value is ActiveTimer => {
  if (!value || typeof value !== 'object') return false;
  const timer = value as Partial<ActiveTimer>;
  return (
    typeof timer.id === 'string' &&
    (timer.mode === 'countdown' || timer.mode === 'stopwatch') &&
    ((timer.mode === 'countdown' &&
      isFiniteNumber(timer.targetSeconds) &&
      timer.targetSeconds > 0) ||
      (timer.mode === 'stopwatch' && timer.targetSeconds === null)) &&
    typeof timer.goalText === 'string' &&
    (timer.taskId === null || typeof timer.taskId === 'string') &&
    typeof timer.sceneId === 'string' &&
    isFiniteNumber(timer.startedAt) &&
    timer.startedAt >= 0 &&
    (timer.runningSince === null ||
      (isFiniteNumber(timer.runningSince) && timer.runningSince >= 0)) &&
    isFiniteNumber(timer.accumulatedSeconds) &&
    timer.accumulatedSeconds >= 0 &&
    (timer.status === 'running' || timer.status === 'paused') &&
    (timer.focusIntervals === undefined ||
      (Array.isArray(timer.focusIntervals) &&
        timer.focusIntervals.every(isFocusInterval)))
  );
};

const isBackup = (value: unknown): value is BackupPayload => {
  if (!value || typeof value !== 'object') return false;
  const payload = value as Partial<BackupPayload>;
  return (
    (payload.version === 1 ||
      payload.version === 2 ||
      payload.version === 3) &&
    Array.isArray(payload.tasks) &&
    payload.tasks.every(isTask) &&
    Array.isArray(payload.sessions) &&
    payload.sessions.every(isSession) &&
    Boolean(payload.preferences) &&
    typeof payload.preferences === 'object' &&
    (payload.version !== 3 ||
      payload.activeTimer === null ||
      isActiveTimer(payload.activeTimer))
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
      await saveActiveTimer(value.activeTimer);
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
