import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    if (!('admin' in user) || !user.admin) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }
    const db = await getDatabase();
    const result = await db.get('SELECT COUNT(*) as total FROM users');
    return NextResponse.json({ total: result?.total ?? 0 });
  } catch {
    return NextResponse.json({ error: 'Erro ao contar usuários' }, { status: 500 });
  }
}
