import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getDatabase } from '@/lib/database';
import { requireAuth } from '@/lib/auth';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID || '';
const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const db = await getDatabase();
    const dbUser = await db.get('SELECT * FROM users WHERE id = ?', [user.userId]);
    if (!dbUser) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }
    // Cria sessão de checkout Stripe para assinatura de $15 dólares
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
            unit_amount: 1500, // $15.00 em centavos
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
    return NextResponse.json({ error: 'Falha ao criar checkout' }, { status: 500 });
  }
}
