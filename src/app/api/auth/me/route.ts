import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getDatabase } from '@/lib/database';
import { getJwtSecret } from '@/lib/auth';

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
    const decoded = jwt.verify(token, getJwtSecret()) as JWTPayload;
    const db = await getDatabase();
  const userResult = await db.query('SELECT premium, admin, avatar, premium_expires_at FROM users WHERE id = $1', [decoded.userId]);
  const userDb = userResult.rows[0];
    // If premium_expires_at is set and is in the past, ensure premium flag is cleared (migration safety)
    if (userDb && userDb.premium_expires_at && new Date(userDb.premium_expires_at) < new Date()) {
      try {
        await db.query('UPDATE users SET premium = false WHERE id = $1', [decoded.userId]);
        userDb.premium = false;
      } catch (e) {
        console.error('Error clearing expired premium flag:', e);
      }
    }
    return NextResponse.json({
      user: {
        id: decoded.userId,
        name: decoded.name,
        email: decoded.email,
        premium: !!(userDb && (userDb.premium || userDb.admin)),
        admin: !!(userDb && userDb.admin),
        avatar: userDb?.avatar || '👤',
        premium_expires_at: userDb?.premium_expires_at || null
      }
    });
  } catch (error) {
    console.error('Erro na verificação do token:', error);
    return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
  }
}