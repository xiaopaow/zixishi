import Dexie, { type EntityTable } from 'dexie';
import { defaultPreferences } from './data/scenes';
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
    preferences: setting?.value ?? defaultPreferences,
    activeTimer: active?.value ?? null,
  };
};

export const savePreferences = (preferences: Preferences) =>
  db.settings.put({ key: 'preferences', value: preferences });

export const saveActiveTimer = (timer: ActiveTimer | null) =>
  timer
    ? db.active.put({ key: 'current', value: timer })
    : db.active.delete('current');

export const exportData = async (): Promise<BackupPayload> => {
  const { tasks, sessions, preferences } = await loadAll();
  return {
    version: 1,
    exportedAt: Date.now(),
    tasks,
    sessions,
    preferences,
  };
};

const isBackup = (value: unknown): value is BackupPayload => {
  if (!value || typeof value !== 'object') return false;
  const payload = value as Partial<BackupPayload>;
  return (
    payload.version === 1 &&
    Array.isArray(payload.tasks) &&
    Array.isArray(payload.sessions) &&
    Boolean(payload.preferences)
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
    await savePreferences(value.preferences);
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
