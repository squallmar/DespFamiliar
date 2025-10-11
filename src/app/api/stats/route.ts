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
    const thisMonthTotal = await db.get(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM expenses 
      WHERE user_id = ? 
      AND strftime('%Y', date) = ? 
      AND strftime('%m', date) = ?
    `, [user.userId, currentYear.toString(), currentMonth.toString().padStart(2, '0')]);
    
    // Total do mês passado
    const lastMonthTotal = await db.get(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM expenses 
      WHERE user_id = ? 
      AND strftime('%Y', date) = ? 
      AND strftime('%m', date) = ?
    `, [user.userId, lastMonthYear.toString(), lastMonth.toString().padStart(2, '0')]);
    
    // Gastos por categoria (este mês)
    const categoryStats = await db.all(`
      SELECT 
        c.id,
        c.name,
        c.color,
        c.icon,
        COALESCE(SUM(e.amount), 0) as total,
        COUNT(e.id) as count
      FROM categories c
      LEFT JOIN expenses e ON c.id = e.category_id 
        AND e.user_id = ? 
        AND strftime('%Y', e.date) = ? 
        AND strftime('%m', e.date) = ?
      WHERE c.user_id = ?
      GROUP BY c.id, c.name, c.color, c.icon
      ORDER BY total DESC
    `, [user.userId, currentYear.toString(), currentMonth.toString().padStart(2, '0'), user.userId]);
    
    // Últimas despesas
    const recentExpenses = await db.all(`
      SELECT e.*, c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM expenses e
      LEFT JOIN categories c ON e.category_id = c.id
      WHERE e.user_id = ?
      ORDER BY e.date DESC
      LIMIT 10
    `, [user.userId]);
    
    // Calcular percentual de mudança
    const thisTotal = thisMonthTotal.total;
    const lastTotal = lastMonthTotal.total;
    const percentageChange = lastTotal > 0 ? ((thisTotal - lastTotal) / lastTotal) * 100 : 0;
    
    // Média diária (baseada nos dias do mês atual)
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const currentDay = now.getDate();
    const dailyAverage = thisTotal / currentDay;

    // Soma das despesas recorrentes mensais cadastradas
    const recurringRows = await db.all(`
      SELECT amount
      FROM expenses
      WHERE user_id = ? AND recurring = 1 AND recurring_type = 'monthly'
    `, [user.userId]);
    const recurringTotal = recurringRows.reduce((sum, row) => sum + Number(row.amount), 0);

    // Projeção: média diária * dias do mês + despesas recorrentes
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