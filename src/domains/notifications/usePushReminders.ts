import { useCallback, useEffect, useState } from 'react';
import { env } from '@/lib/env';
import {
  decidePushStatus,
  getCurrentSubscription,
  readEnvironment,
  subscribeToReminders,
  unsubscribeFromReminders,
  type PushStatus,
} from '@/domains/notifications/push';

export function usePushReminders() {
  const [status, setStatus] = useState<PushStatus>('off');
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const subscription = await getCurrentSubscription().catch(() => null);
    setStatus(decidePushStatus(readEnvironment(env.VITE_VAPID_PUBLIC_KEY, subscription !== null)));
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const enable = useCallback(async () => {
    if (!env.VITE_VAPID_PUBLIC_KEY) return;
    setIsBusy(true);
    setError(null);
    try {
      await subscribeToReminders(env.VITE_VAPID_PUBLIC_KEY);
    } catch (e) {
      if (!(e instanceof Error && e.message === 'permission-denied')) {
        setError("Couldn't turn on reminders. Check your connection and try again.");
      }
    } finally {
      setIsBusy(false);
      await refresh();
    }
  }, [refresh]);

  const disable = useCallback(async () => {
    setIsBusy(true);
    setError(null);
    try {
      await unsubscribeFromReminders();
    } catch {
      setError("Couldn't turn off reminders. Check your connection and try again.");
    } finally {
      setIsBusy(false);
      await refresh();
    }
  }, [refresh]);

  return { status, isBusy, error, enable, disable };
}
