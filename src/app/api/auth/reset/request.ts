import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { sendResetEmail } from '@/lib/mailer';
import crypto from 'crypto';
import { checkRateLimit, getClientIpFromRequest } from '@/lib/rate-limit';

// POST /api/auth/reset/request { email }
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIpFromRequest(request);
    const limitCheck = checkRateLimit(`auth:reset-request:${ip}`, 5, 15 * 60 * 1000);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { error: 'Muitas solicitações. Tente novamente mais tarde.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(limitCheck.retryAfterSeconds),
          },
        }
      );
    }

    const { email } = await request.json();
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (!normalizedEmail) {
      return NextResponse.json({ error: 'Email obrigatório' }, { status: 400 });
    }

    const db = await getDatabase();

    // PostgreSQL usa db.query()
    const userResult = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [normalizedEmail]
    );

    const user = userResult.rows[0];

    // Não revela se o usuário existe
    if (!user) {
      return NextResponse.json({ ok: true });
    }

    const token = crypto.randomBytes(32).toString('hex');

    const expires = new Date(Date.now() + 1000 * 60 * 30); // 30 min — formato correto para Postgres

    // Insere token de reset
    await db.query(
      'INSERT INTO password_resets (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, token, expires]
    );

    await sendResetEmail(normalizedEmail, token);

    return NextResponse.json({ ok: true });

  } catch (error) {
    console.error('Erro ao solicitar reset:', error);
    return NextResponse.json(
      { error: 'Erro ao solicitar reset' },
      { status: 500 }
    );
  }
}
