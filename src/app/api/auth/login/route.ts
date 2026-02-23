import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || (
  process.env.NODE_ENV === 'production'
    ? (() => { throw new Error('JWT_SECRET environment variable is not set in production!'); })()
    : 'dev-secret-key-only-for-local-development'
);

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email e senha são obrigatórios' }, { status: 400 });
    }

    const db = await getDatabase();

    // Buscar usuário
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    console.log('Tentando login para:', email, 'Encontrado:', !!user);
    if (!user) {
      return NextResponse.json({ error: 'Email ou senha inválidos' }, { status: 401 });
    }

    // Verificar senha
    const isValidPassword = await bcrypt.compare(password, user.password);
    console.log('Senha correta?', isValidPassword);
    if (!isValidPassword) {
      return NextResponse.json({ error: 'Email ou senha inválidos' }, { status: 401 });
    }

    // Gerar token JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

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
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' && process.env.VERCEL !== '1',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 // 7 dias
    });

    return response;
  } catch (error) {
    console.error('Erro no login:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}