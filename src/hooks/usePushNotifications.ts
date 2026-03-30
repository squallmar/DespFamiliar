import { useEffect } from 'react';

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, any>;
}

export function usePushNotifications() {
  const subscribeToNotifications = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert('Navegador não suporta notificações push');
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        // Você precisa configurar VAPID keys para production
        const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidPublic) {
          console.warn(
            'VAPID public key não configurada. Notificações push não funcionarão.'
          );
          return false;
        }

        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublic),
        });
      }

      // Enviar subscription para o servidor
      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscription),
        credentials: 'include',
      });

      return response.ok;
    } catch (error) {
      console.error('Erro ao inscrever em notificações:', error);
      return false;
    }
  };

  const unsubscribeFromNotifications = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();

        // Notificar servidor
        await fetch('/api/notifications/unsubscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(subscription),
          credentials: 'include',
        });

        return true;
      }
    } catch (error) {
      console.error('Erro ao desinscrever de notificações:', error);
    }

    return false;
  };

  const sendNotification = async (payload: NotificationPayload) => {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(payload.title, {
        body: payload.body,
        icon: payload.icon || '/icon-192.png',
        badge: payload.badge || '/icon-192.png',
        tag: payload.tag || 'desp-notification',
        data: payload.data,
      });
    } catch (error) {
      console.error('Erro ao enviar notificação:', error);
    }
  };

  const requestPermission = async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  };

  return {
    subscribeToNotifications,
    unsubscribeFromNotifications,
    sendNotification,
    requestPermission,
  };
}

// Helper function
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray.buffer.slice(
    outputArray.byteOffset,
    outputArray.byteOffset + outputArray.byteLength
  ) as ArrayBuffer;
}
