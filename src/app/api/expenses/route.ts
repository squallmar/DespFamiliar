import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { requireAuth } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const db = await getDatabase();
    
    const expensesResult = await db.query(
      `SELECT e.*, c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM expenses e
      LEFT JOIN categories c ON e.category_id = c.id
      WHERE e.user_id = $1
      ORDER BY e.date DESC
      LIMIT 50`,
      [user.userId]
    );
    const expenses = expensesResult.rows;

    return NextResponse.json({ expenses });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    console.error('Error fetching expenses:', error);
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const db = await getDatabase();
    const body = await request.json();
    const { amount, description, categoryId, date, recurring = false, recurringType } = body;

    if (!amount || !description || !categoryId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const expenseId = uuidv4();
    const expenseDate = date || new Date().toISOString();


    await db.query(
      `INSERT INTO expenses (id, amount, description, category_id, date, user_id, recurring, recurring_type)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [expenseId, amount, description, categoryId, expenseDate, user.userId, recurring, recurringType]
    );

    // Premiar conquista "primeira despesa" se for a primeira do usuário
  const countResult = await db.query('SELECT COUNT(*) as total FROM expenses WHERE user_id = $1', [user.userId]);
  const count = countResult.rows[0];
    if (count.total === 1) {
      // Só premia se ainda não existe
    const achResult = await db.query('SELECT id FROM achievements WHERE user_id = $1 AND type = $2', [user.userId, 'first_expense']);
    const ach = achResult.rows[0];
      if (!ach) {
        await db.query(
          'INSERT INTO achievements (id, user_id, type, description) VALUES ($1, $2, $3, $4)',
          [uuidv4(), user.userId, 'first_expense', 'Primeira despesa cadastrada!']
        );
      }
    }

    const expenseResult = await db.query(
      `SELECT e.*, c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM expenses e
      LEFT JOIN categories c ON e.category_id = c.id
      WHERE e.id = $1`,
      [expenseId]
    );
    const expense = expenseResult.rows[0];

    return NextResponse.json({ expense }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    console.error('Error creating expense:', error);
    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const db = await getDatabase();
    const body = await request.json();
    const { id, amount, description, categoryId, date, recurring, recurringType } = body;

    if (!id) {
      return NextResponse.json({ error: 'Expense ID is required' }, { status: 400 });
    }

    // Verificar se a despesa pertence ao usuário
  const existingExpenseResult = await db.query('SELECT user_id FROM expenses WHERE id = $1', [id]);
  const existingExpense = existingExpenseResult.rows[0];
    if (!existingExpense || existingExpense.user_id !== user.userId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    await db.query(
      `UPDATE expenses 
      SET amount = $1, description = $2, category_id = $3, date = $4, recurring = $5, recurring_type = $6
      WHERE id = $7`,
      [amount, description, categoryId, date, recurring, recurringType, id]
    );

    const expenseResult = await db.query(
      `SELECT e.*, c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM expenses e
      LEFT JOIN categories c ON e.category_id = c.id
      WHERE e.id = $1`,
      [id]
    );
    const expense = expenseResult.rows[0];

    return NextResponse.json({ expense });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    console.error('Error updating expense:', error);
    return NextResponse.json({ error: 'Failed to update expense' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const db = await getDatabase();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Expense ID is required' }, { status: 400 });
    }

    // Verificar se a despesa pertence ao usuário
  const existingExpenseResult = await db.query('SELECT user_id FROM expenses WHERE id = $1', [id]);
  const existingExpense = existingExpenseResult.rows[0];
    if (!existingExpense || existingExpense.user_id !== user.userId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

  await db.query('DELETE FROM expenses WHERE id = $1', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    console.error('Error deleting expense:', error);
    return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 });
  }
}