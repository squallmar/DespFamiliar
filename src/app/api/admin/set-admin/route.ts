import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { requireAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, admin } = await request.json();
    // Só admin pode promover outro admin
    const user = requireAuth(request);
    const db = await getDatabase();
    const me = await db.get('SELECT admin FROM users WHERE id = ?', [user.userId]);
    if (!me || !me.admin) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }
    const result = await db.run('UPDATE users SET admin = ? WHERE email = ?', [admin ? 1 : 0, email]);
    if (result.changes === 0) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao atualizar admin' }, { status: 500 });
  }
}
