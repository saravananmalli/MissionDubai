import { describe, expect, it } from 'vitest';
import { decidePushStatus, urlBase64ToUint8Array } from '@/domains/notifications/push';
import { getReminderMessage, isReminderSlot } from '../../../../supabase/functions/send-reminders/messages';

const base = {
  hasServiceWorker: true,
  hasPushManager: true,
  hasNotification: true,
  isIos: false,
  isStandalone: false,
  permission: 'default' as const,
  hasSubscription: false,
  vapidKey: 'key',
};

describe('decidePushStatus', () => {
  it('is unconfigured without a VAPID key', () => {
    expect(decidePushStatus({ ...base, vapidKey: undefined })).toBe('unconfigured');
  });
  it('asks iPhone users to install to the Home Screen first', () => {
    expect(decidePushStatus({ ...base, isIos: true })).toBe('needs-install');
    expect(decidePushStatus({ ...base, isIos: true, isStandalone: true })).toBe('off');
  });
  it('reports unsupported browsers', () => {
    expect(decidePushStatus({ ...base, hasPushManager: false })).toBe('unsupported');
  });
  it('reports denied permission', () => {
    expect(decidePushStatus({ ...base, permission: 'denied' })).toBe('denied');
  });
  it('is on only with granted permission AND a live subscription', () => {
    expect(decidePushStatus({ ...base, permission: 'granted', hasSubscription: true })).toBe('on');
    expect(decidePushStatus({ ...base, permission: 'granted', hasSubscription: false })).toBe('off');
  });
});

describe('urlBase64ToUint8Array', () => {
  it('decodes base64url with missing padding', () => {
    expect(Array.from(urlBase64ToUint8Array('AQID'))).toEqual([1, 2, 3]);
    expect(Array.from(urlBase64ToUint8Array('-_8'))).toEqual([251, 255]);
  });
});

describe('reminder messages', () => {
  it('validates the slot', () => {
    expect(isReminderSlot('afternoon')).toBe(true);
    expect(isReminderSlot('evening')).toBe(true);
    expect(isReminderSlot('morning')).toBe(false);
    expect(isReminderSlot(undefined)).toBe(false);
  });
  it('both reminders deep-link to the expense log flow with a Log Expense button', () => {
    for (const slot of ['afternoon', 'evening'] as const) {
      const message = getReminderMessage(slot);
      expect(message.url).toBe('/expenses?add=1');
      expect(message.actionLabel).toBe('Log Expense');
    }
    expect(getReminderMessage('afternoon').body).toBe("Don't forget to log your expenses today.");
    expect(getReminderMessage('afternoon').tag).not.toBe(getReminderMessage('evening').tag);
  });
});
