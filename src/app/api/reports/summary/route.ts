import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { requireAuth } from '@/lib/auth';

function getPeriodRange(period: 'week' | 'month') {
  const now = new Date();
  if (period === 'week') {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // segunda a domingo
    const from = new Date(now.setDate(diff));
    from.setHours(0,0,0,0);
    const to = new Date();
    to.setHours(23,59,59,999);
    return { from, to };
  } else {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { from, to };
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const db = await getDatabase();
    const { searchParams } = new URL(request.url);
    const period = (searchParams.get('period') as 'week' | 'month') || 'month';
    const { from, to } = getPeriodRange(period);

    // Totais
    const total = await db.get(
      `SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE user_id = ? AND date(date) BETWEEN date(?) AND date(?)`,
      [user.userId, from.toISOString(), to.toISOString()]
    );
    // Top categorias
    const topCategories = await db.all(
      `SELECT c.name, c.icon, COALESCE(SUM(e.amount), 0) as total
       FROM categories c
       LEFT JOIN expenses e ON c.id = e.category_id AND e.user_id = ? AND date(e.date) BETWEEN date(?) AND date(?)
       WHERE c.user_id = ?
       GROUP BY c.id, c.name, c.icon
       ORDER BY total DESC
       LIMIT 3`,
      [user.userId, from.toISOString(), to.toISOString(), user.userId]
    );
    // Gastos diários
    const daily = await db.all(
      `SELECT date(date) as day, COALESCE(SUM(amount), 0) as total
       FROM expenses WHERE user_id = ? AND date(date) BETWEEN date(?) AND date(?)
       GROUP BY day ORDER BY day ASC`,
      [user.userId, from.toISOString(), to.toISOString()]
    );
    // Alertas (reaproveita lógica do /api/alerts)
    const alertsRes = await fetch(`${request.nextUrl.origin}/api/alerts`, { headers: { cookie: request.headers.get('cookie') || '' } });
    const alerts = alertsRes.ok ? await alertsRes.json() : [];

    return NextResponse.json({
      period,
      from,
      to,
      total: total.total,
      topCategories,
      daily,
      alerts: alerts.alerts || [],
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    console.error('Erro ao gerar resumo:', error);
    return NextResponse.json({ error: 'Falha ao gerar resumo' }, { status: 500 });
  }
}
