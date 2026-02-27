import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { requireAuth } from '@/lib/auth';

// GET: Exporta todos os dados do usuário como JSON

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const db = await getDatabase();
  const result = await db.query('SELECT premium FROM users WHERE id = $1', [user.userId]);
  const userDb = result.rows[0];
  if (!userDb?.premium) {
      return NextResponse.json({ error: 'Recurso disponível apenas para usuários premium.' }, { status: 403 });
    }
    const [categoriesRes, expensesRes, budgetsRes, goalsRes, achievementsRes, billsRes] = await Promise.all([
      db.query('SELECT * FROM categories WHERE user_id = $1', [user.userId]),
      db.query('SELECT * FROM expenses WHERE user_id = $1', [user.userId]),
      db.query('SELECT * FROM budgets WHERE user_id = $1', [user.userId]),
      db.query('SELECT * FROM financial_goals WHERE user_id = $1', [user.userId]),
      db.query('SELECT * FROM achievements WHERE user_id = $1', [user.userId]),
      db.query('SELECT * FROM bills WHERE user_id = $1', [user.userId]),
    ]);
    return NextResponse.json({
      categories: categoriesRes.rows,
      expenses: expensesRes.rows,
      budgets: budgetsRes.rows,
      goals: goalsRes.rows,
      achievements: achievementsRes.rows,
      bills: billsRes.rows,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    console.error('Erro ao exportar backup:', error);
    return NextResponse.json({ error: 'Falha ao exportar backup' }, { status: 500 });
  }
}

// POST: Importa dados do usuário a partir de JSON

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const db = await getDatabase();
  const result2 = await db.query('SELECT premium FROM users WHERE id = $1', [user.userId]);
  const userDb2 = result2.rows[0];
  if (!userDb2?.premium) {
      return NextResponse.json({ error: 'Recurso disponível apenas para usuários premium.' }, { status: 403 });
    }
    const data = await request.json();
    // Remove todos os dados antigos do usuário
  await db.query('DELETE FROM bills WHERE user_id = $1', [user.userId]);
  await db.query('DELETE FROM categories WHERE user_id = $1', [user.userId]);
  await db.query('DELETE FROM expenses WHERE user_id = $1', [user.userId]);
  await db.query('DELETE FROM budgets WHERE user_id = $1', [user.userId]);
  await db.query('DELETE FROM financial_goals WHERE user_id = $1', [user.userId]);
  await db.query('DELETE FROM achievements WHERE user_id = $1', [user.userId]);
    // Insere os dados importados
    for (const c of data.categories || []) {
      await db.query('INSERT INTO categories (id, name, color, icon, budget, user_id) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING', [c.id, c.name, c.color, c.icon, c.budget, user.userId]);
    }
    for (const e of data.expenses || []) {
      await db.query('INSERT INTO expenses (id, amount, description, category_id, date, user_id, recurring, recurring_type, tags, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT (id) DO NOTHING', [e.id, e.amount, e.description, e.category_id, e.date, user.userId, e.recurring, e.recurring_type, e.tags, e.created_at]);
    }
    for (const b of data.budgets || []) {
      await db.query('INSERT INTO budgets (id, category_id, amount, period, user_id, created_at) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING', [b.id, b.category_id, b.amount, b.period, user.userId, b.created_at]);
    }
    for (const g of data.goals || []) {
      await db.query('INSERT INTO financial_goals (id, name, target_amount, current_amount, deadline, user_id, completed, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (id) DO NOTHING', [g.id, g.name, g.target_amount, g.current_amount, g.deadline, user.userId, g.completed, g.created_at]);
    }
    for (const a of data.achievements || []) {
      await db.query('INSERT INTO achievements (id, user_id, type, description, awarded_at) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING', [a.id, user.userId, a.type, a.description, a.awarded_at]);
    }
    for (const b of data.bills || []) {
      await db.query(
        'INSERT INTO bills (id, user_id, description, amount, due_date, category_id, status, paid_date, recurring, recurring_type, notes, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) ON CONFLICT (id) DO NOTHING',
        [b.id, user.userId, b.description, b.amount, b.due_date, b.category_id, b.status, b.paid_date, b.recurring, b.recurring_type, b.notes, b.created_at]
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    console.error('Erro ao importar backup:', error);
    return NextResponse.json({ error: 'Falha ao importar backup' }, { status: 500 });
  }
}
