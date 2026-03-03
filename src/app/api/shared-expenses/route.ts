import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { v4 as uuidv4 } from 'uuid';

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDatabase();

    // Get all shared expenses for the user
    const result = await db.query(
      `SELECT se.id, se.user_id, se.expense_id, se.description, se.total_amount, se.split_type, se.created_at
       FROM shared_expenses se
       WHERE se.user_id = $1
       ORDER BY se.created_at DESC`,
      [userId]
    );

    const sharedExpenses = await Promise.all(
      result.rows.map(async (expense) => {
        // Get participants for this shared expense
        const participantsResult = await db.query(
          `SELECT id, member_id, member_name, share_percentage, amount_owed, amount_paid, status
           FROM shared_expense_participants
           WHERE shared_expense_id = $1`,
          [expense.id]
        );

        return {
          id: expense.id,
          userId: expense.user_id,
          expenseId: expense.expense_id,
          description: expense.description,
          amount: expense.total_amount,
          splitType: expense.split_type,
          participants: participantsResult.rows.map((p) => ({
            memberId: p.member_id,
            memberName: p.member_name,
            share: p.share_percentage,
            owes: p.amount_owed,
            paid: p.amount_paid,
            status: p.status,
          })),
          createdAt: expense.created_at,
        };
      })
    );

    return NextResponse.json(sharedExpenses);
  } catch (error) {
    console.error('Error fetching shared expenses:', error);
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

    const { expenseId, description, amount, splitType, participants } =
      (await req.json()) as {
        expenseId: string;
        description: string;
        amount: number;
        splitType: 'equal' | 'custom';
        participants: Array<{ memberId: string; memberName: string; share?: number }>;
      };

    if (!expenseId || !description || !amount || participants.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const sharedExpenseId = uuidv4();

    // Create shared expense
    await db.query(
      `INSERT INTO shared_expenses (id, user_id, expense_id, description, total_amount, split_type, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [sharedExpenseId, userId, expenseId, description, amount, splitType]
    );

    // Create participants and settlements
    for (const participant of participants) {
      const participantId = uuidv4();
      const sharePercentage =
        splitType === 'equal'
          ? 100 / participants.length
          : participant.share || 0;
      const amountOwed = (amount * sharePercentage) / 100;

      // Create participant record
      await db.query(
        `INSERT INTO shared_expense_participants 
         (id, shared_expense_id, member_id, member_name, share_percentage, amount_owed, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [participantId, sharedExpenseId, participant.memberId, participant.memberName, sharePercentage, amountOwed, 'pending']
      );

      // Create settlement record
      if (participant.memberId !== userId) {
        const settlementId = uuidv4();
        await db.query(
          `INSERT INTO settlements (id, user_id, from_member_id, to_member_id, amount, status, linked_expense_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [settlementId, userId, participant.memberId, userId, amountOwed, 'pending', expenseId]
        );
      }
    }

    return NextResponse.json(
      {
        id: sharedExpenseId,
        userId,
        expenseId,
        description,
        amount,
        splitType,
        participants: participants.map((p) => ({
          memberId: p.memberId,
          memberName: p.memberName,
          share: splitType === 'equal' ? (100 / participants.length) : (p.share || 0),
          owes: (amount * (splitType === 'equal' ? (100 / participants.length) : (p.share || 0))) / 100,
          paid: 0,
          status: 'pending',
        })),
        createdAt: new Date().toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating shared expense:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
