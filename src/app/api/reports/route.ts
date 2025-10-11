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

    // Totais por categoria no período
    const totalsByCategory = await db.all(
      `SELECT c.id as categoryId, c.name, c.color, c.icon,
              COALESCE(SUM(e.amount), 0) as total
       FROM categories c
       LEFT JOIN expenses e
         ON e.category_id = c.id
        AND e.user_id = ?
        AND date(e.date) BETWEEN date(?) AND date(?)
       WHERE c.user_id = ?
       GROUP BY c.id, c.name, c.color, c.icon
       ORDER BY total DESC`,
      [user.userId, from.toISOString(), to.toISOString(), user.userId]
    );

    // Totais diários
    const dailyTotals = await db.all(
      `SELECT date(date) as day, COALESCE(SUM(amount), 0) as total
       FROM expenses
       WHERE user_id = ? AND date(date) BETWEEN date(?) AND date(?)
       GROUP BY day
       ORDER BY day ASC`,
      [user.userId, from.toISOString(), to.toISOString()]
    );

    // Totais mensais (YYYY-MM)
    const monthlyTotals = await db.all(
      `SELECT strftime('%Y-%m', date) as ym, COALESCE(SUM(amount), 0) as total
       FROM expenses
       WHERE user_id = ? AND date(date) BETWEEN date(?) AND date(?)
       GROUP BY ym
       ORDER BY ym ASC`,
      [user.userId, from.toISOString(), to.toISOString()]
    );

    return NextResponse.json({ totalsByCategory, dailyTotals, monthlyTotals });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    console.error('Erro ao gerar relatório:', error);
    return NextResponse.json({ error: 'Falha ao gerar relatório' }, { status: 500 });
  }
}
