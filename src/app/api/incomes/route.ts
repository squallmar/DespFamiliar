import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { getDatabase } from '@/lib/database';
import { v4 as uuidv4 } from 'uuid';
import { getAuthUser, requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(request.url);
    const month = url.searchParams.get('month') || ''; // expect YYYY-MM
    const db = await getDatabase();

    if (month) {
      const res = await db.query('SELECT * FROM incomes WHERE user_id = $1 AND month = $2 ORDER BY created_at DESC', [user.userId, month]);
      return NextResponse.json({ items: res.rows });
    }

    // If no month param, return last 6 months summary
    const historyRes = await db.query(
      `SELECT month, SUM(amount) as total FROM incomes WHERE user_id = $1 GROUP BY month ORDER BY month DESC LIMIT 12`,
      [user.userId]
    );
    return NextResponse.json({ history: historyRes.rows });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    console.error(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const body = await request.json();
    const { month, amount, source, notes, recurring, recurring_type } = body;
    if (!month || typeof amount !== 'number') return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    const db = await getDatabase();
    const id = uuidv4();
    await db.query('INSERT INTO incomes (id, user_id, month, amount, source, notes, recurring, recurring_type) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', [id, user.userId, month, amount, source || null, notes || null, recurring ? true : false, recurring_type || null]);
    const res = await db.query('SELECT * FROM incomes WHERE id = $1', [id]);
    return NextResponse.json({ item: res.rows[0] });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    console.error(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const body = await request.json();
    const { id, month, amount, source, notes, recurring, recurring_type } = body;
    if (!id || !month || typeof amount !== 'number') return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    const db = await getDatabase();
    await db.query('UPDATE incomes SET month=$1, amount=$2, source=$3, notes=$4, recurring=$7, recurring_type=$8, updated_at=NOW() WHERE id=$5 AND user_id=$6', [month, amount, source || null, notes || null, id, user.userId, recurring ? true : false, recurring_type || null]);
    const res = await db.query('SELECT * FROM incomes WHERE id = $1', [id]);
    return NextResponse.json({ item: res.rows[0] });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    console.error(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    const db = await getDatabase();
    await db.query('DELETE FROM incomes WHERE id=$1 AND user_id=$2', [id, user.userId]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    console.error(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
