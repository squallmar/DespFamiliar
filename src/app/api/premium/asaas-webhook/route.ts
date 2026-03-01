import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

const ASAAS_WEBHOOK_TOKEN = process.env.ASAAS_WEBHOOK_TOKEN;

// Webhook do Asaas para confirmar pagamentos Pix e assinaturas
export async function POST(request: NextRequest) {
  try {
    if (!ASAAS_WEBHOOK_TOKEN) {
      return NextResponse.json({ error: 'Webhook token não configurado' }, { status: 503 });
    }

    const incomingToken = request.headers.get('asaas-access-token');
    if (!incomingToken || incomingToken !== ASAAS_WEBHOOK_TOKEN) {
      return NextResponse.json({ error: 'Assinatura do webhook inválida' }, { status: 401 });
    }

    const body = await request.json();

    const { event, payment, subscription } = body;

    // Eventos que indicam pagamento confirmado
    if ((event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') && payment) {
      const db = await getDatabase();

      // Buscar pelo ID de pagamento ou pela subscription linked
      let pixPayment = null;
      
      if (payment.externalReference?.includes('premium-subscription')) {
        // Buscar por assinatura via pagamento
        const subscriptionMatch = payment.externalReference.match(/premium-subscription-(.+?)-/);
        if (subscriptionMatch) {
          const userId = subscriptionMatch[1];
          const result = await db.query(
            'SELECT * FROM pix_payments WHERE user_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT 1',
            [userId, 'PENDING']
          );
          pixPayment = result.rows[0];
        }
      }

      if (!pixPayment) {
        console.warn('⚠️ Pagamento não encontrado no banco:', payment.id);
        return NextResponse.json({ received: true });
      }

      // Atualizar status e ativar premium (renovação mensal)
      await db.query(
        'UPDATE pix_payments SET status = $1, confirmed_at = NOW(), next_due_date = $2 WHERE id = $3',
        ['CONFIRMED', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), pixPayment.id]
      );

      // Ativar premium do usuário infinito (assinatura ativa)
      await db.query(
        'UPDATE users SET premium = TRUE WHERE id = $1',
        [pixPayment.user_id]
      );

      console.log('✅ Premium ativado via Asaas para usuário:', pixPayment.user_id);
    }

    // Evento de assinatura cancelada
    if ((event === 'SUBSCRIPTION_CANCELED_BY_CUSTOMER' || event === 'SUBSCRIPTION_DELETED') && subscription?.id) {
      const db = await getDatabase();

      // Atualizar assinatura como cancelada
      await db.query(
        'UPDATE pix_payments SET status = $1, cancelled_at = NOW() WHERE asaas_subscription_id = $2',
        ['CANCELLED', subscription.id]
      );

      console.log('❌ Assinatura cancelada:', subscription.id);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('❌ Erro no webhook Asaas:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
