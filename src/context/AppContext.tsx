import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { db, loadAll, saveActiveTimer, savePreferences } from '../db';
import { normalizePreferences } from '../data/scenes';
import type {
  ActiveTimer,
  FocusSession,
  Preferences,
  SessionStatus,
  StartFocusInput,
  Task,
} from '../types';
import { elapsedSeconds, monotonicAnchor, todayKey } from '../utils';

interface AppContextValue {
  ready: boolean;
  tasks: Task[];
  sessions: FocusSession[];
  preferences: Preferences;
  activeTimer: ActiveTimer | null;
  addTask: (title: string) => Promise<void>;
  renameTask: (id: string, title: string) => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  moveTask: (id: string, direction: -1 | 1) => Promise<void>;
  updatePreferences: (next: Preferences) => Promise<void>;
  startFocus: (input: StartFocusInput) => Promise<ActiveTimer>;
  pauseFocus: () => Promise<void>;
  resumeFocus: () => Promise<void>;
  changeActiveScene: (sceneId: string) => Promise<void>;
  finishFocus: (
    status: SessionStatus,
    shouldSave: boolean,
  ) => Promise<FocusSession | null>;
  refresh: () => Promise<void>;
  resetState: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const closeRunningInterval = (
  timer: ActiveTimer,
  totalElapsedSeconds: number,
) => {
  if (!timer.focusIntervals || timer.runningSince === null) {
    return timer.focusIntervals;
  }
  const liveSeconds = Math.max(
    0,
    totalElapsedSeconds - timer.accumulatedSeconds,
  );
  if (liveSeconds <= 0) return timer.focusIntervals;
  return [
    ...timer.focusIntervals,
    {
      startedAt: timer.runningSince,
      endedAt: timer.runningSince + liveSeconds * 1000,
    },
  ];
};

export function AppProvider({ children }: PropsWithChildren) {
  const [ready, setReady] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [preferences, setPreferencesState] =
    useState<Preferences>(() => normalizePreferences(undefined));
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);

