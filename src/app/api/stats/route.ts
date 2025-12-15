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
    const thisExpensesTotal = Number(thisMonthTotal.total || 0);
    // incluir contas (bills) no total deste mês
    const thisTotal = thisExpensesTotal + billsThisMonth;
    
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
    // Somar também contas (bills) com due_date no mês atual
    const billsThisMonthResult = await db.query(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM bills
       WHERE user_id = $1
         AND EXTRACT(YEAR FROM due_date::date) = $2
         AND EXTRACT(MONTH FROM due_date::date) = $3`,
      [user.userId, currentYear, currentMonth]
    );
    const billsThisMonth = Number(billsThisMonthResult.rows[0]?.total || 0);
    
    const lastMonthTotalResult = await db.query(
      `SELECT COALESCE(SUM(amount), 0) as total
      FROM expenses 
      WHERE user_id = $1 
      AND EXTRACT(YEAR FROM date::date) = $2 
      AND EXTRACT(MONTH FROM date::date) = $3`,
      [user.userId, lastMonthYear, lastMonth]
    );
    const lastMonthExpensesTotal = lastMonthTotalResult.rows[0] || { total: 0 };
    const lastMonthTotal = Number(lastMonthExpensesTotal.total || 0) + billsLastMonth;
    const billsLastMonthResult = await db.query(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM bills
       WHERE user_id = $1
         AND EXTRACT(YEAR FROM due_date::date) = $2
         AND EXTRACT(MONTH FROM due_date::date) = $3`,
      [user.userId, lastMonthYear, lastMonth]
    );
    const billsLastMonth = Number(billsLastMonthResult.rows[0]?.total || 0);

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
    const last3Totals = last3MonthsTotalsResult.rows.map((r: MonthTotal) => Number(r.total || 0));
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
    // transformar resultado de categorias (apenas com expenses) e somar valores de bills por categoria
    const categoryStatsMap: Record<string, any> = {};
    for (const c of categoryStatsResult.rows) {
      categoryStatsMap[c.id] = {
        id: c.id,
        name: c.name,
        color: c.color,
        icon: c.icon,
        total: Number(c.total || 0),
        count: Number(c.count || 0)
      };
    }
    // buscar soma de bills por categoria no mês atual
    const billsByCategoryResult = await db.query(
      `SELECT category_id, COALESCE(SUM(amount),0) as total, COUNT(id) as count
       FROM bills
       WHERE user_id = $1
         AND EXTRACT(YEAR FROM due_date::date) = $2
         AND EXTRACT(MONTH FROM due_date::date) = $3
       GROUP BY category_id`,
      [user.userId, currentYear, currentMonth]
    );
    for (const b of billsByCategoryResult.rows) {
      const catId = b.category_id;
      if (!catId) continue;
      if (!categoryStatsMap[catId]) {
        // categoria existe no banco, mas não tinha despesas — buscar nome/icone
        const cat = (await db.query('SELECT id, name, color, icon FROM categories WHERE id = $1', [catId])).rows[0];
        categoryStatsMap[catId] = {
          id: cat?.id || catId,
          name: cat?.name || 'Sem categoria',
          color: cat?.color || '#ddd',
          icon: cat?.icon || '📦',
          total: 0,
          count: 0
        };
      }
      categoryStatsMap[catId].total += Number(b.total || 0);
      categoryStatsMap[catId].count += Number(b.count || 0);
    }
    const categoryStats = Object.values(categoryStatsMap).sort((a: any, b: any) => b.total - a.total);
    
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
    const recentExpensesFromExpenses = recentExpensesResult.rows.map((e: any) => ({
      id: e.id,
      type: 'expense',
      description: e.description,
      amount: Number(e.amount || 0),
      date: e.date,
      category_id: e.category_id,
      category_name: e.category_name,
      category_color: e.category_color,
      category_icon: e.category_icon,
    }));
    // buscar últimos bills do mês e unir com expenses
    const recentBillsResult = await db.query(
      `SELECT b.*, c.name as category_name, c.color as category_color, c.icon as category_icon
       FROM bills b
       LEFT JOIN categories c ON b.category_id = c.id
       WHERE b.user_id = $1
         AND EXTRACT(YEAR FROM b.due_date::date) = $2
         AND EXTRACT(MONTH FROM b.due_date::date) = $3
       ORDER BY b.due_date DESC
       LIMIT 10`,
      [user.userId, currentYear, currentMonth]
    );
    const recentExpensesFromBills = recentBillsResult.rows.map((b: any) => ({
      id: b.id,
      type: 'bill',
      description: b.description || b.title || '',
      amount: Number(b.amount || 0),
      date: b.due_date,
      category_id: b.category_id,
      category_name: b.category_name,
      category_color: b.category_color,
      category_icon: b.category_icon,
    }));
    // mesclar, ordenar por data e limitar
    const mergedRecent = [...recentExpensesFromExpenses, ...recentExpensesFromBills]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);
    const recentExpenses = mergedRecent;
    
    const lastTotal = Number(lastMonthTotal.total || 0);
    const percentageChange = lastTotal > 0 ? ((thisTotal - lastTotal) / lastTotal) * 100 : 0;
    
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const currentDay = now.getDate();
    const nonRecurringTotal = Number(thisMonthNonRecurring.total || 0);
    const dailyAverage = currentDay > 0 ? (nonRecurringTotal / currentDay) : 0;

    const recurringRowsResult = await db.query(
      `SELECT amount
      FROM expenses
      WHERE user_id = $1 AND recurring = true AND recurring_type = 'monthly'
        AND EXTRACT(YEAR FROM date::date) = $2
        AND EXTRACT(MONTH FROM date::date) = $3`,
      [user.userId, currentYear, currentMonth]
    );
    const recurringRows = recurringRowsResult.rows;
    const recurringTotalExpenses = recurringRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    // incluir bills recorrentes
    const recurringBillsResult = await db.query(
      `SELECT amount FROM bills WHERE user_id = $1 AND recurring = true AND recurring_type = 'monthly'
       AND EXTRACT(YEAR FROM due_date::date) = $2
       AND EXTRACT(MONTH FROM due_date::date) = $3`,
      [user.userId, currentYear, currentMonth]
    );
    const recurringBillsTotal = recurringBillsResult.rows.reduce((sum: number, row: any) => sum + Number(row.amount || 0), 0);
    const recurringTotal = recurringTotalExpenses + recurringBillsTotal;

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
        amount: Number(cat.total || 0),
        percentage: thisTotal > 0 ? (Number(cat.total || 0) / thisTotal) * 100 : 0,
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
