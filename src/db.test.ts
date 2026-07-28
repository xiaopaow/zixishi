import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { clearData, db, exportData, importData, loadAll, savePreferences } from './db';
import { defaultPreferences } from './data/scenes';

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
});
