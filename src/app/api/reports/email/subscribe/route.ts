import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email, frequency, format, categories } = (await req.json()) as {
      email: string;
      frequency: 'daily' | 'weekly' | 'monthly';
      format: 'summary' | 'detailed' | 'charts';
      categories: string[];
    };

    if (!email || !frequency || !format) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const subscriptionId = uuidv4();

    // Save subscription to database
    await db.query(
      `INSERT INTO email_subscriptions (id, user_id, email, frequency, report_format, categories, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        subscriptionId,
        userId,
        email,
        frequency,
        format,
        categories.join(','),
        true,
      ]
    );

    return NextResponse.json(
      {
        success: true,
        message: `Email reports subscribed for ${frequency} delivery`,
        subscriptionId,
        nextReport: calculateNextReportDate(frequency),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error subscribing to email reports:', error);
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
      `SELECT id, user_id, email, frequency, report_format, categories, active, subscribed_at
       FROM email_subscriptions
       WHERE user_id = $1`,
      [userId]
    );

    const subscriptions = result.rows.map((row) => ({
      userId: row.user_id,
      email: row.email,
      frequency: row.frequency,
      format: row.report_format,
      categories: row.categories ? row.categories.split(',') : [],
      active: row.active,
      subscribedAt: row.subscribed_at,
    }));

    return NextResponse.json({
      userId,
      subscriptions,
      count: subscriptions.length,
      hasActiveSubscription: subscriptions.some((s) => s.active),
    });
  } catch (error) {
    console.error('Error fetching email subscriptions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function calculateNextReportDate(frequency: string): string {
  const now = new Date();
  let next = new Date(now);

  switch (frequency) {
    case 'daily':
      next.setDate(next.getDate() + 1);
      next.setHours(9, 0, 0, 0);
      break;
    case 'weekly':
      next.setDate(next.getDate() + (1 + 7 - next.getDay()));
      next.setHours(9, 0, 0, 0);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      next.setDate(1);
      next.setHours(9, 0, 0, 0);
      break;
  }

  return next.toISOString();
}
