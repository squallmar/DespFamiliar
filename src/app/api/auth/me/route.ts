import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getDatabase } from '@/lib/database';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

interface JWTPayload {
  userId: string;
  name: string;
  email: string;
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Token não encontrado' }, { status: 401 });
    }
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    const db = await getDatabase();
  const userResult = await db.query('SELECT premium, admin, avatar FROM users WHERE id = $1', [decoded.userId]);
  const userDb = userResult.rows[0];
    return NextResponse.json({
      user: {
        id: decoded.userId,
        name: decoded.name,
        email: decoded.email,
        premium: !!(userDb && (userDb.premium || userDb.admin)),
        admin: !!(userDb && userDb.admin),
        avatar: userDb?.avatar || '👤'
      }
    });
  } catch (error) {
    console.error('Erro na verificação do token:', error);
    return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
  }
}