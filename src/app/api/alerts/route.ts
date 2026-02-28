import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { requireAuth } from '@/lib/auth';

interface BillRow {
  id: string;
  description: string;
  amount: number;
  due_date: string;
  status: string;
  category_name: string | null;
  color: string | null;
  icon: string | null;
}

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const db = await getDatabase();

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
      mapTotals.set(row.category_id, Number(row.total));
    }

    const budgetAlerts = budgets.map((b) => {
      const spent = mapTotals.get(b.category_id) ?? 0;
      const usage = b.budget_amount > 0 ? (spent / b.budget_amount) : 0;

      let level: 'ok' | 'warning' | 'danger' = 'ok';
      if (usage >= 1) level = 'danger';
      else if (usage >= 0.8) level = 'warning';

      return {
        type: 'budget' as const,
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

    // Pico de gastos considerando o mês atual
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
    const dailyAvg = currentDay > 0 ? (Number(totals.total) / currentDay) : 0;
    const lastDayTotal = Number(lastDayTotalRow.total);

    const spike = dailyAvg > 0 && lastDayTotal > dailyAvg * 2;

    const spikeAlert = spike
      ? [{
          type: 'spike' as const,
          message: 'Gasto do último dia acima do dobro da média diária deste mês',
          lastDayTotal,
          dailyAvg
        }]
      : [];

    // Alertas de contas a pagar
    const billAlertsResult = await db.query(
      `SELECT b.id, b.description, b.amount, b.due_date, b.status, 
              c.name as category_name, c.color, c.icon
       FROM bills b
       LEFT JOIN categories c ON b.category_id = c.id
       WHERE b.user_id = $1 
         AND b.status = 'pending' 
         AND b.due_date <= NOW() + INTERVAL '7 days'
       ORDER BY b.due_date ASC`,
      [user.userId]
    );

    console.log('📊 Bill Alerts Query Result:', billAlertsResult.rows.length > 0 ? billAlertsResult.rows[0] : 'No bills found');

    const billAlerts = billAlertsResult.rows.map((bill: BillRow) => {
      const dueDate = new Date(bill.due_date);
      const isOverdue = dueDate < now;

      const daysUntilDue = Math.ceil(
        (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        type: 'bill' as const,
        billId: bill.id,
        description: bill.description,
        amount: bill.amount,
        dueDate: bill.due_date || new Date().toISOString(), // Fallback para data atual se não houver
        categoryName: bill.category_name,
        color: bill.color,
        icon: bill.icon,
        isOverdue,
        daysUntilDue,
        level: isOverdue ? 'danger' : (daysUntilDue <= 3 ? 'warning' : 'ok')
      };
    });

    return NextResponse.json({
      alerts: [...budgetAlerts, ...spikeAlert, ...billAlerts]
    });

  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    console.error('Erro ao gerar alertas:', error);
    return NextResponse.json({ error: 'Falha ao gerar alertas' }, { status: 500 });
  }
}
