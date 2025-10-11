import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { requireAuth } from '@/lib/auth';

// GET: Exporta todos os dados do usuário como JSON

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const db = await getDatabase();
    const userDb = await db.get('SELECT premium FROM users WHERE id = ?', [user.userId]);
    if (!userDb?.premium) {
      return NextResponse.json({ error: 'Recurso disponível apenas para usuários premium.' }, { status: 403 });
    }
    const [categories, expenses, budgets, goals, achievements] = await Promise.all([
      db.all('SELECT * FROM categories WHERE user_id = ?', [user.userId]),
      db.all('SELECT * FROM expenses WHERE user_id = ?', [user.userId]),
      db.all('SELECT * FROM budgets WHERE user_id = ?', [user.userId]),
      db.all('SELECT * FROM financial_goals WHERE user_id = ?', [user.userId]),
      db.all('SELECT * FROM achievements WHERE user_id = ?', [user.userId]),
    ]);
    return NextResponse.json({ categories, expenses, budgets, goals, achievements });
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
    const userDb = await db.get('SELECT premium FROM users WHERE id = ?', [user.userId]);
    if (!userDb?.premium) {
      return NextResponse.json({ error: 'Recurso disponível apenas para usuários premium.' }, { status: 403 });
    }
    const data = await request.json();
    // Remove todos os dados antigos do usuário
    await db.run('DELETE FROM categories WHERE user_id = ?', [user.userId]);
    await db.run('DELETE FROM expenses WHERE user_id = ?', [user.userId]);
    await db.run('DELETE FROM budgets WHERE user_id = ?', [user.userId]);
    await db.run('DELETE FROM financial_goals WHERE user_id = ?', [user.userId]);
    await db.run('DELETE FROM achievements WHERE user_id = ?', [user.userId]);
    // Insere os dados importados
    for (const c of data.categories || []) {
      await db.run('INSERT INTO categories (id, name, color, icon, budget, user_id) VALUES (?, ?, ?, ?, ?, ?)', [c.id, c.name, c.color, c.icon, c.budget, user.userId]);
    }
    for (const e of data.expenses || []) {
      await db.run('INSERT INTO expenses (id, amount, description, category_id, date, user_id, recurring, recurring_type, tags, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [e.id, e.amount, e.description, e.category_id, e.date, user.userId, e.recurring, e.recurring_type, e.tags, e.created_at]);
    }
    for (const b of data.budgets || []) {
      await db.run('INSERT INTO budgets (id, category_id, amount, period, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?)', [b.id, b.category_id, b.amount, b.period, user.userId, b.created_at]);
    }
    for (const g of data.goals || []) {
      await db.run('INSERT INTO financial_goals (id, name, target_amount, current_amount, deadline, user_id, completed, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [g.id, g.name, g.target_amount, g.current_amount, g.deadline, user.userId, g.completed, g.created_at]);
    }
    for (const a of data.achievements || []) {
      await db.run('INSERT INTO achievements (id, user_id, type, description, awarded_at) VALUES (?, ?, ?, ?, ?)', [a.id, user.userId, a.type, a.description, a.awarded_at]);
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
