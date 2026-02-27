import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '@/lib/database';
import { requireAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const jwtUser = requireAuth(request);
    const db = await getDatabase();
    const userRes = await db.query('SELECT admin FROM users WHERE id = $1', [jwtUser.userId]);
    const userDb = userRes.rows[0];
    if (!userDb || !userDb.admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { code: providedCode, validForMonths = 12 } = body || {};

    const code = (providedCode && String(providedCode).trim()) || uuidv4().slice(0, 8).toUpperCase();
    const id = uuidv4();
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + Number(validForMonths));

    await db.query(
      'INSERT INTO premium_coupons (id, code, issuer_id, expires_at, valid) VALUES ($1, $2, $3, $4, true)',
      [id, code, jwtUser.userId, expiresAt]
    );

    return NextResponse.json({ code, expiresAt });
  } catch (err) {
    console.error('Error creating coupon:', err);
    return NextResponse.json({ error: 'Failed to create coupon' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const jwtUser = requireAuth(request);
    const db = await getDatabase();
    const userRes = await db.query('SELECT admin FROM users WHERE id = $1', [jwtUser.userId]);
    const userDb = userRes.rows[0];
    if (!userDb || !userDb.admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const rows = (await db.query('SELECT id, code, issuer_id, expires_at, used_by, used_at, valid, created_at FROM premium_coupons ORDER BY created_at DESC')).rows;
    return NextResponse.json({ coupons: rows });
  } catch (err) {
    console.error('Error listing coupons:', err);
    return NextResponse.json({ error: 'Failed to list coupons' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const jwtUser = requireAuth(request);
    const db = await getDatabase();
    const userRes = await db.query('SELECT admin FROM users WHERE id = $1', [jwtUser.userId]);
    const userDb = userRes.rows[0];
    if (!userDb || !userDb.admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { id } = body || {};
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    await db.query('UPDATE premium_coupons SET valid = false WHERE id = $1', [id]);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error deleting coupon:', err);
    return NextResponse.json({ error: 'Failed to delete coupon' }, { status: 500 });
  }
}
