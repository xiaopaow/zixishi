import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';
import { clearData, db, exportData, importData, loadAll, savePreferences } from './db';
import { defaultPreferences, scenes } from './data/scenes';

afterEach(async () => {
  await clearData();
});

describe('local backup', () => {
  it('exports and restores tasks and preferences', async () => {
    await db.tasks.add({
      id: 'task-1',
      title: '整理第三章',
      date: '2026-07-28',
      order: 0,
      createdAt: 1,
      completedAt: null,
    });
    await savePreferences({ ...defaultPreferences, defaultMinutes: 50 });
    const backup = await exportData();
    expect(backup.version).toBe(2);

    await clearData();
    await importData(backup);
    const restored = await loadAll();

    expect(restored.tasks).toHaveLength(1);
    expect(restored.tasks[0].title).toBe('整理第三章');
    expect(restored.preferences.defaultMinutes).toBe(50);
  });

  it('rejects unknown backup formats', async () => {
    await expect(importData({ version: 99 })).rejects.toThrow('备份文件格式不正确');
  });

  it('rejects malformed rows instead of partially replacing local data', async () => {
    await expect(
      importData({
        version: 2,
        exportedAt: Date.now(),
        tasks: [{ id: 'broken' }],
        sessions: [],
        preferences: defaultPreferences,
      }),
    ).rejects.toThrow('备份文件格式不正确');
  });

  it('upgrades legacy sound preferences to per-scene presets', async () => {
    const legacy = {
      defaultMinutes: 25,
      timerStyle: 'compact',
      selectedSceneId: 'city-loft',
      sound: {
        ...defaultPreferences.sound,
        musicType: 'lofi' as const,
        musicVolume: 0.42,
      },
      quality: 'low',
      motionEnabled: false,
      notificationsEnabled: false,
    };

    await importData({
      version: 1,
      exportedAt: Date.now(),
      tasks: [],
      sessions: [],
      preferences: legacy,
    });
    const restored = await loadAll();

    expect(restored.preferences.sound.musicVolume).toBe(0.42);
    expect(Object.keys(restored.preferences.sceneSounds)).toEqual(
      scenes.map((scene) => scene.id),
    );
    expect(restored.preferences.sceneSounds['city-loft'].musicVolume).toBe(0.42);
  });

  it('runs the IndexedDB v1 to v2 settings migration', async () => {
    db.close();
    await Dexie.delete('qishi-focus-v1');

    const legacyDb = new Dexie('qishi-focus-v1');
    legacyDb.version(1).stores({
      tasks: 'id, date, order, completedAt',
      sessions: 'id, endedAt, sceneId, status, taskId',
      settings: 'key',
      active: 'key',
    });
    await legacyDb.table('settings').put({
      key: 'preferences',
      value: {
        defaultMinutes: 50,
        timerStyle: 'large',
        selectedSceneId: 'bamboo-dawn',
        sound: {
          ...defaultPreferences.sound,
          musicVolume: 0.31,
        },
        quality: 'high',
        motionEnabled: true,
        notificationsEnabled: false,
      },
    });
    legacyDb.close();

    await db.open();
    const restored = await loadAll();
    expect(restored.preferences.defaultMinutes).toBe(50);
    expect(restored.preferences.sceneSounds['bamboo-dawn'].musicVolume).toBe(0.31);
  });
});
