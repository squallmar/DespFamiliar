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
    const users = await db.all('SELECT id, name, email, admin, premium, created_at FROM users ORDER BY created_at DESC');
    return NextResponse.json({ users });
  } catch {
    return NextResponse.json({ error: 'Erro ao listar usuários' }, { status: 500 });
  }
}
