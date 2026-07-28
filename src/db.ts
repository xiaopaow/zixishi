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
  const { tasks, sessions, preferences } = await loadAll();
  return {
    version: 2,
    exportedAt: Date.now(),
    tasks,
    sessions,
    preferences,
  };
};

const isFiniteNumber = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value);

const isTask = (value: unknown): value is Task => {
  if (!value || typeof value !== 'object') return false;
  const task = value as Partial<Task>;
  return (
    typeof task.id === 'string' &&
    typeof task.title === 'string' &&
    typeof task.date === 'string' &&
    isFiniteNumber(task.order) &&
    isFiniteNumber(task.createdAt) &&
    (task.completedAt === null || isFiniteNumber(task.completedAt))
  );
};

const isSession = (value: unknown): value is FocusSession => {
  if (!value || typeof value !== 'object') return false;
  const session = value as Partial<FocusSession>;
  return (
    typeof session.id === 'string' &&
    (session.mode === 'countdown' || session.mode === 'stopwatch') &&
    (session.targetSeconds === null || isFiniteNumber(session.targetSeconds)) &&
    isFiniteNumber(session.focusedSeconds) &&
    typeof session.goalText === 'string' &&
    (session.taskId === null || typeof session.taskId === 'string') &&
    typeof session.sceneId === 'string' &&
    isFiniteNumber(session.startedAt) &&
    isFiniteNumber(session.endedAt) &&
    (session.status === 'completed' || session.status === 'abandoned')
  );
};

const isBackup = (value: unknown): value is BackupPayload => {
  if (!value || typeof value !== 'object') return false;
  const payload = value as Partial<BackupPayload>;
  return (
    (payload.version === 1 || payload.version === 2) &&
    Array.isArray(payload.tasks) &&
    payload.tasks.every(isTask) &&
    Array.isArray(payload.sessions) &&
    payload.sessions.every(isSession) &&
    Boolean(payload.preferences) &&
    typeof payload.preferences === 'object'
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
