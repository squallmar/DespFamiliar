import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { requireAuth } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const db = await getDatabase();
    const { code } = await request.json();
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
    }

    const couponRes = await db.query('SELECT * FROM premium_coupons WHERE code = $1', [code.trim()]);
    const coupon = couponRes.rows[0];
    if (!coupon || !coupon.valid) {
      return NextResponse.json({ error: 'Cupom inválido ou já utilizado' }, { status: 400 });
    }
    const now = new Date();
    if (coupon.expires_at && new Date(coupon.expires_at) < now) {
      return NextResponse.json({ error: 'Cupom expirado' }, { status: 400 });
    }

    // mark coupon used and set user premium for 1 year
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    await db.query('UPDATE users SET premium = true, premium_expires_at = $1 WHERE id = $2', [expiresAt, user.userId]);
    await db.query('UPDATE premium_coupons SET used_by = $1, used_at = $2, valid = false WHERE id = $3', [user.userId, now, coupon.id]);

    return NextResponse.json({ success: true, premium_expires_at: expiresAt });
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    console.error('Error redeeming coupon:', err);
    return NextResponse.json({ error: 'Failed to redeem coupon' }, { status: 500 });
  }
}
