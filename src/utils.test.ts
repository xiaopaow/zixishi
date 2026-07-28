import { describe, expect, it } from 'vitest';
import type { ActiveTimer, FocusSession } from './types';
import {
  calculateStreak,
  dayTotal,
  elapsedSeconds,
  formatClock,
  monthCalendar,
  sessionDayAllocations,
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

  it('uses the monotonic clock during same-document system-time changes', () => {
    const timer: ActiveTimer = {
      id: 'clock-safe',
      mode: 'countdown',
      targetSeconds: 1500,
      goalText: '读书',
      taskId: null,
      sceneId: 'rain-study',
      startedAt: 1_000,
      runningSince: 10_000,
      accumulatedSeconds: 90,
      status: 'running',
      monotonicOrigin: 500,
      monotonicSince: 20_000,
    };
    expect(
      elapsedSeconds(timer, 3_610_000, {
        origin: 500,
        now: 50_000,
      }),
    ).toBe(120);
  });

  it('uses the monotonic epoch after a reload when the wall clock jumps', () => {
    const timer: ActiveTimer = {
      id: 'reload-clock-safe',
      mode: 'countdown',
      targetSeconds: 1500,
      goalText: '读书',
      taskId: null,
      sceneId: 'rain-study',
      startedAt: 1_000,
      runningSince: 10_000,
      accumulatedSeconds: 90,
      status: 'running',
      monotonicOrigin: 1_000,
      monotonicSince: 20_000,
    };
    expect(
      elapsedSeconds(timer, 3_610_000, {
        origin: 25_000,
        now: 26_000,
      }),
    ).toBe(120);
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

  it('allocates a cross-midnight session to both local days', () => {
    const endedAt = new Date(2026, 6, 29, 0, 10).getTime();
    const crossMidnight = session(endedAt, 20 * 60);
    const allocations = sessionDayAllocations(crossMidnight);

    expect(allocations.get('2026-07-28')).toBe(600);
    expect(allocations.get('2026-07-29')).toBe(600);
    expect(dayTotal([crossMidnight], '2026-07-28')).toBe(600);
    expect(dayTotal([crossMidnight], '2026-07-29')).toBe(600);
  });

  it('does not distribute a paused cross-midnight gap as focus time', () => {
    const startedAt = new Date(2026, 6, 28, 23, 40).getTime();
    const endedAt = new Date(2026, 6, 29, 0, 25).getTime();
    const pausedAcrossMidnight: FocusSession = {
      ...session(endedAt, 20 * 60),
      startedAt,
      focusIntervals: [
        {
          startedAt,
          endedAt: new Date(2026, 6, 28, 23, 45).getTime(),
        },
        {
          startedAt: new Date(2026, 6, 29, 0, 10).getTime(),
          endedAt,
        },
      ],
    };

    expect(dayTotal([pausedAcrossMidnight], '2026-07-28')).toBe(300);
    expect(dayTotal([pausedAcrossMidnight], '2026-07-29')).toBe(900);
  });

  it('builds complete Monday-first calendar rows', () => {
    const cells = monthCalendar(new Date(2026, 6, 15));
    expect(cells.length % 7).toBe(0);
    expect(cells.some((cell) => cell.inMonth && cell.date.getDate() === 31)).toBe(true);
  });
});
