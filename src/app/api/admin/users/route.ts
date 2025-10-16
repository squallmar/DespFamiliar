import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    console.log('Admin endpoint chamado por:', user);
    const db = await getDatabase();
    // Buscar status admin do usuário autenticado
    const adminCheck = await db.query('SELECT admin FROM users WHERE id = $1', [user.userId]);
    const isAdmin = adminCheck.rows[0]?.admin === true;
    if (!isAdmin) {
      console.log('Acesso negado para:', user.email);
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }
    const result = await db.query('SELECT id, name, email, admin, premium, created_at FROM users ORDER BY created_at DESC');
    console.log('Usuários retornados:', result.rows.length);
    return NextResponse.json({ users: result.rows });
  } catch {
    return NextResponse.json({ error: 'Erro ao listar usuários' }, { status: 500 });
  }
}
