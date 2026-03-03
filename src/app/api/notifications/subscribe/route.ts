import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const subscription = (await req.json()) as {
      endpoint: string;
      keys: {
        p256dh: string;
        auth: string;
      };
    };

    if (!subscription.endpoint || !subscription.keys) {
      return NextResponse.json(
        { error: 'Invalid subscription object' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const subscriptionId = uuidv4();

    // Check if subscription already exists
    const existing = await db.query(
      'SELECT id FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2',
      [userId, subscription.endpoint]
    );

    if (existing.rows.length > 0) {
      return NextResponse.json(
        {
          success: true,
          message: 'Subscription already exists',
          subscriptionId: existing.rows[0].id,
        },
        { status: 200 }
      );
    }

    // Save subscription to database
    await db.query(
      `INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        subscriptionId,
        userId,
        subscription.endpoint,
        subscription.keys.p256dh,
        subscription.keys.auth,
      ]
    );

    return NextResponse.json(
      {
        success: true,
        message: 'Subscription successful',
        subscriptionId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    return NextResponse.json(
      { error: 'Failed to subscribe' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDatabase();

    const result = await db.query(
      'SELECT COUNT(*) as count, MAX(created_at) as last_subscribed FROM push_subscriptions WHERE user_id = $1',
      [userId]
    );

    const count = parseInt(result.rows[0].count, 10);

    return NextResponse.json({
      userId,
      subscriptionsCount: count,
      isSubscribed: count > 0,
      lastSubscribed: result.rows[0].last_subscribed,
    });
  } catch (error) {
    console.error('Error fetching subscription status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
