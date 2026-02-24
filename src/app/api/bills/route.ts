import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { requireAuth } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const db = await getDatabase();
    const { searchParams } = new URL(request.url);
  const status = searchParams.get('status'); // pending, paid, overdue, all
  const month = searchParams.get('month');
  const year = searchParams.get('year');

    if (month && year) {
      // Use a CTE to project recurring bills into the requested month/year
      const params: Array<string | number> = [user.userId, Number(month), Number(year)];
      let paramIndex = 4;

      let cteQuery = `
        WITH projected AS (
          SELECT
            b.*,
            CASE
              WHEN b.recurring = true AND b.recurring_type = 'monthly'
                   AND NOT (EXTRACT(MONTH FROM b.due_date) = $2 AND EXTRACT(YEAR FROM b.due_date) = $3)
              -- Keep the same day-of-month, but cap to the last day of the target month
              -- e.g. a bill due on Jan 31 projected to Feb becomes Feb 28/29
              THEN MAKE_DATE($3::int, $2::int,
                     LEAST(EXTRACT(DAY FROM b.due_date)::int,
                           EXTRACT(DAY FROM (DATE_TRUNC('month', MAKE_DATE($3::int, $2::int, 1)) + INTERVAL '1 month' - INTERVAL '1 day'))::int
                     ))::timestamp
              WHEN b.recurring = true AND b.recurring_type = 'yearly'
                   AND EXTRACT(MONTH FROM b.due_date) = $2
                   AND EXTRACT(YEAR FROM b.due_date) < $3
              THEN MAKE_DATE($3::int, $2::int, EXTRACT(DAY FROM b.due_date)::int)::timestamp
              ELSE b.due_date
            END AS projected_due_date,
            CASE
              WHEN b.recurring = true
                   AND NOT (EXTRACT(MONTH FROM b.due_date) = $2 AND EXTRACT(YEAR FROM b.due_date) = $3)
              THEN 'pending'::text
              ELSE b.status
            END AS effective_status
          FROM bills b
          WHERE b.user_id = $1
            AND (
              (EXTRACT(MONTH FROM b.due_date) = $2 AND EXTRACT(YEAR FROM b.due_date) = $3)
              OR (b.recurring = true AND b.recurring_type = 'monthly'
                  AND (EXTRACT(YEAR FROM b.due_date) < $3
                       OR (EXTRACT(YEAR FROM b.due_date) = $3 AND EXTRACT(MONTH FROM b.due_date) < $2)))
              OR (b.recurring = true AND b.recurring_type = 'yearly'
                  AND EXTRACT(MONTH FROM b.due_date) = $2
                  AND EXTRACT(YEAR FROM b.due_date) < $3)
            )
        )
        SELECT p.*, c.name as category_name, c.color as category_color, c.icon as category_icon
        FROM projected p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE 1=1
      `;

      if (status && status !== 'all') {
        if (status === 'overdue') {
          cteQuery += ` AND p.effective_status = 'pending' AND p.projected_due_date < NOW()`;
        } else {
          cteQuery += ` AND p.effective_status = $${paramIndex}`;
          params.push(status);
          paramIndex++;
        }
      }

      cteQuery += ` ORDER BY p.projected_due_date ASC`;

      const result = await db.query(cteQuery, params);

      const rows = result.rows.map((row: Record<string, unknown>) => ({
        ...row,
        due_date: row.projected_due_date,
        status: row.effective_status,
      }));

      return NextResponse.json(rows);
    }

    let query = `
      SELECT b.*, c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM bills b
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE b.user_id = $1
    `;
    const params: Array<string | number> = [user.userId];

    let paramIndex = 2;
    if (status && status !== 'all') {
      if (status === 'overdue') {
        query += ` AND b.status = 'pending' AND b.due_date < NOW()`;
      } else {
        query += ` AND b.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }
    }

    query += ` ORDER BY b.due_date ASC`;

    const result = await db.query(query, params);

    return NextResponse.json(result.rows);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    console.error('Error fetching bills:', error);
    return NextResponse.json({ error: 'Failed to fetch bills' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const db = await getDatabase();
    const body = await request.json();

    const { description, amount, dueDate, categoryId, recurring, recurringType, notes } = body;

    if (!description || !amount || !dueDate) {
      return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 });
    }

    const id = uuidv4();
    await db.query(
      `INSERT INTO bills (id, user_id, description, amount, due_date, category_id, recurring, recurring_type, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')`,
      [id, user.userId, description, amount, dueDate, categoryId || null, recurring || false, recurringType || null, notes || null]
    );

    const result = await db.query(
      `SELECT b.*, c.name as category_name, c.color as category_color, c.icon as category_icon
       FROM bills b
       LEFT JOIN categories c ON b.category_id = c.id
       WHERE b.id = $1`,
      [id]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    console.error('Error creating bill:', error);
    return NextResponse.json({ error: 'Failed to create bill' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const db = await getDatabase();
    const body = await request.json();

    const { id, description, amount, dueDate, categoryId, status, paidDate, recurring, recurringType, notes } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });
    }

    // Verificar se a conta pertence ao usuário
    const checkResult = await db.query('SELECT * FROM bills WHERE id = $1 AND user_id = $2', [id, user.userId]);
    if (checkResult.rows.length === 0) {
      return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 });
    }

    const existing = checkResult.rows[0];

    // Use valores do body ou mantenha os valores existentes
    const finalDescription = description !== undefined ? description : existing.description;
    const finalAmount = amount !== undefined ? amount : existing.amount;
    const finalDueDate = dueDate !== undefined ? dueDate : existing.due_date;
    const finalCategoryId = categoryId !== undefined ? categoryId : existing.category_id;
    const finalStatus = status !== undefined ? status : existing.status;
    const finalPaidDate = paidDate !== undefined ? paidDate : existing.paid_date;
    const finalRecurring = recurring !== undefined ? recurring : existing.recurring;
    const finalRecurringType = recurringType !== undefined ? recurringType : existing.recurring_type;
    const finalNotes = notes !== undefined ? notes : existing.notes;

    await db.query(
      `UPDATE bills SET description = $1, amount = $2, due_date = $3, category_id = $4, status = $5, paid_date = $6, recurring = $7, recurring_type = $8, notes = $9
       WHERE id = $10 AND user_id = $11`,
      [finalDescription, finalAmount, finalDueDate, finalCategoryId || null, finalStatus, finalPaidDate || null, finalRecurring || false, finalRecurringType || null, finalNotes || null, id, user.userId]
    );

    const result = await db.query(
      `SELECT b.*, c.name as category_name, c.color as category_color, c.icon as category_icon
       FROM bills b
       LEFT JOIN categories c ON b.category_id = c.id
       WHERE b.id = $1`,
      [id]
    );

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    console.error('Error updating bill:', error);
    return NextResponse.json({ error: 'Failed to update bill', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const db = await getDatabase();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });
    }

    const result = await db.query('DELETE FROM bills WHERE id = $1 AND user_id = $2 RETURNING id', [id, user.userId]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Conta excluída com sucesso' });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    console.error('Error deleting bill:', error);
    return NextResponse.json({ error: 'Failed to delete bill' }, { status: 500 });
  }
}
