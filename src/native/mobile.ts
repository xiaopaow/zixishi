import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Share } from '@capacitor/share';
import type { ActiveTimer } from '../types';
import { elapsedSeconds } from '../utils';

const FOCUS_COMPLETION_NOTIFICATION_ID = 7319;
let reminderQueue: Promise<boolean> = Promise.resolve(false);

export const NATIVE_FOCUS_BACK_EVENT = 'qishi:native-focus-back';
export const isNativeApp = Capacitor.isNativePlatform();

export const remainingCountdownSeconds = (
  timer: ActiveTimer,
  now = Date.now(),
) =>
  timer.mode === 'countdown' && timer.targetSeconds
    ? Math.max(0, timer.targetSeconds - elapsedSeconds(timer, now))
    : null;

export async function requestCompletionNotificationPermission() {
  if (!isNativeApp) return false;
  try {
    const current = await LocalNotifications.checkPermissions();
    if (current.display === 'granted') return true;
    const requested = await LocalNotifications.requestPermissions();
    return requested.display === 'granted';
  } catch {
    return false;
  }
}

const reconcileFocusCompletionNotification = async (
  timer: ActiveTimer | null,
  now = Date.now(),
) => {
  if (!isNativeApp) return false;

  try {
    await LocalNotifications.cancel({
      notifications: [{ id: FOCUS_COMPLETION_NOTIFICATION_ID }],
    });
  } catch {
    // Continue: a stale or missing notification must not block reconciliation.
  }

  if (!timer || timer.status !== 'running') return true;
  const remaining = remainingCountdownSeconds(timer, now);
  if (remaining === null || remaining <= 0) return false;

  try {
    const permission = await LocalNotifications.checkPermissions();
    if (permission.display !== 'granted') return false;
    await LocalNotifications.schedule({
      notifications: [
        {
          id: FOCUS_COMPLETION_NOTIFICATION_ID,
          title: '这一段专注完成了',
          body:
            timer.goalText ||
            '你把时间认真地放在了重要的事情上。',
          schedule: {
            at: new Date(now + Math.max(1, remaining) * 1000),
            allowWhileIdle: true,
          },
          smallIcon: 'ic_stat_qishi',
          iconColor: '#e5bd78',
          extra: {
            route: '/focus',
            timerId: timer.id,
          },
        },
      ],
    });
    return true;
  } catch {
    return false;
  }
};

const queueReminderReconciliation = (
  timer: ActiveTimer | null,
  now = Date.now(),
) => {
  const next = reminderQueue.then(
    () => reconcileFocusCompletionNotification(timer, now),
    () => reconcileFocusCompletionNotification(timer, now),
  );
  reminderQueue = next.catch(() => false);
  return next;
};

export async function cancelFocusCompletionNotification() {
  await queueReminderReconciliation(null);
}

export function scheduleFocusCompletionNotification(
  timer: ActiveTimer,
  now = Date.now(),
) {
  return queueReminderReconciliation(timer, now);
}

export async function shareNativeBackup(
  filename: string,
  contents: string,
) {
  if (!isNativeApp) return false;
  try {
    const written = await Filesystem.writeFile({
      path: filename,
      data: contents,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
      recursive: true,
    });
    await Share.share({
      title: '栖时本机数据备份',
      text: '保存或分享这份 JSON 文件，之后可在栖时中恢复。',
      url: written.uri,
      dialogTitle: '保存栖时备份',
    });
    return true;
  } catch {
    return false;
  }
}
