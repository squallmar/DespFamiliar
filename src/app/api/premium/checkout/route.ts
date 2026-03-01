import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getDatabase } from '@/lib/database';
import { requireAuth } from '@/lib/auth';

function getStripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) {
    return null;
  }

  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-11-17.clover',
  });
}

export async function POST(request: NextRequest) {
  try {
    const stripe = getStripeClient();
    if (!stripe) {
      return NextResponse.json(
        { error: 'STRIPE_SECRET_KEY não configurada no ambiente' },
        { status: 500 }
      );
    }

    const user = requireAuth(request);

    const db = await getDatabase();

    const result = await db.query(
      'SELECT * FROM users WHERE id = $1',
      [user.userId]
    );

    const dbUser = result.rows[0];

    if (!dbUser) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: dbUser.email,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Assinatura Premium DespFamiliar',
            },
            unit_amount: 1500,
            recurring: { interval: 'month' },
          },
          quantity: 1,
        },
      ],
      success_url: `${request.nextUrl.origin}/premium/success`,
      cancel_url: `${request.nextUrl.origin}/premium/cancel`,
      metadata: {
        userId: dbUser.id,
      },
    });

    return NextResponse.json({ url: session.url });

  } catch (error) {
    console.error('Erro ao criar checkout Stripe:', error);
    return NextResponse.json(
      { error: 'Falha ao criar checkout' },
      { status: 500 }
    );
  }
}