  const refresh = useCallback(async () => {
    const data = await loadAll();
    setTasks(data.tasks);
    setSessions(data.sessions);
    setPreferencesState(data.preferences);
    if (data.activeTimer?.status === 'running') {
      const now = Date.now();
      const recoveredElapsed = elapsedSeconds(data.activeTimer, now);
      const rebased = {
        ...data.activeTimer,
        accumulatedSeconds: recoveredElapsed,
        focusIntervals: closeRunningInterval(
          data.activeTimer,
          recoveredElapsed,
        ),
        runningSince: now,
        ...monotonicAnchor(),
      };
      await saveActiveTimer(rebased);
      setActiveTimer(rebased);
    } else {
      setActiveTimer(data.activeTimer);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addTask = useCallback(
    async (title: string) => {
      const clean = title.trim();
      if (!clean) return;
      const currentDay = todayKey();
      const maxOrder = tasks
        .filter((task) => task.date === currentDay)
        .reduce((max, task) => Math.max(max, task.order), -1);
      const task: Task = {
        id: crypto.randomUUID(),
        title: clean.slice(0, 80),
        date: currentDay,
        order: maxOrder + 1,
        createdAt: Date.now(),
        completedAt: null,
      };
      await db.tasks.add(task);
      setTasks((current) => [...current, task]);
    },
    [tasks],
  );

  const renameTask = useCallback(async (id: string, title: string) => {
    const clean = title.trim();
    if (!clean) return;
    const nextTitle = clean.slice(0, 80);
    await db.tasks.update(id, { title: nextTitle });
    setTasks((current) =>
      current.map((task) =>
        task.id === id ? { ...task, title: nextTitle } : task,
      ),
    );
  }, []);

  const toggleTask = useCallback(async (id: string) => {
    const task = await db.tasks.get(id);
    if (!task) return;
    const completedAt = task.completedAt ? null : Date.now();
    await db.tasks.update(id, { completedAt });
    setTasks((current) =>
      current.map((item) => (item.id === id ? { ...item, completedAt } : item)),
    );
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    await db.tasks.delete(id);
    setTasks((current) => current.filter((task) => task.id !== id));
  }, []);

  const moveTask = useCallback(
    async (id: string, direction: -1 | 1) => {
      const day = todayKey();
      const ordered = tasks
        .filter((task) => task.date === day)
        .sort((a, b) => a.order - b.order);
      const index = ordered.findIndex((task) => task.id === id);
      const swapIndex = index + direction;
      if (index < 0 || swapIndex < 0 || swapIndex >= ordered.length) return;
      const currentTask = ordered[index];
      const swapTask = ordered[swapIndex];
      await db.transaction('rw', db.tasks, async () => {
        await db.tasks.update(currentTask.id, { order: swapTask.order });
        await db.tasks.update(swapTask.id, { order: currentTask.order });
      });
      setTasks((current) =>
        current.map((task) => {
          if (task.id === currentTask.id) return { ...task, order: swapTask.order };
          if (task.id === swapTask.id) return { ...task, order: currentTask.order };
          return task;
        }),
      );
    },
    [tasks],
  );

  const updatePreferences = useCallback(async (next: Preferences) => {
    const normalized = normalizePreferences(next);
    setPreferencesState(normalized);
    await savePreferences(normalized);
  }, []);

  const startFocus = useCallback(async (input: StartFocusInput) => {
    const now = Date.now();
    const timer: ActiveTimer = {
      id: crypto.randomUUID(),
      mode: input.mode,
      targetSeconds:
        input.mode === 'countdown' ? Math.max(60, input.minutes * 60) : null,
      goalText: input.goalText.trim().slice(0, 120) || '安静完成眼前这一件事',
      taskId: input.taskId,
      sceneId: input.sceneId,
      startedAt: now,
      runningSince: now,
      accumulatedSeconds: 0,
      status: 'running',
      focusIntervals: [],
      ...monotonicAnchor(),
    };
    await saveActiveTimer(timer);
    setActiveTimer(timer);
    return timer;
  }, []);

  const pauseFocus = useCallback(async () => {
    if (!activeTimer || activeTimer.status !== 'running') return;
    const now = Date.now();
    const accumulatedSeconds = elapsedSeconds(activeTimer, now);
    const next: ActiveTimer = {
      ...activeTimer,
      accumulatedSeconds,
      focusIntervals: closeRunningInterval(
        activeTimer,
        accumulatedSeconds,
      ),
      runningSince: null,
      status: 'paused',
      monotonicOrigin: null,
      monotonicSince: null,
    };
    await saveActiveTimer(next);
    setActiveTimer(next);
  }, [activeTimer]);

  const resumeFocus = useCallback(async () => {
    if (!activeTimer || activeTimer.status !== 'paused') return;
    const next: ActiveTimer = {
      ...activeTimer,
      runningSince: Date.now(),
      status: 'running',
      ...monotonicAnchor(),
    };
    await saveActiveTimer(next);
    setActiveTimer(next);
  }, [activeTimer]);

  const changeActiveScene = useCallback(
    async (sceneId: string) => {
      if (!activeTimer) return;
      const next = { ...activeTimer, sceneId };
      await saveActiveTimer(next);
      setActiveTimer(next);
    },
    [activeTimer],
  );

  const finishFocus = useCallback(
    async (status: SessionStatus, shouldSave: boolean) => {
      if (!activeTimer) return null;
      const endedAt = Date.now();
      const rawElapsed = elapsedSeconds(activeTimer, endedAt);
      const focusIntervals =
        activeTimer.status === 'running'
          ? closeRunningInterval(activeTimer, rawElapsed)
          : activeTimer.focusIntervals;
      const focusedSeconds =
        activeTimer.mode === 'countdown' && status === 'completed'
          ? activeTimer.targetSeconds ?? rawElapsed
          : rawElapsed;
      let session: FocusSession | null = null;
      if (shouldSave && focusedSeconds >= 60) {
        session = {
          id: activeTimer.id,
          mode: activeTimer.mode,
          targetSeconds: activeTimer.targetSeconds,
          focusedSeconds: Math.floor(focusedSeconds),
          goalText: activeTimer.goalText,
          taskId: activeTimer.taskId,
          taskTitle:
            tasks.find((task) => task.id === activeTimer.taskId)?.title ?? null,
          sceneId: activeTimer.sceneId,
          startedAt: activeTimer.startedAt,
          endedAt,
          status,
          focusIntervals,
        };
        await db.sessions.put(session);
        setSessions((current) => [session!, ...current]);
      }
      await saveActiveTimer(null);
      setActiveTimer(null);
      return session;
    },
    [activeTimer, tasks],
  );

  const resetState = useCallback(() => {
    setTasks([]);
    setSessions([]);
    setPreferencesState(normalizePreferences(undefined));
    setActiveTimer(null);
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      ready,
      tasks,
      sessions,
      preferences,
      activeTimer,
      addTask,
      renameTask,
      toggleTask,
      deleteTask,
      moveTask,
      updatePreferences,
      startFocus,
      pauseFocus,
      resumeFocus,
      changeActiveScene,
      finishFocus,
      refresh,
      resetState,
    }),
    [
      ready,
      tasks,
      sessions,
      preferences,
      activeTimer,
      addTask,
      renameTask,
      toggleTask,
      deleteTask,
      moveTask,
      updatePreferences,
      startFocus,
      pauseFocus,
      resumeFocus,
      changeActiveScene,
      finishFocus,
      refresh,
      resetState,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp must be used inside AppProvider');
  return value;
};
