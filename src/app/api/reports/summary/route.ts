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

    // Totais (despesas + contas pagas)
    const totalResult = await db.query(
        `SELECT COALESCE(SUM(total), 0) as total FROM (
           SELECT COALESCE(SUM(e.amount), 0) as total
           FROM expenses e
           WHERE e.user_id = $1 AND date(e.date) BETWEEN date($2) AND date($3)
           UNION ALL
           SELECT COALESCE(SUM(b.amount), 0) as total
           FROM bills b
           WHERE b.user_id = $1 AND b.status = 'paid' AND b.paid_date IS NOT NULL AND (b.notes IS NULL OR b.notes NOT LIKE 'orig:expense:%') AND date(b.paid_date) BETWEEN date($2) AND date($3)
         ) t`,
        [user.userId, from.toISOString(), to.toISOString()]
      );
      const total = totalResult.rows[0];
    // Top categorias (despesas + contas pagas)
    const topCategoriesResult = await db.query(
      `SELECT c.name, c.icon,
              COALESCE(SUM(e.amount), 0) + COALESCE(SUM(b.amount), 0) as total
       FROM categories c
       LEFT JOIN expenses e
         ON c.id = e.category_id
        AND e.user_id = $1
        AND date(e.date) BETWEEN date($2) AND date($3)
       LEFT JOIN bills b
         ON c.id = b.category_id
        AND b.user_id = $1
        AND b.status = 'paid'
        AND b.paid_date IS NOT NULL
        AND (b.notes IS NULL OR b.notes NOT LIKE 'orig:expense:%')
        AND date(b.paid_date) BETWEEN date($2) AND date($3)
       WHERE c.user_id = $4
       GROUP BY c.id, c.name, c.icon
       ORDER BY total DESC
       LIMIT 3`,
      [user.userId, from.toISOString(), to.toISOString(), user.userId]
    );
    const topCategoriesBase = topCategoriesResult.rows as Array<{ name: string; icon: string; total: number }>;
    // Adiciona bucket 'Sem categoria' (contas pagas sem categoria)
    const uncategorizedBillsRes = await db.query(
      `SELECT COALESCE(SUM(b.amount), 0) as total
       FROM bills b
       WHERE b.user_id = $1
         AND b.status = 'paid'
         AND b.paid_date IS NOT NULL
         AND b.category_id IS NULL
         AND (b.notes IS NULL OR b.notes NOT LIKE 'orig:expense:%')
         AND date(b.paid_date) BETWEEN date($2) AND date($3)`,
      [user.userId, from.toISOString(), to.toISOString()]
    );
    const uncategorizedTotal = Number(uncategorizedBillsRes.rows[0]?.total || 0);
    let topCategories = topCategoriesBase.slice();
    if (uncategorizedTotal > 0) {
      topCategories.push({ name: 'Sem categoria', icon: '❔', total: uncategorizedTotal });
    }
    topCategories = topCategories.sort((a, b) => Number(b.total) - Number(a.total)).slice(0, 3);

    // Gastos diários (despesas + contas pagas)
    const dailyResult = await db.query(
      `SELECT day, SUM(total) as total FROM (
         SELECT date(e.date) as day, COALESCE(SUM(e.amount), 0) as total
         FROM expenses e
         WHERE e.user_id = $1 AND date(e.date) BETWEEN date($2) AND date($3)
         GROUP BY date(e.date)
         UNION ALL
         SELECT date(b.paid_date) as day, COALESCE(SUM(b.amount), 0) as total
         FROM bills b
         WHERE b.user_id = $1 AND b.status = 'paid' AND b.paid_date IS NOT NULL AND (b.notes IS NULL OR b.notes NOT LIKE 'orig:expense:%') AND date(b.paid_date) BETWEEN date($2) AND date($3)
         GROUP BY date(b.paid_date)
       ) t
       GROUP BY day
       ORDER BY day ASC`,
      [user.userId, from.toISOString(), to.toISOString()]
    );
    const daily = dailyResult.rows;
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
