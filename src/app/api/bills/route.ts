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
    if (month && year) {
      query += ` AND EXTRACT(MONTH FROM b.due_date) = $${paramIndex} AND EXTRACT(YEAR FROM b.due_date) = $${paramIndex + 1}`;
      params.push(Number(month), Number(year));
      paramIndex += 2;
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

    const toYMD = (d: Date | string) => {
      const dt = typeof d === 'string' ? new Date(d) : d;
      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, '0');
      const day = String(dt.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    const clampDay = (year: number, monthIndex0: number, day: number) => {
      const lastDay = new Date(year, monthIndex0 + 1, 0).getDate();
      return Math.min(day, lastDay);
    };

    const firstId = uuidv4();

    if (recurring && recurringType) {
      const startDate = new Date(dueDate);
      if (recurringType === 'monthly') {
        const year = startDate.getFullYear();
        const month = startDate.getMonth(); // 0-based
        const day = startDate.getDate();
        for (let m = month; m < 12; m++) {
          const safeDay = clampDay(year, m, day);
          const billId = m === month ? firstId : uuidv4();
          const billDate = new Date(year, m, safeDay);
          await db.query(
            `INSERT INTO bills (id, user_id, description, amount, due_date, category_id, recurring, recurring_type, notes, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')`,
            [billId, user.userId, description, amount, toYMD(billDate), categoryId || null, true, recurringType, notes || null]
          );
        }
      } else if (recurringType === 'weekly') {
        const current = new Date(dueDate);
        for (let i = 0; i < 12; i++) {
          const billId = i === 0 ? firstId : uuidv4();
          await db.query(
            `INSERT INTO bills (id, user_id, description, amount, due_date, category_id, recurring, recurring_type, notes, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')`,
            [billId, user.userId, description, amount, toYMD(current), categoryId || null, true, recurringType, notes || null]
          );
          current.setDate(current.getDate() + 7);
        }
      } else if (recurringType === 'yearly') {
        const startD = new Date(dueDate);
        const year = startD.getFullYear();
        const month = startD.getMonth();
        const day = startD.getDate();
        for (let y = 0; y < 5; y++) {
          const billId = y === 0 ? firstId : uuidv4();
          const safeDay = clampDay(year + y, month, day);
          const billDate = new Date(year + y, month, safeDay);
          await db.query(
            `INSERT INTO bills (id, user_id, description, amount, due_date, category_id, recurring, recurring_type, notes, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')`,
            [billId, user.userId, description, amount, toYMD(billDate), categoryId || null, true, recurringType, notes || null]
          );
        }
      } else {
        // Fallback for unknown recurring types
        await db.query(
          `INSERT INTO bills (id, user_id, description, amount, due_date, category_id, recurring, recurring_type, notes, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')`,
          [firstId, user.userId, description, amount, dueDate, categoryId || null, recurring || false, recurringType || null, notes || null]
        );
      }
    } else {
      await db.query(
        `INSERT INTO bills (id, user_id, description, amount, due_date, category_id, recurring, recurring_type, notes, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')`,
        [firstId, user.userId, description, amount, dueDate, categoryId || null, recurring || false, recurringType || null, notes || null]
      );
    }

    const result = await db.query(
      `SELECT b.*, c.name as category_name, c.color as category_color, c.icon as category_icon
       FROM bills b
       LEFT JOIN categories c ON b.category_id = c.id
       WHERE b.id = $1`,
      [firstId]
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
