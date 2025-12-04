import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getDatabase } from '@/lib/database';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const stripe = new Stripe(STRIPE_SECRET_KEY);


// Stripe webhook endpoint
export async function POST(request: NextRequest) {
  const sig = request.headers.get('stripe-signature') || '';
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

  let event;

  try {
    const buf = await request.arrayBuffer();
    event = stripe.webhooks.constructEvent(Buffer.from(buf), sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed.', err);
    return NextResponse.json({ error: 'Webhook Error' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;

    if (userId) {
      const db = await getDatabase();

      // PostgreSQL usa $1 placeholders
      await db.query(
        'UPDATE users SET premium = TRUE WHERE id = $1',
        [userId]
      );

      console.log('Usuário premium ativado:', userId);
    }
  }

  return NextResponse.json({ received: true });
}
