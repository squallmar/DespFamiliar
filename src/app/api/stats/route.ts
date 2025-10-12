import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const db = await getDatabase();
    
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    
    // Total deste mês
    const thisMonthTotalResult = await db.query(
      `SELECT COALESCE(SUM(amount), 0) as total
      FROM expenses 
      WHERE user_id = $1 
      AND EXTRACT(YEAR FROM date::date) = $2 
      AND EXTRACT(MONTH FROM date::date) = $3`,
      [user.userId, currentYear, currentMonth]
    );
    const thisMonthTotal = thisMonthTotalResult.rows[0] || { total: 0 };
    
    // Total de despesas NÃO-recorrentes deste mês (para cálculo da projeção)
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
    
    // Total do mês passado
    const lastMonthTotalResult = await db.query(
      `SELECT COALESCE(SUM(amount), 0) as total
      FROM expenses 
      WHERE user_id = $1 
      AND EXTRACT(YEAR FROM date::date) = $2 
      AND EXTRACT(MONTH FROM date::date) = $3`,
      [user.userId, lastMonthYear, lastMonth]
    );
    const lastMonthTotal = lastMonthTotalResult.rows[0] || { total: 0 };
    
    // Gastos por categoria (este mês)
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
    
    // Últimas despesas
    const recentExpensesResult = await db.query(
      `SELECT e.*, c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM expenses e
      LEFT JOIN categories c ON e.category_id = c.id
      WHERE e.user_id = $1
      ORDER BY e.date DESC
      LIMIT 10`,
      [user.userId]
    );
    const recentExpenses = recentExpensesResult.rows;
    
    // Calcular percentual de mudança (usando o total completo)
    const thisTotal = thisMonthTotal.total;
    const lastTotal = lastMonthTotal.total;
    const percentageChange = lastTotal > 0 ? ((thisTotal - lastTotal) / lastTotal) * 100 : 0;
    
    // Média diária baseada APENAS em despesas não-recorrentes
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const currentDay = now.getDate();
    const nonRecurringTotal = thisMonthNonRecurring.total;
    const dailyAverage = nonRecurringTotal / currentDay;

    // Soma das despesas recorrentes mensais cadastradas
    const recurringRowsResult = await db.query(
      `SELECT amount
      FROM expenses
      WHERE user_id = $1 AND recurring = true AND recurring_type = 'monthly'`,
      [user.userId]
    );
    const recurringRows = recurringRowsResult.rows;
    const recurringTotal = recurringRows.reduce((sum, row) => sum + Number(row.amount), 0);

    // Projeção corrigida: 
    // (média diária das não-recorrentes * dias do mês) + despesas recorrentes mensais
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