import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import bcrypt from 'bcryptjs';

// POST /api/auth/reset/confirm { token, password }
export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();
    if (!token || !password) return NextResponse.json({ error: 'Token e senha obrigatórios' }, { status: 400 });
    const db = await getDatabase();
    const reset = await db.get('SELECT * FROM password_resets WHERE token = ? AND expires_at > ?', [token, Date.now()]);
    if (!reset) return NextResponse.json({ error: 'Token inválido ou expirado' }, { status: 400 });
    const hashed = await bcrypt.hash(password, 10);
    await db.run('UPDATE users SET password = ? WHERE id = ?', [hashed, reset.user_id]);
    await db.run('DELETE FROM password_resets WHERE user_id = ?', [reset.user_id]);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Erro ao redefinir senha' }, { status: 500 });
  }
}
