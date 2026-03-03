import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { v4 as uuidv4 } from 'uuid';

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'all';

    const db = await getDatabase();

    let query = `
      SELECT s.id, s.user_id, s.from_member_id, s.to_member_id, s.amount, s.paid_amount,
             s.status, s.linked_expense_id, s.created_at, s.settled_at,
             fm1.name as from_name, fm2.name as to_name
      FROM settlements s
      LEFT JOIN family_members fm1 ON s.from_member_id = fm1.id
      LEFT JOIN family_members fm2 ON s.to_member_id = fm2.id
      WHERE s.user_id = $1`;

    const params: any[] = [userId];

    if (status !== 'all') {
      query += ' AND s.status = $2';
      params.push(status);
    }

    query += ' ORDER BY s.created_at DESC';

    const result = await db.query(query, params);

    const settlements = result.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      from: { id: row.from_member_id, name: row.from_name },
      to: { id: row.to_member_id, name: row.to_name },
      amount: row.amount,
      paidAmount: row.paid_amount,
      remainingBalance: row.amount - (row.paid_amount || 0),
      status: row.status,
      linkedExpense: row.linked_expense_id,
      createdAt: row.created_at,
      settledAt: row.settled_at,
    }));

    return NextResponse.json(settlements);
  } catch (error) {
    console.error('Error fetching settlements:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { settlementId, amount, paymentMethod, notes } = (await req.json()) as {
      settlementId: string;
      amount: number;
      paymentMethod: string;
      notes?: string;
    };

    if (!settlementId || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    // Get the settlement
    const settlementResult = await db.query(
      `SELECT id, amount, paid_amount FROM settlements WHERE id = $1 AND user_id = $2`,
      [settlementId, userId]
    );

    if (settlementResult.rows.length === 0) {
      return NextResponse.json({ error: 'Settlement not found' }, { status: 404 });
    }

    const settlement = settlementResult.rows[0];
    const newPaidAmount = (settlement.paid_amount || 0) + amount;
    const isFullySettled = newPaidAmount >= settlement.amount;

    // Update settlement
    const updateResult = await db.query(
      `UPDATE settlements 
       SET paid_amount = $1, 
           status = $2,
           settled_at = CASE WHEN $2 = 'settled' THEN NOW() ELSE settled_at END
       WHERE id = $3
       RETURNING *`,
      [newPaidAmount, isFullySettled ? 'settled' : 'partial', settlementId]
    );

    const updatedSettlement = updateResult.rows[0];

    return NextResponse.json({
      id: updatedSettlement.id,
      userId: updatedSettlement.user_id,
      amount: updatedSettlement.amount,
      paidAmount: updatedSettlement.paid_amount,
      remainingBalance: updatedSettlement.amount - newPaidAmount,
      status: updatedSettlement.status,
      settledAt: updatedSettlement.settled_at,
      notes,
    });
  } catch (error) {
    console.error('Error settling debt:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
