export type TimerMode = 'countdown' | 'stopwatch';
export type TimerStyle = 'large' | 'compact';
export type TimerStatus = 'running' | 'paused';
export type SessionStatus = 'completed' | 'abandoned';
export type MusicType = 'piano' | 'lofi' | 'none';
export type SceneEffect =
  | 'rain'
  | 'mist'
  | 'city'
  | 'sea'
  | 'snow'
  | 'ginkgo'
  | 'train'
  | 'classroom';
export type Quality = 'high' | 'low';

export type AmbienceKey =
  | 'rain'
  | 'wind'
  | 'fire'
  | 'birds'
  | 'waves'
  | 'city'
  | 'abacus';

export interface Task {
  id: string;
  title: string;
  date: string;
  order: number;
  createdAt: number;
  completedAt: number | null;
}

export interface FocusInterval {
  startedAt: number;
  endedAt: number;
}

export interface FocusSession {
  id: string;
  mode: TimerMode;
  targetSeconds: number | null;
  focusedSeconds: number;
  goalText: string;
  taskId: string | null;
  taskTitle?: string | null;
  sceneId: string;
  startedAt: number;
  endedAt: number;
  status: SessionStatus;
  /**
   * Exact running-only wall-clock intervals. New sessions use these to split
   * focus time across local days without counting a paused interval.
   * Older imported sessions legitimately omit this field.
   */
  focusIntervals?: FocusInterval[];
}

export interface ActiveTimer {
  id: string;
  revision?: number;
  mode: TimerMode;
  targetSeconds: number | null;
  goalText: string;
  taskId: string | null;
  sceneId: string;
  startedAt: number;
  runningSince: number | null;
  accumulatedSeconds: number;
  status: TimerStatus;
  /**
   * Completed running intervals. The currently running interval begins at
   * runningSince and is appended when the timer pauses or finishes.
   */
  focusIntervals?: FocusInterval[];
  /**
   * Same-document monotonic clock anchor. It prevents a manual system-clock
   * adjustment from jumping an active timer while the page remains open.
   * Older persisted timers legitimately omit these fields and fall back to
   * wall-clock recovery.
   */
  monotonicOrigin?: number | null;
  monotonicSince?: number | null;
}

export interface SoundSettings {
  musicType: MusicType;
  musicVolume: number;
  ambienceMaster: number;
  ambience: Record<AmbienceKey, number>;
}

export interface Preferences {
  defaultMinutes: number;
  timerStyle: TimerStyle;
  selectedSceneId: string;
  sound: SoundSettings;
  sceneSounds: Record<string, SoundSettings>;
  quality: Quality;
  motionEnabled: boolean;
  notificationsEnabled: boolean;
}

export interface Scene {
  id: string;
  name: string;
  shortName: string;
  description: string;
  whisper: string;
  image: string;
  avif: string;
  imageWidth: number;
  imageHeight: number;
  poster: string;
  posterAvif: string;
  effect: SceneEffect;
  details?: {
    steam?: Array<{ x: number; y: number; scale?: number }>;
    glow?: { x: number; y: number; size?: number; color?: string };
  };
  palette: {
    primary: string;
    accent: string;
    overlay: string;
  };
  recommended: SoundSettings;
}

export interface StartFocusInput {
  mode: TimerMode;
  minutes: number;
  goalText: string;
  taskId: string | null;
  sceneId: string;
}

export interface BackupPayload {
  version: 1 | 2 | 3;
  exportedAt: number;
  tasks: Task[];
  sessions: FocusSession[];
  preferences: Preferences;
  activeTimer?: ActiveTimer | null;
}
