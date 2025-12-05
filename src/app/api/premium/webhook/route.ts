import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getDatabase } from '@/lib/database';

// Garante que a variável existe
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("❌ STRIPE_SECRET_KEY não configurada no ambiente");
}

if (!process.env.STRIPE_WEBHOOK_SECRET) {
  throw new Error("❌ STRIPE_WEBHOOK_SECRET não configurada no ambiente");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

// Stripe webhook endpoint
export async function POST(request: NextRequest) {
  const sig = request.headers.get("stripe-signature") || "";
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

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
