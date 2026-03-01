import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const decoded = requireAuth(request);
    const db = await getDatabase();
    const userResult = await db.query('SELECT premium, admin, avatar FROM users WHERE id = $1', [decoded.userId]);
    const userDb = userResult.rows[0];
    // Return user data
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
    if (error instanceof Error && error.message.includes('JWT_SECRET')) {
      return NextResponse.json(
        { error: 'Servidor não configurado: JWT_SECRET ausente ou inválido no ambiente.' },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
  }
}