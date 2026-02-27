import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '@/lib/database';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);

    const db = await getDatabase();
    const result = await db.query(
      `SELECT * FROM family_members WHERE user_id = $1 AND active = TRUE ORDER BY created_at ASC`,
      [user.userId]
    );

    return NextResponse.json({ members: result.rows });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error fetching family members:', error);
    return NextResponse.json({ error: 'Failed to fetch family members' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);

    const { name, avatar, color, relation, notes } = await request.json();

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const db = await getDatabase();
    const id = uuidv4();

    await db.query(
      `INSERT INTO family_members (id, user_id, name, avatar, color, relation, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, user.userId, name, avatar || '👤', color || '#6366F1', relation, notes]
    );

    const result = await db.query(`SELECT * FROM family_members WHERE id = $1`, [id]);
    return NextResponse.json({ member: result.rows[0] }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error creating family member:', error);
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
      return NextResponse.json({ error: 'Member already exists' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create family member' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = requireAuth(request);

    const { id, name, avatar, color, relation, notes } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Member ID is required' }, { status: 400 });
    }

    const db = await getDatabase();

    // Verify ownership
    const checkResult = await db.query(
      `SELECT id FROM family_members WHERE id = $1 AND user_id = $2`,
      [id, user.userId]
    );

    if (checkResult.rows.length === 0) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    await db.query(
      `UPDATE family_members
       SET name = COALESCE($1, name),
           avatar = COALESCE($2, avatar),
           color = COALESCE($3, color),
           relation = COALESCE($4, relation),
           notes = COALESCE($5, notes)
       WHERE id = $6`,
      [name, avatar, color, relation, notes, id]
    );

    const result = await db.query(`SELECT * FROM family_members WHERE id = $1`, [id]);
    return NextResponse.json({ member: result.rows[0] });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error updating family member:', error);
    return NextResponse.json({ error: 'Failed to update family member' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = requireAuth(request);

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Member ID is required' }, { status: 400 });
    }

    const db = await getDatabase();

    // Verify ownership
    const checkResult = await db.query(
      `SELECT id FROM family_members WHERE id = $1 AND user_id = $2`,
      [id, user.userId]
    );

    if (checkResult.rows.length === 0) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Soft delete
    await db.query(
      `UPDATE family_members SET active = FALSE WHERE id = $1`,
      [id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error deleting family member:', error);
    return NextResponse.json({ error: 'Failed to delete family member' }, { status: 500 });
  }
}
