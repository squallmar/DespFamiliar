import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const db = await getDatabase();

    const { searchParams } = new URL(request.url);
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');

    if (!fromParam || !toParam) {
      return NextResponse.json({ error: 'Parâmetros from e to são obrigatórios (YYYY-MM-DD)' }, { status: 400 });
    }

    const from = new Date(fromParam);
    const to = new Date(toParam);
    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      return NextResponse.json({ error: 'Formato de data inválido' }, { status: 400 });
    }

    // Totais por categoria no período (despesas + contas pagas)
    const totalsByCategoryResult = await db.query(
      `SELECT c.id as categoryId, c.name, c.color, c.icon,
              COALESCE(SUM(e.amount), 0) + COALESCE(SUM(b.amount), 0) as total
       FROM categories c
       LEFT JOIN expenses e
         ON e.category_id = c.id
        AND e.user_id = $1
        AND date(e.date) BETWEEN date($2) AND date($3)
       LEFT JOIN bills b
         ON b.category_id = c.id
        AND b.user_id = $1
        AND b.status = 'paid'
        AND b.paid_date IS NOT NULL
        AND (b.notes IS NULL OR b.notes NOT LIKE 'orig:expense:%')
        AND date(b.paid_date) BETWEEN date($2) AND date($3)
       WHERE c.user_id = $4
       GROUP BY c.id, c.name, c.color, c.icon
       ORDER BY total DESC`,
      [user.userId, from.toISOString(), to.toISOString(), user.userId]
    );
    const totalsByCategory = totalsByCategoryResult.rows as Array<{ categoryId: string; name: string; color: string; icon: string; total: number }>; 

    // Somatório de contas pagas SEM categoria, para manter consistência com diários/mensais
    const uncategorizedBillsResult = await db.query(
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
    const uncategorizedBillsTotal = Number(uncategorizedBillsResult.rows[0]?.total || 0);
    if (uncategorizedBillsTotal > 0) {
      const uncategorizedRow: { categoryId: string; name: string; color: string; icon: string; total: number } = {
        categoryId: 'uncategorized',
        name: 'Sem categoria',
        color: '#9CA3AF', // gray-400
        icon: '❔',
        total: uncategorizedBillsTotal,
      };
      totalsByCategory.push(uncategorizedRow);
    }

    // Totais diários (despesas + contas pagas)
    const dailyTotalsResult = await db.query(
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
    const dailyTotals = dailyTotalsResult.rows;

    // Totais mensais (YYYY-MM) (despesas + contas pagas)
    const monthlyTotalsResult = await db.query(
      `SELECT ym, SUM(total) as total FROM (
         SELECT to_char(e.date, 'YYYY-MM') as ym, COALESCE(SUM(e.amount), 0) as total
         FROM expenses e
         WHERE e.user_id = $1 AND date(e.date) BETWEEN date($2) AND date($3)
         GROUP BY to_char(e.date, 'YYYY-MM')
         UNION ALL
         SELECT to_char(b.paid_date, 'YYYY-MM') as ym, COALESCE(SUM(b.amount), 0) as total
         FROM bills b
         WHERE b.user_id = $1 AND b.status = 'paid' AND b.paid_date IS NOT NULL AND (b.notes IS NULL OR b.notes NOT LIKE 'orig:expense:%') AND date(b.paid_date) BETWEEN date($2) AND date($3)
         GROUP BY to_char(b.paid_date, 'YYYY-MM')
       ) t
       GROUP BY ym
       ORDER BY ym ASC`,
      [user.userId, from.toISOString(), to.toISOString()]
    );
    const monthlyTotals = monthlyTotalsResult.rows;

    return NextResponse.json({ totalsByCategory, dailyTotals, monthlyTotals });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    console.error('Erro ao gerar relatório:', error);
    return NextResponse.json({ error: 'Falha ao gerar relatório' }, { status: 500 });
  }
}
