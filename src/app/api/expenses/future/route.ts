import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const db = await getDatabase();
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    let query = `
      SELECT e.*, c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM expenses e
      LEFT JOIN categories c ON e.category_id = c.id
      WHERE e.user_id = $1
    `;
    const params: unknown[] = [user.userId];
    let paramIndex = 2;
    if (month && year) {
      query += ` AND EXTRACT(MONTH FROM e.date) = $${paramIndex} AND EXTRACT(YEAR FROM e.date) = $${paramIndex + 1}`;
      params.push(Number(month), Number(year));
      paramIndex += 2;
    } else {
      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10);
      query += ` AND e.date::date >= $${paramIndex}::date`;
      params.push(todayStr);
      paramIndex++;
    }
    query += ` ORDER BY e.date ASC`;
    const result = await db.query(query, params);
    let rows = result.rows;

    // Project recurring monthly expenses into periods with no existing entries
    if (month && year) {
      const reqMonth = Number(month);
      const reqYear = Number(year);

      // Fetch the most recent occurrence of each unique recurring monthly expense
      const recurringResult = await db.query(
        `SELECT DISTINCT ON (e.description, e.category_id, e.amount) e.*,
          c.name as category_name, c.color as category_color, c.icon as category_icon
         FROM expenses e
         LEFT JOIN categories c ON e.category_id = c.id
         WHERE e.user_id = $1 AND e.recurring = true AND e.recurring_type = 'monthly'
         ORDER BY e.description, e.category_id, e.amount, e.date DESC`,
        [user.userId]
      );

      // Build a set of keys already present for this period
      const existingKeys = new Set(
        rows.map((e: { description: string; category_id: string; amount: number }) =>
          `${e.description}||${e.category_id}||${e.amount}`)
      );

      // Project missing recurring expenses into the requested period
      const projected = recurringResult.rows
        .filter((e: { description: string; category_id: string; amount: number }) =>
          !existingKeys.has(`${e.description}||${e.category_id}||${e.amount}`)
        )
        .map((e: { date: string; id: string; [key: string]: unknown }) => {
          const origDay = new Date(e.date).getDate();
          const lastDay = new Date(reqYear, reqMonth, 0).getDate();
          const day = Math.min(origDay, lastDay);
          const projDate = `${reqYear}-${String(reqMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          return { ...e, date: projDate };
        });

      rows = [...rows, ...projected].sort(
        (a: { date: string }, b: { date: string }) =>
          new Date(a.date).getTime() - new Date(b.date).getTime()
      );
    }

    return NextResponse.json(rows);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    console.error('Error fetching future expenses:', error);
    return NextResponse.json({ error: 'Failed to fetch future expenses' }, { status: 500 });
  }
}
