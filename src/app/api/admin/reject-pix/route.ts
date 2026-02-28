import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { requireAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const { paymentId } = await request.json();

    // Verificar se é admin
    const db = await getDatabase();
    const adminCheck = await db.query('SELECT admin FROM users WHERE id = $1', [user.userId]);
    
    if (!adminCheck.rows[0]?.admin) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Atualizar pagamento como cancelado
    await db.query(
      'UPDATE pix_payments SET status = $1 WHERE id = $2',
      ['CANCELLED', paymentId]
    );

    console.log('❌ Pagamento rejeitado pelo admin:', paymentId);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Erro ao rejeitar pagamento:', error);
    return NextResponse.json(
      { error: 'Erro ao rejeitar pagamento' },
      { status: 500 }
    );
  }
}
