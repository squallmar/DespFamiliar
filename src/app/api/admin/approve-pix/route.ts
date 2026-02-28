import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { requireAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const { paymentId, userId } = await request.json();

    // Verificar se é admin
    const db = await getDatabase();
    const adminCheck = await db.query('SELECT admin FROM users WHERE id = $1', [user.userId]);
    
    if (!adminCheck.rows[0]?.admin) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Atualizar pagamento
    await db.query(
      'UPDATE pix_payments SET status = $1, confirmed_at = NOW() WHERE id = $2',
      ['CONFIRMED', paymentId]
    );

    // Ativar premium por 30 dias
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await db.query(
      'UPDATE users SET premium = TRUE, premium_expires_at = $1 WHERE id = $2',
      [expiresAt, userId]
    );

    console.log('✅ Premium ativado manualmente pelo admin para usuário:', userId);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Erro ao aprovar pagamento:', error);
    return NextResponse.json(
      { error: 'Erro ao aprovar pagamento' },
      { status: 500 }
    );
  }
}
