import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { sendResetEmail } from '@/lib/mailer';

// POST /api/auth/reset/request { email }
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email) return NextResponse.json({ error: 'Email obrigatório' }, { status: 400 });
    const db = await getDatabase();
    const user = await db.get('SELECT id FROM users WHERE email = ?', [email]);
    if (!user) return NextResponse.json({ ok: true }); // Não revela se existe
    const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
    const expires = Date.now() + 1000 * 60 * 30; // 30 minutos
    await db.run('INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)', [user.id, token, expires]);
    await sendResetEmail(email, token);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Erro ao solicitar reset' }, { status: 500 });
  }
}
