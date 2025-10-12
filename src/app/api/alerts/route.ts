import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const db = await getDatabase();

    // Orçamentos x despesas do mês atual
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');

    const budgetsResult = await db.query(
      `SELECT b.id, b.category_id, b.amount AS budget_amount, c.name AS category_name, c.color, c.icon
       FROM budgets b
       JOIN categories c ON c.id = b.category_id
       WHERE b.user_id = $1`,
      [user.userId]
    );
    const budgets = budgetsResult.rows;

    const expensesByCategoryResult = await db.query(
      `SELECT category_id, COALESCE(SUM(amount), 0) as total
       FROM expenses
       WHERE user_id = $1 AND EXTRACT(YEAR FROM date::date) = $2 AND EXTRACT(MONTH FROM date::date) = $3
       GROUP BY category_id`,
      [user.userId, year, month]
    );
    const expensesByCategory = expensesByCategoryResult.rows;

    const mapTotals = new Map<string, number>();
    for (const row of expensesByCategory) {
      mapTotals.set(row.category_id, row.total);
    }

    const budgetAlerts = budgets.map((b) => {
      const spent = mapTotals.get(b.category_id) ?? 0;
      const usage = b.budget_amount > 0 ? (spent / b.budget_amount) : 0;
      let level: 'ok' | 'warning' | 'danger' = 'ok';
      if (usage >= 1) level = 'danger';
      else if (usage >= 0.8) level = 'warning';
      return {
        type: 'budget',
        categoryId: b.category_id,
        categoryName: b.category_name,
        color: b.color,
        icon: b.icon,
        budget: b.budget_amount,
        spent,
        usage,
        level
      };
    });

    // Pico de gastos (mês atual): média diária x último dia
    const totalsResult = await db.query(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM expenses
       WHERE user_id = $1 AND EXTRACT(YEAR FROM date::date) = $2 AND EXTRACT(MONTH FROM date::date) = $3`,
      [user.userId, year, month]
    );
    const totals = totalsResult.rows[0] || { total: 0 };

    const lastDayStr = now.toISOString().slice(0, 10);
    const lastDayTotalResult = await db.query(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM expenses
       WHERE user_id = $1 AND date::date = $2::date`,
      [user.userId, lastDayStr]
    );
    const lastDayTotalRow = lastDayTotalResult.rows[0] || { total: 0 };

    const currentDay = now.getDate();
    const dailyAvg = currentDay > 0 ? (totals.total / currentDay) : 0;
    const lastDayTotal = lastDayTotalRow.total;
    const spike = dailyAvg > 0 && lastDayTotal > dailyAvg * 2; // heurística

    const spikeAlert = spike ? [{
      type: 'spike',
      message: 'Gasto do último dia acima do dobro da média diária deste mês',
      lastDayTotal,
      dailyAvg
    }] : [];

    return NextResponse.json({ alerts: [...budgetAlerts, ...spikeAlert] });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    console.error('Erro ao gerar alertas:', error);
    return NextResponse.json({ error: 'Falha ao gerar alertas' }, { status: 500 });
  }
}
