import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import bcrypt from 'bcryptjs';

// POST /api/auth/reset/confirm { token, password }
export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token e senha obrigatórios' },
        { status: 400 }
      );
    }

    if (typeof password !== 'string' || password.length < 8) {
      return NextResponse.json(
        { error: 'A nova senha deve ter no mínimo 8 caracteres' },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    // PostgreSQL usa db.query e parâmetros $1
    const resetQuery = await db.query(
      'SELECT * FROM password_resets WHERE token = $1 AND expires_at > NOW()',
      [token]
    );

    const reset = resetQuery.rows[0];

    if (!reset) {
      return NextResponse.json(
        { error: 'Token inválido ou expirado' },
        { status: 400 }
      );
    }

    // Criptografa a nova senha
    const hashed = await bcrypt.hash(password, 10);

    // Atualiza senha na tabela users
    await db.query(
      'UPDATE users SET password = $1 WHERE id = $2',
      [hashed, reset.user_id]
    );

    // Remove o token da tabela password_resets
    await db.query(
      'DELETE FROM password_resets WHERE user_id = $1',
      [reset.user_id]
    );

    return NextResponse.json({ ok: true });

  } catch (error) {
    console.error('Erro no reset:', error);
    return NextResponse.json(
      { error: 'Erro ao redefinir senha' },
      { status: 500 }
    );
  }
}
