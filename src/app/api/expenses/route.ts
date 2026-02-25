import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { requireAuth } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const db = await getDatabase();
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const month = searchParams.get('month');
    let expensesResult;
    if (year && month) {
      // Filtrar por mês/ano
      expensesResult = await db.query(
        `SELECT e.*, c.name as category_name, c.color as category_color, c.icon as category_icon
        FROM expenses e
        LEFT JOIN categories c ON e.category_id = c.id
        WHERE e.user_id = $1
          AND EXTRACT(YEAR FROM e.date) = $2
          AND EXTRACT(MONTH FROM e.date) = $3
        ORDER BY e.date DESC
        LIMIT 50`,
        [user.userId, year, month]
      );
    } else {
      // Sem filtro de período
      expensesResult = await db.query(
        `SELECT e.*, c.name as category_name, c.color as category_color, c.icon as category_icon
        FROM expenses e
        LEFT JOIN categories c ON e.category_id = c.id
        WHERE e.user_id = $1
        ORDER BY e.date DESC
        LIMIT 50`,
        [user.userId]
      );

        // 6. Uso contínuo (7 dias consecutivos)
        const last7DaysResult = await db.query(
          `SELECT DISTINCT DATE(date) as expense_date
           FROM expenses
           WHERE user_id = $1 AND date >= NOW() - INTERVAL '7 days'
           ORDER BY DATE(date) DESC`,
          [user.userId]
        );
        const uniqueDates = last7DaysResult.rows.map(r => new Date(r.expense_date).toISOString().slice(0, 10));
        const today = new Date().toISOString().slice(0, 10);
        let streak = 0;
        for (let i = 0; i < 7; i++) {
          const checkDate = new Date(today);
          checkDate.setDate(checkDate.getDate() - i);
          const checkDateStr = checkDate.toISOString().slice(0, 10);
          if (uniqueDates.includes(checkDateStr)) {
            streak++;
          } else {
            break;
          }
        }
        if (streak >= 7) {
          const ach = await db.query('SELECT id FROM achievements WHERE user_id = $1 AND type = $2', [user.userId, 'continuous_use']);
          if (!ach.rows[0]) {
            await db.query('INSERT INTO achievements (id, user_id, type, description) VALUES ($1, $2, $3, $4)',
              [uuidv4(), user.userId, 'continuous_use', 'Uso contínuo de 7 dias!']);
          }
        }
    }
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

    const toYMD = (d: Date | string) => {
      const dt = typeof d === 'string' ? new Date(d) : d;
      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, '0');
      const day = String(dt.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    const clampDay = (year: number, monthIndex0: number, day: number) => {
      const lastDay = new Date(year, monthIndex0 + 1, 0).getDate();
      return Math.min(day, lastDay);
    };

    // Validação mais específica (permitir valor 0)
    if (amount === undefined || amount === null || amount === '') {
      return NextResponse.json({ error: 'Amount is required' }, { status: 400 });
    }
    if (!description || description.trim() === '') {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 });
    }
    if (!categoryId || categoryId.trim() === '') {
      return NextResponse.json({ error: 'Category is required' }, { status: 400 });
    }


    // Se não for recorrente, insere normalmente
    if (!recurring || !recurringType) {
      const expenseId = uuidv4();
      const base = date ? new Date(date) : new Date();
      const expenseDate = toYMD(base);
      await db.query(
        `INSERT INTO expenses (id, amount, description, category_id, date, user_id, recurring, recurring_type)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [expenseId, amount, description, categoryId, expenseDate, user.userId, recurring, recurringType]
      );
    } else {
      // Se for recorrente, cria para todos os meses restantes do ano (ou semanas/anos)
      const startDate = date ? new Date(date) : new Date();
      if (recurringType === 'monthly') {
        // Cria para os próximos 12 meses a partir da data de início
        for (let i = 0; i < 12; i++) {
          const targetYear = startDate.getFullYear() + Math.floor((startDate.getMonth() + i) / 12);
          const targetMonth = (startDate.getMonth() + i) % 12; // 0-based
          const day = startDate.getDate();
          const safeDay = clampDay(targetYear, targetMonth, day);
          const expenseId = uuidv4();
          const expenseDate = new Date(targetYear, targetMonth, safeDay);
          await db.query(
            `INSERT INTO expenses (id, amount, description, category_id, date, user_id, recurring, recurring_type)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [expenseId, amount, description, categoryId, toYMD(expenseDate), user.userId, recurring, recurringType]
          );
        }
      } else if (recurringType === 'weekly') {
        // Cria para as próximas 12 semanas
        const current = new Date(startDate);
        for (let i = 0; i < 12; i++) {
          const expenseId = uuidv4();
          await db.query(
            `INSERT INTO expenses (id, amount, description, category_id, date, user_id, recurring, recurring_type)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [expenseId, amount, description, categoryId, toYMD(current), user.userId, recurring, recurringType]
          );
          current.setDate(current.getDate() + 7);
        }
      } else if (recurringType === 'yearly') {
        // Cria para os próximos 5 anos
        const year = startDate.getFullYear();
        const month = startDate.getMonth();
        const day = startDate.getDate();
        for (let y = 0; y < 5; y++) {
          const expenseId = uuidv4();
          const safeDay = clampDay(year + y, month, day);
          const expenseDate = new Date(year + y, month, safeDay);
          await db.query(
            `INSERT INTO expenses (id, amount, description, category_id, date, user_id, recurring, recurring_type)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [expenseId, amount, description, categoryId, toYMD(expenseDate), user.userId, recurring, recurringType]
          );
        }
      }
    }


    // --- CONQUISTAS AUTOMÁTICAS ---
    // 1. Primeira despesa
    const countResult = await db.query('SELECT COUNT(*) as total FROM expenses WHERE user_id = $1', [user.userId]);
    const count = countResult.rows[0];
    if (count.total === 1) {
      const ach = await db.query('SELECT id FROM achievements WHERE user_id = $1 AND type = $2', [user.userId, 'first_expense']);
      if (!ach.rows[0]) {
        await db.query('INSERT INTO achievements (id, user_id, type, description) VALUES ($1, $2, $3, $4)',
          [uuidv4(), user.userId, 'first_expense', 'Primeira despesa cadastrada!']);
      }
    }

    // 2. Primeira despesa recorrente
    if (recurring && recurringType) {
      const recCount = await db.query('SELECT COUNT(*) as total FROM expenses WHERE user_id = $1 AND recurring = true', [user.userId]);
      if (Number(recCount.rows[0].total) === 1) {
        const ach = await db.query('SELECT id FROM achievements WHERE user_id = $1 AND type = $2', [user.userId, 'first_recurring']);
        if (!ach.rows[0]) {
          await db.query('INSERT INTO achievements (id, user_id, type, description) VALUES ($1, $2, $3, $4)',
            [uuidv4(), user.userId, 'first_recurring', 'Primeira despesa recorrente cadastrada!']);
        }
      }
    }

    // 3. 10 despesas cadastradas
    if (Number(count.total) === 10) {
      const ach = await db.query('SELECT id FROM achievements WHERE user_id = $1 AND type = $2', [user.userId, 'ten_expenses']);
      if (!ach.rows[0]) {
        await db.query('INSERT INTO achievements (id, user_id, type, description) VALUES ($1, $2, $3, $4)',
          [uuidv4(), user.userId, 'ten_expenses', '10 despesas cadastradas!']);
      }
    }

    // 4. 100 despesas cadastradas
    if (Number(count.total) === 100) {
      const ach = await db.query('SELECT id FROM achievements WHERE user_id = $1 AND type = $2', [user.userId, 'hundred_expenses']);
      if (!ach.rows[0]) {
        await db.query('INSERT INTO achievements (id, user_id, type, description) VALUES ($1, $2, $3, $4)',
          [uuidv4(), user.userId, 'hundred_expenses', '100 despesas cadastradas!']);
      }
    }

    // 5. Gastou em todas as categorias
    const userCategories = await db.query('SELECT id FROM categories WHERE user_id = $1', [user.userId]);
    const userCategoryIds = userCategories.rows.map(row => row.id);
    const usedCategories = await db.query('SELECT DISTINCT category_id FROM expenses WHERE user_id = $1', [user.userId]);
    const usedCategoryIds = usedCategories.rows.map(row => row.category_id);
    const allUsed = userCategoryIds.every(catId => usedCategoryIds.includes(catId));
    if (userCategoryIds.length > 0 && allUsed) {
      const ach = await db.query('SELECT id FROM achievements WHERE user_id = $1 AND type = $2', [user.userId, 'all_categories']);
      if (!ach.rows[0]) {
        await db.query('INSERT INTO achievements (id, user_id, type, description) VALUES ($1, $2, $3, $4)',
          [uuidv4(), user.userId, 'all_categories', 'Gastou em todas as categorias!']);
      }
    }

    // Buscar a última despesa criada para retornar na resposta
    const lastExpenseResult = await db.query(
      `SELECT e.*, c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM expenses e
      LEFT JOIN categories c ON e.category_id = c.id
      WHERE e.user_id = $1
      ORDER BY e.date DESC, e.created_at DESC
      LIMIT 1`,
      [user.userId]
    );
    const expense = lastExpenseResult.rows[0];

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

    const toYMD = (d: Date | string) => {
      const dt = typeof d === 'string' ? new Date(d) : d;
      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, '0');
      const day = String(dt.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

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
      [amount, description, categoryId, toYMD(date), recurring, recurringType, id]
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