import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { subscriptionId } = (await req.json()) as { subscriptionId: string };

    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'subscriptionId is required' },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    // Check if subscription belongs to user
    const check = await db.query(
      'SELECT id FROM email_subscriptions WHERE id = $1 AND user_id = $2',
      [subscriptionId, userId]
    );

    if (check.rows.length === 0) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }

    // Delete subscription
    await db.query(
      'DELETE FROM email_subscriptions WHERE id = $1 AND user_id = $2',
      [subscriptionId, userId]
    );

    return NextResponse.json({
      success: true,
      message: 'Unsubscribed from email reports',
    });
  } catch (error) {
    console.error('Error unsubscribing from email reports:', error);
    return NextResponse.json(
      { error: 'Failed to unsubscribe' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDatabase();

    // Delete all email subscriptions for user
    await db.query(
      'DELETE FROM email_subscriptions WHERE user_id = $1',
      [userId]
    );

    return NextResponse.json({
      success: true,
      message: 'All email report subscriptions removed',
    });
  } catch (error) {
    console.error('Error deleting email subscriptions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
