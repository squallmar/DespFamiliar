import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, insertDefaultCategories } from '@/lib/database';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const db = await getDatabase();
    
    // Verificar se existem categorias, se não, inserir as padrão
    const existingCategories = await db.all('SELECT * FROM categories WHERE user_id = ?', [user.userId]);
    
    if (existingCategories.length === 0) {
      await insertDefaultCategories(user.userId);
    }
    
    const categories = await db.all('SELECT * FROM categories WHERE user_id = ? ORDER BY name', [user.userId]);
    
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

    await db.run(`
      INSERT INTO categories (id, name, color, icon, budget, user_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [categoryId, name, color, icon, budget, user.userId]);

    const category = await db.get('SELECT * FROM categories WHERE id = ?', [categoryId]);
    
    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    console.error('Error creating category:', error);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}