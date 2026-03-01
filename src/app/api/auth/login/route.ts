import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import bcrypt from 'bcryptjs';
import { getAuthCookieOptions, signAuthToken } from '@/lib/auth';
import { checkRateLimit, getClientIpFromRequest } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIpFromRequest(request);
    const limitCheck = checkRateLimit(`auth:login:${ip}`, 10, 15 * 60 * 1000);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { error: 'Muitas tentativas. Tente novamente mais tarde.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(limitCheck.retryAfterSeconds),
          },
        }
      );
    }

    const { email, password } = await request.json();
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (!normalizedEmail || !password) {
      return NextResponse.json({ error: 'Email e senha são obrigatórios' }, { status: 400 });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
    }

    const db = await getDatabase();

    // Buscar usuário
    const result = await db.query('SELECT * FROM users WHERE email = $1', [normalizedEmail]);
    const user = result.rows[0];
    if (!user) {
      return NextResponse.json({ error: 'Email ou senha inválidos' }, { status: 401 });
    }

    // Verificar senha
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return NextResponse.json({ error: 'Email ou senha inválidos' }, { status: 401 });
    }

    // Gerar token JWT
    const token = signAuthToken({ userId: user.id, email: user.email, name: user.name });

    const response = NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        premium: !!(user.premium || user.admin),
        admin: !!user.admin,
        avatar: user.avatar || '👤'
      },
      message: 'Login realizado com sucesso'
    });

    // Definir cookie httpOnly
    response.cookies.set('token', token, getAuthCookieOptions());

    return response;
  } catch (error) {
    console.error('Erro no login:', error);
    if (error instanceof Error && error.message.includes('JWT_SECRET')) {
      return NextResponse.json(
        { error: 'Servidor não configurado: JWT_SECRET ausente ou inválido no ambiente.' },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}