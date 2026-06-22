'use client';
import { useEffect } from 'react';

export default function PushNotificationSetup() {
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js');
        const existing = await reg.pushManager.getSubscription();

        if (existing) {
          const sub = existing.toJSON();
          await fetch('/api/notifications/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ subscription: sub }),
          }).catch(() => {});
        }
      } catch {}
    };

    register();
  }, []);

  return null;
}
