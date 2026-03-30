import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

type GoalRouteContext = {
  params: Promise<{ id: string }>;
};

// PUT - Update goal
export async function PUT(
  req: NextRequest,
  context: GoalRouteContext
) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: goalId } = await context.params;
    const { name, targetAmount, currentAmount, deadline, category, priority } =
      (await req.json()) as {
        name: string;
        targetAmount: number;
        currentAmount: number;
        deadline: string;
        category: string;
        priority: 'low' | 'medium' | 'high';
      };

    if (!name || targetAmount === undefined || !deadline) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    // Check if goal belongs to user
    const goalCheck = await db.query(
      'SELECT id FROM financial_goals WHERE id = $1 AND user_id = $2',
      [goalId, userId]
    );

    if (goalCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    // Update goal
    const result = await db.query(
      `UPDATE financial_goals 
       SET name = $1, 
           target_amount = $2,
           current_amount = $3,
           deadline = $4,
           category = $5,
           priority = $6,
           updated_at = NOW()
       WHERE id = $7 AND user_id = $8
       RETURNING *`,
      [name, targetAmount, currentAmount, deadline, category, priority, goalId, userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Failed to update goal' },
        { status: 500 }
      );
    }

    const updatedGoal = result.rows[0];
    const progress = (currentAmount / targetAmount) * 100;

    return NextResponse.json({
      id: updatedGoal.id,
      userId: updatedGoal.user_id,
      name: updatedGoal.name,
      targetAmount: updatedGoal.target_amount,
      currentAmount: updatedGoal.current_amount,
      deadline: updatedGoal.deadline,
      category: updatedGoal.category,
      priority: updatedGoal.priority,
      progress,
      completed: updatedGoal.completed,
      updatedAt: updatedGoal.updated_at,
    });
  } catch (error) {
    console.error('Error updating goal:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete goal
export async function DELETE(
  req: NextRequest,
  context: GoalRouteContext
) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: goalId } = await context.params;
    const db = await getDatabase();

    // Check if goal belongs to user
    const goalCheck = await db.query(
      'SELECT id FROM financial_goals WHERE id = $1 AND user_id = $2',
      [goalId, userId]
    );

    if (goalCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    // Delete goal
    await db.query(
      'DELETE FROM financial_goals WHERE id = $1 AND user_id = $2',
      [goalId, userId]
    );

    return NextResponse.json({
      success: true,
      message: 'Goal deleted successfully',
      deletedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error deleting goal:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
