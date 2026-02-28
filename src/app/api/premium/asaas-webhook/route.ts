import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

// Webhook do Asaas para confirmar pagamentos Pix
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('📩 Webhook Asaas recebido:', body);

    const { event, payment } = body;

    // Eventos que indicam pagamento confirmado
    if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
      const db = await getDatabase();

      // Buscar pagamento no banco
      const paymentResult = await db.query(
        'SELECT * FROM pix_payments WHERE asaas_payment_id = $1',
        [payment.id]
      );

      const pixPayment = paymentResult.rows[0];

      if (!pixPayment) {
        console.warn('⚠️ Pagamento não encontrado no banco:', payment.id);
        return NextResponse.json({ received: true });
      }

      // Atualizar status do pagamento
      await db.query(
        'UPDATE pix_payments SET status = $1, confirmed_at = NOW() WHERE asaas_payment_id = $2',
        ['CONFIRMED', payment.id]
      );

      // Ativar premium do usuário por 30 dias
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      await db.query(
        'UPDATE users SET premium = TRUE, premium_expires_at = $1 WHERE id = $2',
        [expiresAt, pixPayment.user_id]
      );

      console.log('✅ Premium ativado via Asaas para usuário:', pixPayment.user_id);
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
