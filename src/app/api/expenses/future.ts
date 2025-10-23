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
    return NextResponse.json(result.rows);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    console.error('Error fetching future expenses:', error);
    return NextResponse.json({ error: 'Failed to fetch future expenses' }, { status: 500 });
  }
}
