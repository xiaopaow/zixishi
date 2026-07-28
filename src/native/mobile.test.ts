import { describe, expect, it } from 'vitest';
import type { ActiveTimer } from '../types';
import { remainingCountdownSeconds } from './mobile';

const timer = (overrides: Partial<ActiveTimer> = {}): ActiveTimer => ({
  id: 'timer-1',
  revision: 0,
  mode: 'countdown',
  targetSeconds: 25 * 60,
  goalText: '完成一章阅读',
  taskId: null,
  sceneId: 'jiangnan-rain',
  startedAt: 1_000,
  runningSince: 1_000,
  accumulatedSeconds: 0,
  status: 'running',
  focusIntervals: [],
  monotonicOrigin: null,
  monotonicSince: null,
  ...overrides,
});

describe('remainingCountdownSeconds', () => {
  it('uses elapsed wall time for a running countdown', () => {
    expect(remainingCountdownSeconds(timer(), 61_000)).toBe(24 * 60);
  });

  it('uses accumulated time while paused', () => {
    expect(
      remainingCountdownSeconds(
        timer({
          runningSince: null,
          accumulatedSeconds: 125,
          status: 'paused',
        }),
        99_000,
      ),
    ).toBe(25 * 60 - 125);
  });

  it('never schedules a negative delay', () => {
    expect(remainingCountdownSeconds(timer(), 2_000_000)).toBe(0);
  });

  it('returns null for an open-ended stopwatch', () => {
    expect(
      remainingCountdownSeconds(
        timer({ mode: 'stopwatch', targetSeconds: null }),
      ),
    ).toBeNull();
  });
});
