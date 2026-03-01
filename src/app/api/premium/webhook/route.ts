import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getDatabase } from '@/lib/database';

function getStripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) {
    return null;
  }

  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-11-17.clover'
  });
}

// Stripe webhook endpoint
export async function POST(request: NextRequest) {
  const stripe = getStripeClient();
  if (!stripe) {
    return NextResponse.json({ error: 'STRIPE_SECRET_KEY não configurada no ambiente' }, { status: 500 });
  }

  const sig = request.headers.get("stripe-signature") || "";
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: 'STRIPE_WEBHOOK_SECRET não configurada no ambiente' }, { status: 500 });
  }

  let event;

  try {
    const buf = await request.arrayBuffer();
    event = stripe.webhooks.constructEvent(
      Buffer.from(buf),
      sig,
      webhookSecret!
    );
  } catch (err) {
    console.error("❌ Erro na verificação do webhook Stripe:", err);
    return NextResponse.json({ error: "Webhook Error" }, { status: 400 });
  }

  // Evento de pagamento concluído
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const userId = session.metadata?.userId;

    if (userId) {
      const db = await getDatabase();

      await db.query(
        "UPDATE users SET premium = TRUE WHERE id = $1",
        [userId]
      );

      console.log("✅ Usuário premium ativado:", userId);
    }
  }

  return NextResponse.json({ received: true });
}
