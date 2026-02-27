import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { requireAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, admin } = await request.json();

    // Segurança
    let user;
    try {
      user = requireAuth(request);
    } catch {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const db = await getDatabase();

    // Busca quem está fazendo a requisição (se é admin)
    const meResult = await db.query(
      'SELECT admin FROM users WHERE id = $1',
      [user.userId]
    );

    const me = meResult.rows[0];

    if (!me || !me.admin) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Atualiza o status admin do usuário-alvo
    const updateResult = await db.query(
      'UPDATE users SET admin = $1 WHERE email = $2 RETURNING id',
      [admin ? true : false, email]
    );

    if (updateResult.rowCount === 0) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true });

  } catch (error) {
    console.error('Erro no set-admin:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar admin' },
      { status: 500 }
    );
  }
}
