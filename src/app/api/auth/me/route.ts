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
    const userDb = await db.get('SELECT premium, admin FROM users WHERE id = ?', [decoded.userId]);
    return NextResponse.json({
      user: {
        id: decoded.userId,
        name: decoded.name,
        email: decoded.email,
        premium: !!(userDb && (userDb.premium || userDb.admin)),
        admin: !!(userDb && userDb.admin)
      }
    });
  } catch (error) {
    console.error('Erro na verificação do token:', error);
    return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
  }
}