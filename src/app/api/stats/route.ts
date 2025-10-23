import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { requireAuth } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const db = await getDatabase();

    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get('year');
    const monthParam = searchParams.get('month');
    const now = new Date();
    const currentMonth = monthParam ? parseInt(monthParam) : now.getMonth() + 1;
    const currentYear = yearParam ? parseInt(yearParam) : now.getFullYear();
    const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    
    const thisMonthTotalResult = await db.query(
      `SELECT COALESCE(SUM(amount), 0) as total
      FROM expenses 
      WHERE user_id = $1 
      AND EXTRACT(YEAR FROM date::date) = $2 
      AND EXTRACT(MONTH FROM date::date) = $3`,
      [user.userId, currentYear, currentMonth]
    );
    const thisMonthTotal = thisMonthTotalResult.rows[0] || { total: 0 };
    const thisTotal = Number(thisMonthTotal.total);
    
    const thisMonthNonRecurringResult = await db.query(
      `SELECT COALESCE(SUM(amount), 0) as total
      FROM expenses 
      WHERE user_id = $1 
      AND EXTRACT(YEAR FROM date::date) = $2 
      AND EXTRACT(MONTH FROM date::date) = $3
      AND (recurring != true OR recurring IS NULL)`,
      [user.userId, currentYear, currentMonth]
    );
    const thisMonthNonRecurring = thisMonthNonRecurringResult.rows[0] || { total: 0 };
    
    const lastMonthTotalResult = await db.query(
      `SELECT COALESCE(SUM(amount), 0) as total
      FROM expenses 
      WHERE user_id = $1 
      AND EXTRACT(YEAR FROM date::date) = $2 
      AND EXTRACT(MONTH FROM date::date) = $3`,
      [user.userId, lastMonthYear, lastMonth]
    );
    const lastMonthTotal = lastMonthTotalResult.rows[0] || { total: 0 };

    const last3MonthsTotalsResult = await db.query(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM expenses
       WHERE user_id = $1
         AND ((EXTRACT(YEAR FROM date::date) = $2 AND EXTRACT(MONTH FROM date::date) < $3 AND EXTRACT(MONTH FROM date::date) >= $3-3)
           OR (EXTRACT(YEAR FROM date::date) = $2-1 AND EXTRACT(MONTH FROM date::date) > 12-($3-1)))
       GROUP BY EXTRACT(YEAR FROM date::date), EXTRACT(MONTH FROM date::date)
       ORDER BY EXTRACT(YEAR FROM date::date) DESC, EXTRACT(MONTH FROM date::date) DESC
       LIMIT 3`,
      [user.userId, currentYear, currentMonth]
    );
    interface MonthTotal { total: string; }
    const last3Totals = last3MonthsTotalsResult.rows.map((r: MonthTotal) => Number(r.total));
    const avgLast3 = last3Totals.length > 0 ? last3Totals.reduce((a: number, b: number) => a + b, 0) / last3Totals.length : 0;
    if (avgLast3 > 0 && thisTotal < avgLast3) {
      const ach = await db.query('SELECT id FROM achievements WHERE user_id = $1 AND type = $2', [user.userId, 'saved_month']);
      if (!ach.rows[0]) {
        await db.query('INSERT INTO achievements (id, user_id, type, description) VALUES ($1, $2, $3, $4)',
          [uuidv4(), user.userId, 'saved_month', 'Economizou no mês!']);
      }
    }

    const budgetsResult = await db.query(
      `SELECT b.category_id, b.amount AS budget_amount
       FROM budgets b
       WHERE b.user_id = $1`,
      [user.userId]
    );
    interface Budget { category_id: string; budget_amount: string; }
    const budgets: Budget[] = budgetsResult.rows;
    if (budgets.length > 0) {
      const expensesByCategoryResult = await db.query(
        `SELECT category_id, COALESCE(SUM(amount), 0) as total
         FROM expenses
         WHERE user_id = $1 AND EXTRACT(YEAR FROM date::date) = $2 AND EXTRACT(MONTH FROM date::date) = $3
         GROUP BY category_id`,
        [user.userId, currentYear, currentMonth]
      );
      interface CategoryExpense { category_id: string; total: string; }
      const expensesByCategory: CategoryExpense[] = expensesByCategoryResult.rows;
      const allUnderBudget = budgets.every((b: Budget) => {
        const spent = expensesByCategory.find((e: CategoryExpense) => e.category_id === b.category_id)?.total || '0';
        return Number(spent) <= Number(b.budget_amount);
      });
      if (allUnderBudget) {
        const ach = await db.query('SELECT id FROM achievements WHERE user_id = $1 AND type = $2', [user.userId, 'under_budget']);
        if (!ach.rows[0]) {
          await db.query('INSERT INTO achievements (id, user_id, type, description) VALUES ($1, $2, $3, $4)',
            [uuidv4(), user.userId, 'under_budget', 'Gastos abaixo do orçamento em todas as categorias!']);
        }
      }
    }
    
    // 3. Meta atingida
    const goalsResult = await db.query(
      `SELECT id, current_amount, target_amount, completed
       FROM financial_goals
       WHERE user_id = $1 AND completed = false`,
      [user.userId]
    );
    for (const goal of goalsResult.rows) {
      if (Number(goal.current_amount) >= Number(goal.target_amount)) {
        await db.query('UPDATE financial_goals SET completed = true WHERE id = $1', [goal.id]);
        const ach = await db.query('SELECT id FROM achievements WHERE user_id = $1 AND type = $2', [user.userId, 'goal_achieved']);
        if (!ach.rows[0]) {
          await db.query('INSERT INTO achievements (id, user_id, type, description) VALUES ($1, $2, $3, $4)',
            [uuidv4(), user.userId, 'goal_achieved', 'Primeira meta financeira atingida!']);
        }
      }
    }
    
    const categoryStatsResult = await db.query(
      `SELECT 
        c.id,
        c.name,
        c.color,
        c.icon,
        COALESCE(SUM(e.amount), 0) as total,
        COUNT(e.id) as count
      FROM categories c
      LEFT JOIN expenses e ON c.id = e.category_id 
        AND e.user_id = $1 
        AND EXTRACT(YEAR FROM e.date::date) = $2 
        AND EXTRACT(MONTH FROM e.date::date) = $3
      WHERE c.user_id = $1
      GROUP BY c.id, c.name, c.color, c.icon
      ORDER BY total DESC`,
      [user.userId, currentYear, currentMonth]
    );
    const categoryStats = categoryStatsResult.rows;
    
    const recentExpensesResult = await db.query(
      `SELECT e.*, c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM expenses e
      LEFT JOIN categories c ON e.category_id = c.id
      WHERE e.user_id = $1
        AND EXTRACT(YEAR FROM e.date::date) = $2
        AND EXTRACT(MONTH FROM e.date::date) = $3
      ORDER BY e.date DESC
      LIMIT 10`,
      [user.userId, currentYear, currentMonth]
    );
    const recentExpenses = recentExpensesResult.rows;
    
    const lastTotal = lastMonthTotal.total;
    const percentageChange = lastTotal > 0 ? ((thisTotal - lastTotal) / lastTotal) * 100 : 0;
    
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const currentDay = now.getDate();
    const nonRecurringTotal = thisMonthNonRecurring.total;
    const dailyAverage = nonRecurringTotal / currentDay;

    const recurringRowsResult = await db.query(
      `SELECT amount
      FROM expenses
      WHERE user_id = $1 AND recurring = true AND recurring_type = 'monthly'
        AND EXTRACT(YEAR FROM date::date) = $2
        AND EXTRACT(MONTH FROM date::date) = $3`,
      [user.userId, currentYear, currentMonth]
    );
    const recurringRows = recurringRowsResult.rows;
    const recurringTotal = recurringRows.reduce((sum, row) => sum + Number(row.amount), 0);

    const projectedMonthlyTotal = (dailyAverage * daysInMonth) + recurringTotal;
    
    const stats = {
      totalThisMonth: thisTotal,
      totalLastMonth: lastTotal,
      percentageChange,
      dailyAverage,
      projectedMonthlyTotal,
      categoryStats,
      recentExpenses,
      topCategories: categoryStats.slice(0, 5).map(cat => ({
        categoryId: cat.id,
        name: cat.name,
        amount: cat.total,
        percentage: thisTotal > 0 ? (cat.total / thisTotal) * 100 : 0,
        color: cat.color,
        icon: cat.icon
      }))
    };
    
    return NextResponse.json(stats);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    console.error('Error fetching stats:', error);
    return NextResponse.json({ error: 'Failed to fetch statistics' }, { status: 500 });
  }
}
