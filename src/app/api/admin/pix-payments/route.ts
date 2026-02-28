import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    
    // Verificar se é admin
    const db = await getDatabase();
    const adminCheck = await db.query('SELECT admin FROM users WHERE id = $1', [user.userId]);
    
    if (!adminCheck.rows[0]?.admin) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'all';

    let query = `
      SELECT 
        pp.*,
        u.email as user_email,
        u.name as user_name
      FROM pix_payments pp
      LEFT JOIN users u ON u.id = pp.user_id
    `;

    const params: string[] = [];

    if (filter === 'pending') {
      query += ' WHERE pp.status = $1';
      params.push('PENDING');
    } else if (filter === 'confirmed') {
      query += ' WHERE pp.status = $1';
      params.push('CONFIRMED');
    }

    query += ' ORDER BY pp.created_at DESC LIMIT 100';

    const result = await db.query(query, params);

    return NextResponse.json({ payments: result.rows });

  } catch (error) {
    console.error('Erro ao buscar pagamentos:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar pagamentos' },
      { status: 500 }
    );
  }
}
