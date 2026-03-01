import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    const userId = user.userId;

    try {
      const pool = await getDatabase();
      const result = await pool.query('SELECT * FROM financial_goals WHERE user_id = $1 ORDER BY deadline ASC', [userId]);
      const goals = result.rows || [];

      return NextResponse.json({ 
        items: goals.map(goal => ({
          id: goal.id,
          name: goal.name,
          target_amount: Number(goal.target_amount),
          current_amount: Number(goal.current_amount) || 0,
          progress_percent: Math.round((Number(goal.current_amount) || 0) / Number(goal.target_amount) * 100),
          deadline: goal.deadline,
          completed: goal.completed
        }))
      });
    } catch (dbError: any) {
      console.error('Database error:', dbError);
      // Se tabela não existe, retorna array vazio em vez de erro
      if (dbError.message?.includes('no such table') || dbError.message?.includes('does not exist')) {
        return NextResponse.json({ items: [] });
      }
      throw dbError;
    }
  } catch (error) {
    console.error('Error fetching goals:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req);
    const userId = user.userId;

    const { name, target_amount, deadline } = await req.json();

    if (!name || !target_amount || !deadline) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    try {
      const pool = await getDatabase();
      const id = `goal-${Date.now()}`;
      const result = await pool.query(
        'INSERT INTO financial_goals (id, name, target_amount, current_amount, deadline, user_id, completed) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [id, name, Number(target_amount), 0, deadline, userId, false]
      );

      return NextResponse.json({ id, success: true }, { status: 201 });
    } catch (dbError: any) {
      console.error('Database error:', dbError);
      // Se tabela não existe, retorna erro mas não 500
      if (dbError.message?.includes('no such table') || dbError.message?.includes('does not exist')) {
        return NextResponse.json({ error: 'Goals feature not available' }, { status: 503 });
      }
      throw dbError;
    }
  } catch (error) {
    console.error('Error creating goal:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = requireAuth(req);
    const userId = user.userId;

    const { id, current_amount, completed } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'Missing goal id' }, { status: 400 });
    }

    try {
      const pool = await getDatabase();
      const updates: string[] = [];
      const values: any[] = [];

      if (current_amount !== undefined) {
        updates.push('current_amount');
        values.push(Number(current_amount));
      }

      if (completed !== undefined) {
        updates.push('completed');
        values.push(completed);
      }

      if (updates.length === 0) {
        return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
      }

      values.push(id);
      values.push(userId);

      const updateClause = updates
        .map((field, i) => `${field} = $${i + 1}`)
        .join(', ');

      await pool.query(
        `UPDATE financial_goals SET ${updateClause} WHERE id = $${values.length - 1} AND user_id = $${values.length}`,
        values
      );

      return NextResponse.json({ success: true });
    } catch (dbError: any) {
      console.error('Database error:', dbError);
      if (dbError.message?.includes('no such table') || dbError.message?.includes('does not exist')) {
        return NextResponse.json({ error: 'Goals feature not available' }, { status: 503 });
      }
      throw dbError;
    }
  } catch (error) {
    console.error('Error updating goal:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = requireAuth(req);
    const userId = user.userId;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing goal id' }, { status: 400 });
    }

    try {
      const pool = await getDatabase();
      await pool.query('DELETE FROM financial_goals WHERE id = $1 AND user_id = $2', [id, userId]);

      return NextResponse.json({ success: true });
    } catch (dbError: any) {
      console.error('Database error:', dbError);
      if (dbError.message?.includes('no such table') || dbError.message?.includes('does not exist')) {
        return NextResponse.json({ error: 'Goals feature not available' }, { status: 503 });
      }
      throw dbError;
    }
  } catch (error) {
    console.error('Error deleting goal:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
