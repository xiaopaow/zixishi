import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ACTIVE_TIMER_CONFLICT_MESSAGE,
  clearData,
  createActiveTimer,
  db,
  exportData,
  finalizeActiveTimer,
  importData,
  loadAll,
  saveActiveTimer,
  savePreferences,
  updateActiveTimer,
} from './db';
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
    expect(backup.version).toBe(3);

    await clearData();
    await importData(backup);
    const restored = await loadAll();

    expect(restored.tasks).toHaveLength(1);
    expect(restored.tasks[0].title).toBe('整理第三章');
    expect(restored.preferences.defaultMinutes).toBe(50);
  });

  it('backs up and restores an in-progress timer', async () => {
    const startedAt = Date.now() - 420_000;
    await saveActiveTimer({
      id: 'active-1',
      mode: 'countdown',
      targetSeconds: 1500,
      goalText: '完成今日阅读',
      taskId: null,
      sceneId: 'rain-study',
      startedAt,
      runningSince: null,
      accumulatedSeconds: 420,
      status: 'paused',
      focusIntervals: [{ startedAt, endedAt: startedAt + 420_000 }],
    });

    const backup = await exportData();
    await clearData();
    await importData(backup);

    const restored = await loadAll();
    expect(restored.activeTimer?.id).toBe('active-1');
    expect(restored.activeTimer?.accumulatedSeconds).toBe(420);
    expect(restored.activeTimer?.focusIntervals).toHaveLength(1);
  });

  it('exports a running timer as a paused point-in-time snapshot', async () => {
    const now = Date.now();
    await saveActiveTimer({
      id: 'running-backup',
      revision: 0,
      mode: 'stopwatch',
      targetSeconds: null,
      goalText: '快照测试',
      taskId: null,
      sceneId: 'rain-study',
      startedAt: now - 5_000,
      runningSince: now - 5_000,
      accumulatedSeconds: 0,
      status: 'running',
      focusIntervals: [],
    });

    const backup = await exportData();
    expect(backup.activeTimer?.status).toBe('paused');
    expect(backup.activeTimer?.runningSince).toBeNull();
    expect(backup.activeTimer?.accumulatedSeconds).toBeGreaterThanOrEqual(4.9);
    expect(backup.activeTimer?.accumulatedSeconds).toBeLessThan(6);
  });

  it('prevents two tabs from replacing an existing active timer', async () => {
    const first = {
      id: 'first-timer',
      revision: 0,
      mode: 'countdown' as const,
      targetSeconds: 1500,
      goalText: '第一个计时',
      taskId: null,
      sceneId: 'rain-study',
      startedAt: 1_000,
      runningSince: 1_000,
      accumulatedSeconds: 0,
      status: 'running' as const,
      focusIntervals: [],
    };
    const second = { ...first, id: 'second-timer', goalText: '第二个计时' };
    await createActiveTimer(first);
    await expect(createActiveTimer(second)).rejects.toThrow(
      ACTIVE_TIMER_CONFLICT_MESSAGE,
    );

    expect((await loadAll()).activeTimer?.id).toBe('first-timer');
  });

  it('rejects stale timer writes and finalizes session atomically', async () => {
    const timer = {
      id: 'revision-timer',
      revision: 0,
      mode: 'countdown' as const,
      targetSeconds: 1500,
      goalText: '原子完成',
      taskId: null,
      sceneId: 'rain-study',
      startedAt: 1_000,
      runningSince: 1_000,
      accumulatedSeconds: 0,
      status: 'running' as const,
      focusIntervals: [],
    };
    await createActiveTimer(timer);
    const updated = await updateActiveTimer(timer.id, 0, {
      ...timer,
      accumulatedSeconds: 60,
      runningSince: null,
      status: 'paused',
    });
    await expect(
      updateActiveTimer(timer.id, 0, timer),
    ).rejects.toThrow('计时状态已在其他页面发生变化');

    const session = {
      id: timer.id,
      mode: timer.mode,
      targetSeconds: timer.targetSeconds,
      focusedSeconds: 60,
      goalText: timer.goalText,
      taskId: null,
      sceneId: timer.sceneId,
      startedAt: timer.startedAt,
      endedAt: 61_000,
      status: 'abandoned' as const,
    };
    await finalizeActiveTimer(timer.id, updated.revision ?? 0, session);
    const restored = await loadAll();
    expect(restored.activeTimer).toBeNull();
    expect(restored.sessions.map(({ id }) => id)).toContain(timer.id);
  });

  it('rolls back finalization if the session write fails', async () => {
    const timer = {
      id: 'rollback-timer',
      revision: 0,
      mode: 'countdown' as const,
      targetSeconds: 1500,
      goalText: '回滚测试',
      taskId: null,
      sceneId: 'rain-study',
      startedAt: 1_000,
      runningSince: null,
      accumulatedSeconds: 60,
      status: 'paused' as const,
      focusIntervals: [],
    };
    await createActiveTimer(timer);
    const write = vi
      .spyOn(db.sessions, 'put')
      .mockRejectedValueOnce(new Error('quota'));

    await expect(
      finalizeActiveTimer(timer.id, 0, {
        id: timer.id,
        mode: timer.mode,
        targetSeconds: timer.targetSeconds,
        focusedSeconds: 60,
        goalText: timer.goalText,
        taskId: null,
        sceneId: timer.sceneId,
        startedAt: timer.startedAt,
        endedAt: 61_000,
        status: 'abandoned',
      }),
    ).rejects.toThrow('quota');
    write.mockRestore();

    expect((await loadAll()).activeTimer?.id).toBe(timer.id);
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

  it('rejects negative focus durations in imported records', async () => {
    await expect(
      importData({
        version: 3,
        exportedAt: Date.now(),
        tasks: [],
        sessions: [
          {
            id: 'negative',
            mode: 'countdown',
            targetSeconds: 1500,
            focusedSeconds: -30,
            goalText: '无效记录',
            taskId: null,
            sceneId: 'rain-study',
            startedAt: 1_000,
            endedAt: 2_000,
            status: 'abandoned',
          },
        ],
        preferences: defaultPreferences,
        activeTimer: null,
      }),
    ).rejects.toThrow('备份文件格式不正确');
  });

  it('rejects focus durations that exceed the recorded wall-clock time', async () => {
    await expect(
      importData({
        version: 3,
        exportedAt: Date.now(),
        tasks: [],
        sessions: [
          {
            id: 'inflated-duration',
            mode: 'stopwatch',
            targetSeconds: null,
            focusedSeconds: 86_400,
            goalText: '异常时长记录',
            taskId: null,
            sceneId: 'rain-study',
            startedAt: 1_000,
            endedAt: 2_000,
            status: 'abandoned',
          },
        ],
        preferences: defaultPreferences,
        activeTimer: null,
      }),
    ).rejects.toThrow('备份文件格式不正确');
  });

  it('rejects duplicate ids, invalid dates and reversed chronology', async () => {
    await expect(
      importData({
        version: 3,
        exportedAt: Date.now(),
        tasks: [
          {
            id: 'duplicate',
            title: '第一项',
            date: '2026-02-30',
            order: 0,
            createdAt: 2_000,
            completedAt: 1_000,
          },
          {
            id: 'duplicate',
            title: '第二项',
            date: '2026-07-28',
            order: 1,
            createdAt: 2_000,
            completedAt: null,
          },
        ],
        sessions: [],
        preferences: defaultPreferences,
        activeTimer: null,
      }),
    ).rejects.toThrow('备份文件格式不正确');
  });

  it('rejects overlapping focus intervals', async () => {
    await expect(
      importData({
        version: 3,
        exportedAt: Date.now(),
        tasks: [],
        sessions: [
          {
            id: 'overlap',
            mode: 'stopwatch',
            targetSeconds: null,
            focusedSeconds: 90,
            goalText: '损坏的记录',
            taskId: null,
            sceneId: 'rain-study',
            startedAt: 1_000,
            endedAt: 101_000,
            status: 'abandoned',
            focusIntervals: [
              { startedAt: 1_000, endedAt: 61_000 },
              { startedAt: 51_000, endedAt: 81_000 },
            ],
          },
        ],
        preferences: defaultPreferences,
        activeTimer: null,
      }),
    ).rejects.toThrow('备份文件格式不正确');
  });

  it('rejects unknown scene ids', async () => {
    await expect(
      importData({
        version: 3,
        exportedAt: Date.now(),
        tasks: [],
        sessions: [
          {
            id: 'unknown-scene',
            mode: 'stopwatch',
            targetSeconds: null,
            focusedSeconds: 60,
            goalText: '无效场景',
            taskId: null,
            sceneId: 'not-a-scene',
            startedAt: 1_000,
            endedAt: 61_000,
            status: 'abandoned',
          },
        ],
        preferences: defaultPreferences,
        activeTimer: null,
      }),
    ).rejects.toThrow('备份文件格式不正确');
  });

  it('forces imported running timers into a paused snapshot', async () => {
    const exportedAt = Date.now();
    await importData({
      version: 3,
      exportedAt,
      tasks: [],
      sessions: [],
      preferences: defaultPreferences,
      activeTimer: {
        id: 'imported-running',
        revision: 4,
        mode: 'stopwatch',
        targetSeconds: null,
        goalText: '导入后不偷跑',
        taskId: null,
        sceneId: 'rain-study',
        startedAt: exportedAt - 5_000,
        runningSince: exportedAt - 5_000,
        accumulatedSeconds: 0,
        status: 'running',
        focusIntervals: [],
        monotonicOrigin: performance.timeOrigin - 100_000,
        monotonicSince: performance.now(),
      },
    });

    const restored = await loadAll();
    expect(restored.activeTimer?.status).toBe('paused');
    expect(restored.activeTimer?.runningSince).toBeNull();
    expect(restored.activeTimer?.accumulatedSeconds).toBeCloseTo(5, 2);
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
