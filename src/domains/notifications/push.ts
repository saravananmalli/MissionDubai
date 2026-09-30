import { supabase } from '@/lib/supabaseClient';

export type PushStatus = 'unconfigured' | 'unsupported' | 'needs-install' | 'denied' | 'off' | 'on';

/** Browsers want the VAPID public key as bytes, but it is stored as base64url text. */
export function urlBase64ToUint8Array(base64Url: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

interface Environment {
  hasServiceWorker: boolean;
  hasPushManager: boolean;
  hasNotification: boolean;
  isIos: boolean;
  isStandalone: boolean;
  permission: NotificationPermission | 'none';
  hasSubscription: boolean;
  vapidKey: string | undefined;
}

/** Pure decision table so every state the user can be in is unit-testable. */
export function decidePushStatus(env: Environment): PushStatus {
  if (!env.vapidKey) return 'unconfigured';
  // iPhone Safari only exposes push to a site added to the Home Screen.
  if (env.isIos && !env.isStandalone) return 'needs-install';
  if (!env.hasServiceWorker || !env.hasPushManager || !env.hasNotification) return 'unsupported';
  if (env.permission === 'denied') return 'denied';
  return env.permission === 'granted' && env.hasSubscription ? 'on' : 'off';
}

export function readEnvironment(vapidKey: string | undefined, hasSubscription: boolean): Environment {
  const ua = navigator.userAgent;
  return {
    hasServiceWorker: 'serviceWorker' in navigator,
    hasPushManager: 'PushManager' in window,
    hasNotification: 'Notification' in window,
    isIos: /iPad|iPhone|iPod/.test(ua) || (ua.includes('Mac') && navigator.maxTouchPoints > 1),
    isStandalone:
      window.matchMedia?.('(display-mode: standalone)').matches === true ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true,
    permission: 'Notification' in window ? Notification.permission : 'none',
    hasSubscription,
    vapidKey,
  };
}

async function getRegistration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration();
  if (existing) return existing;
  await navigator.serviceWorker.register('/sw.js');
  return navigator.serviceWorker.ready;
}

export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator)) return null;
  const registration = await navigator.serviceWorker.getRegistration();
  return registration ? registration.pushManager.getSubscription() : null;
}

export async function subscribeToReminders(vapidKey: string): Promise<void> {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('permission-denied');

  const registration = await getRegistration();
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    }));

  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) throw new Error('bad-subscription');

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({ endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth }, { onConflict: 'endpoint' });
  if (error) throw error;

  // Immediate local confirmation so you know it works without waiting until 1 PM.
  await registration.showNotification('Reminders are on', {
    body: "You'll get a nudge to log your expenses at 1:00 PM and 8:00 PM.",
    icon: '/icon-192.png',
    data: { url: '/expenses' },
  });
}

export async function unsubscribeFromReminders(): Promise<void> {
  const subscription = await getCurrentSubscription();
  if (!subscription) return;
  const { endpoint } = subscription;
  await subscription.unsubscribe();
  const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
  if (error) throw error;
}
