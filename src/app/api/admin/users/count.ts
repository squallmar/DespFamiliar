import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);

    // Verifica permissão
    if (!user || !user.admin) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const db = await getDatabase();

    // PostgreSQL usa db.query()
    const result = await db.query('SELECT COUNT(*) AS total FROM users');

    // PostgreSQL retorna em result.rows
    const total = Number(result.rows[0]?.total ?? 0);

    return NextResponse.json({ total });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Erro ao contar usuários' },
      { status: 500 }
    );
  }
}
