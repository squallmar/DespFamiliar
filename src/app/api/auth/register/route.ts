import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, insertDefaultCategories } from '@/lib/database';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Todos os campos são obrigatórios' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Senha deve ter pelo menos 6 caracteres' }, { status: 400 });
    }

    const db = await getDatabase();

    // Verificar se o email já existe
  const result = await db.query('SELECT id FROM users WHERE email = $1', [email]);
  const existingUser = result.rows[0];
    if (existingUser) {
      return NextResponse.json({ error: 'Email já está cadastrado' }, { status: 400 });
    }

    // Criptografar senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // Criar usuário
    const userId = uuidv4();
    // Se for Marcel da Silveira Mendes, criar como admin
    const isAdmin = name === 'Marcel da Silveira Mendes' && email === 'marcel@marcel.com';
    await db.query(
      'INSERT INTO users (id, name, email, password, admin) VALUES ($1, $2, $3, $4, $5)',
      [userId, name, email, hashedPassword, isAdmin]
    );

    // Inserir categorias padrão para o novo usuário
    await insertDefaultCategories(userId);

    // Gerar token JWT
    const token = jwt.sign({ userId, email, name }, JWT_SECRET, { expiresIn: '7d' });

    const response = NextResponse.json({
      user: { id: userId, name, email, premium: !!isAdmin, admin: !!isAdmin },
      message: 'Usuário criado com sucesso'
    }, { status: 201 });

    // Definir cookie httpOnly
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 dias
    });

    return response;
  } catch (error) {
    console.error('Erro no registro:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}