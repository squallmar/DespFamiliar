import webpush from 'web-push';
import { getDatabase } from './database';

let vapidConfigured = false;

/**
 * Initialize VAPID keys for Web Push API
 */
export function initializeVapid() {
  if (vapidConfigured) return;

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@despfamiliar.com';

  if (!publicKey || !privateKey) {
    console.warn(
      'VAPID keys not configured. Push notifications will not work. Run: npx web-push generate-vapid-keys'
    );
    return;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
  console.log('✓ VAPID configured for push notifications');
}

/**
 * Get VAPID public key for client subscription
 */
export function getVapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY || null;
}

/**
 * Check if push notifications are configured
 */
export function isPushConfigured(): boolean {
  return !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

/**
 * Send push notification to a user
 */
export async function sendPushNotification(
  userId: string,
  notification: {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    data?: Record<string, any>;
    actions?: Array<{ action: string; title: string }>;
  }
): Promise<{ sent: number; failed: number }> {
  if (!vapidConfigured) {
    initializeVapid();
  }

  if (!vapidConfigured) {
    throw new Error('Push notifications not configured');
  }

  const db = await getDatabase();

  // Get all subscriptions for the user
  const result = await db.query(
    'SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1',
    [userId]
  );

  if (result.rows.length === 0) {
    return { sent: 0, failed: 0 };
  }

  const payload = JSON.stringify({
    title: notification.title,
    body: notification.body,
    icon: notification.icon || '/icon-192.png',
    badge: notification.badge || '/badge-72.png',
    data: notification.data || {},
    actions: notification.actions || [],
  });

  let sent = 0;
  let failed = 0;

  // Send to all user's devices
  for (const subscription of result.rows) {
    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth,
          },
        },
        payload
      );
      sent++;
    } catch (error: any) {
      console.error('Error sending push notification:', error);
      failed++;

      // Remove expired subscriptions
      if (error.statusCode === 410 || error.statusCode === 404) {
        await db.query(
          'DELETE FROM push_subscriptions WHERE endpoint = $1',
          [subscription.endpoint]
        );
      }
    }
  }

  return { sent, failed };
}

/**
 * Send push notification to multiple users
 */
export async function sendBulkPushNotification(
  userIds: string[],
  notification: {
    title: string;
    body: string;
    icon?: string;
    data?: Record<string, any>;
  }
): Promise<{ totalSent: number; totalFailed: number }> {
  let totalSent = 0;
  let totalFailed = 0;

  for (const userId of userIds) {
    try {
      const result = await sendPushNotification(userId, notification);
      totalSent += result.sent;
      totalFailed += result.failed;
    } catch (error) {
      console.error(`Failed to send notification to user ${userId}:`, error);
      totalFailed++;
    }
  }

  return { totalSent, totalFailed };
}

/**
 * Notify user about budget alert
 */
export async function notifyBudgetAlert(
  userId: string,
  category: string,
  percentage: number,
  spent: number,
  limit: number
) {
  const severity = percentage >= 90 ? 'critical' : 'warning';
  const emoji = severity === 'critical' ? '🚨' : '⚠️';

  return sendPushNotification(userId, {
    title: `${emoji} Alerta de Orçamento: ${category}`,
    body: `Você atingiu ${percentage}% do seu orçamento (R$ ${spent.toFixed(2)} / R$ ${limit.toFixed(2)})`,
    icon: '/icons/budget-alert.png',
    data: {
      type: 'budget_alert',
      category,
      percentage,
      severity,
    },
    actions: [
      { action: 'view', title: 'Ver Detalhes' },
      { action: 'dismiss', title: 'Dispensar' },
    ],
  });
}

/**
 * Notify user about new AI insight
 */
export async function notifyNewInsight(
  userId: string,
  insight: {
    title: string;
    description: string;
    impact: number;
  }
) {
  return sendPushNotification(userId, {
    title: `💡 Nova Oportunidade: ${insight.title}`,
    body: `${insight.description} (Economia estimada: R$ ${insight.impact.toFixed(2)})`,
    icon: '/icons/insight.png',
    data: {
      type: 'insight',
      impact: insight.impact,
    },
    actions: [{ action: 'view', title: 'Ver Insight' }],
  });
}

/**
 * Notify user about detected anomaly
 */
export async function notifyAnomaly(
  userId: string,
  anomaly: {
    category: string;
    amount: number;
    severity: string;
    description: string;
  }
) {
  const emoji = anomaly.severity === 'high' ? '🔴' : '🟡';

  return sendPushNotification(userId, {
    title: `${emoji} Gasto Anormal Detectado`,
    body: `${anomaly.category}: R$ ${anomaly.amount.toFixed(2)} - ${anomaly.description}`,
    icon: '/icons/anomaly.png',
    data: {
      type: 'anomaly',
      category: anomaly.category,
      severity: anomaly.severity,
    },
    actions: [{ action: 'review', title: 'Revisar' }],
  });
}

// Initialize VAPID on module load
initializeVapid();
