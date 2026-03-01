import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, insertDefaultCategories } from '@/lib/database';
import bcrypt from 'bcryptjs';
import { getAuthCookieOptions, signAuthToken } from '@/lib/auth';
import { checkRateLimit, getClientIpFromRequest } from '@/lib/rate-limit';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIpFromRequest(request);
    const limitCheck = checkRateLimit(`auth:register:${ip}`, 5, 30 * 60 * 1000);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { error: 'Muitas tentativas de cadastro. Tente novamente mais tarde.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(limitCheck.retryAfterSeconds),
          },
        }
      );
    }

    const { name, email, password } = await request.json();
    const normalizedName = typeof name === 'string' ? name.trim() : '';
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (!normalizedName || !normalizedEmail || !password) {
      return NextResponse.json({ error: 'Todos os campos são obrigatórios' }, { status: 400 });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
    }

    if (normalizedName.length < 2 || normalizedName.length > 80) {
      return NextResponse.json({ error: 'Nome inválido' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Senha deve ter pelo menos 6 caracteres' }, { status: 400 });
    }

    const db = await getDatabase();

    // Verificar se o email já existe
    const result = await db.query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
    const existingUser = result.rows[0];
    if (existingUser) {
      return NextResponse.json({ error: 'Email já está cadastrado' }, { status: 400 });
    }

    // Criptografar senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // Criar usuário
    const userId = uuidv4();
    await db.query(
      'INSERT INTO users (id, name, email, password, admin) VALUES ($1, $2, $3, $4, $5)',
      [userId, normalizedName, normalizedEmail, hashedPassword, false]
    );

    // Inserir categorias padrão para o novo usuário
    await insertDefaultCategories(userId);

    // Gerar token JWT
    const token = signAuthToken({ userId, email: normalizedEmail, name: normalizedName });

    const response = NextResponse.json({
      user: { id: userId, name: normalizedName, email: normalizedEmail, premium: false, admin: false },
      message: 'Usuário criado com sucesso'
    }, { status: 201 });

    // Definir cookie httpOnly
    response.cookies.set('token', token, getAuthCookieOptions());

    return response;
  } catch (error) {
    console.error('Erro no registro:', error);
    if (error instanceof Error && error.message.includes('JWT_SECRET')) {
      return NextResponse.json(
        { error: 'Servidor não configurado: JWT_SECRET ausente ou inválido no ambiente.' },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}