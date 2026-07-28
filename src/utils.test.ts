import { describe, expect, it } from 'vitest';
import type { ActiveTimer, FocusSession } from './types';
import {
  calculateStreak,
  dayTotal,
  elapsedSeconds,
  formatClock,
  monthCalendar,
  todayKey,
} from './utils';

const session = (
  endedAt: number,
  focusedSeconds: number,
): FocusSession => ({
  id: crypto.randomUUID(),
  mode: 'countdown',
  targetSeconds: focusedSeconds,
  focusedSeconds,
  goalText: '测试专注',
  taskId: null,
  sceneId: 'rain-study',
  startedAt: endedAt - focusedSeconds * 1000,
  endedAt,
  status: 'completed',
});

describe('timer utilities', () => {
  it('uses persisted accumulated time plus wall-clock delta', () => {
    const timer: ActiveTimer = {
      id: 'active',
      mode: 'countdown',
      targetSeconds: 1500,
      goalText: '读书',
      taskId: null,
      sceneId: 'rain-study',
      startedAt: 1_000,
      runningSince: 10_000,
      accumulatedSeconds: 120,
      status: 'running',
    };
    expect(elapsedSeconds(timer, 40_000)).toBe(150);
  });

  it('does not add time while paused', () => {
    const timer: ActiveTimer = {
      id: 'active',
      mode: 'stopwatch',
      targetSeconds: null,
      goalText: '写作',
      taskId: null,
      sceneId: 'bamboo-dawn',
      startedAt: 1_000,
      runningSince: null,
      accumulatedSeconds: 302,
      status: 'paused',
    };
    expect(elapsedSeconds(timer, 99_000)).toBe(302);
    expect(formatClock(302)).toBe('05:02');
  });
});

describe('focus statistics', () => {
  it('counts a streak only for days with at least ten minutes', () => {
    const now = new Date(2026, 6, 28, 12);
    const today = new Date(2026, 6, 28, 10).getTime();
    const yesterday = new Date(2026, 6, 27, 10).getTime();
    const earlier = new Date(2026, 6, 26, 10).getTime();
    expect(
      calculateStreak(
        [session(today, 600), session(yesterday, 900), session(earlier, 599)],
        now,
      ),
    ).toBe(2);
  });

  it('aggregates the selected local day', () => {
    const date = new Date(2026, 6, 28, 12);
    const sessions = [
      session(new Date(2026, 6, 28, 8).getTime(), 600),
      session(new Date(2026, 6, 28, 9).getTime(), 300),
      session(new Date(2026, 6, 27, 9).getTime(), 500),
    ];
    expect(dayTotal(sessions, todayKey(date))).toBe(900);
  });

  it('builds complete Monday-first calendar rows', () => {
    const cells = monthCalendar(new Date(2026, 6, 15));
    expect(cells.length % 7).toBe(0);
    expect(cells.some((cell) => cell.inMonth && cell.date.getDate() === 31)).toBe(true);
  });
});
