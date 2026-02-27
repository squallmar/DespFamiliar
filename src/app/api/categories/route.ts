import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, insertDefaultCategories } from '@/lib/database';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const db = await getDatabase();
    
    // Verificar se existem categorias, se não, inserir as padrão
  const existingCategoriesResult = await db.query('SELECT * FROM categories WHERE user_id = $1', [user.userId]);
  const existingCategories = existingCategoriesResult.rows;
    
    if (existingCategories.length === 0) {
      await insertDefaultCategories(user.userId);
    }
    
  const categoriesResult = await db.query('SELECT * FROM categories WHERE user_id = $1 ORDER BY name', [user.userId]);
  const categories = categoriesResult.rows;
    
    return NextResponse.json({ categories });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    console.error('Error fetching categories:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const db = await getDatabase();
    const body = await request.json();
    const { name, color, icon, budget } = body;

    if (!name || !color || !icon) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const categoryId = Date.now().toString();

    await db.query(
      `INSERT INTO categories (id, name, color, icon, budget, user_id)
      VALUES ($1, $2, $3, $4, $5, $6)`,
      [categoryId, name, color, icon, budget, user.userId]
    );
    const categoryResult = await db.query('SELECT * FROM categories WHERE id = $1', [categoryId]);
    const category = categoryResult.rows[0];
    
    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    console.error('Error creating category:', error);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}