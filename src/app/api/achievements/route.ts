import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const db = await getDatabase();
    const achievementsResult = await db.query(
      'SELECT id, type, description, awarded_at FROM achievements WHERE user_id = $1 ORDER BY awarded_at ASC',
      [user.userId]
    );
    const achievements = achievementsResult.rows;
    return NextResponse.json({ achievements });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    console.error('Erro ao buscar conquistas:', error);
    return NextResponse.json({ error: 'Falha ao buscar conquistas' }, { status: 500 });
  }
}
