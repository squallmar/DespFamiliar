import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { requireAuth } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const db = await getDatabase();
    
    const expenses = await db.all(`
      SELECT e.*, c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM expenses e
      LEFT JOIN categories c ON e.category_id = c.id
      WHERE e.user_id = ?
      ORDER BY e.date DESC
      LIMIT 50
    `, [user.userId]);

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


    await db.run(`
      INSERT INTO expenses (id, amount, description, category_id, date, user_id, recurring, recurring_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [expenseId, amount, description, categoryId, expenseDate, user.userId, recurring, recurringType]);

    // Premiar conquista "primeira despesa" se for a primeira do usuário
    const count = await db.get('SELECT COUNT(*) as total FROM expenses WHERE user_id = ?', [user.userId]);
    if (count.total === 1) {
      // Só premia se ainda não existe
      const ach = await db.get('SELECT id FROM achievements WHERE user_id = ? AND type = ?', [user.userId, 'first_expense']);
      if (!ach) {
        await db.run(
          'INSERT INTO achievements (id, user_id, type, description) VALUES (?, ?, ?, ?)',
          [uuidv4(), user.userId, 'first_expense', 'Primeira despesa cadastrada!']
        );
      }
    }

    const expense = await db.get(`
      SELECT e.*, c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM expenses e
      LEFT JOIN categories c ON e.category_id = c.id
      WHERE e.id = ?
    `, [expenseId]);

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
    const existingExpense = await db.get('SELECT user_id FROM expenses WHERE id = ?', [id]);
    if (!existingExpense || existingExpense.user_id !== user.userId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    await db.run(`
      UPDATE expenses 
      SET amount = ?, description = ?, category_id = ?, date = ?, recurring = ?, recurring_type = ?
      WHERE id = ?
    `, [amount, description, categoryId, date, recurring, recurringType, id]);

    const expense = await db.get(`
      SELECT e.*, c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM expenses e
      LEFT JOIN categories c ON e.category_id = c.id
      WHERE e.id = ?
    `, [id]);

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
    const existingExpense = await db.get('SELECT user_id FROM expenses WHERE id = ?', [id]);
    if (!existingExpense || existingExpense.user_id !== user.userId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    await db.run('DELETE FROM expenses WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    console.error('Error deleting expense:', error);
    return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 });
  }
}