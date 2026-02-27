import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    console.log('Admin endpoint chamado por:', user);
    const db = await getDatabase();
    // Buscar status admin do usuário autenticado
    const adminCheck = await db.query('SELECT admin FROM users WHERE id = $1', [user.userId]);
    const isAdmin = adminCheck.rows[0]?.admin === true;
    if (!isAdmin) {
      console.log('Acesso negado para:', user.email);
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }
    const result = await db.query(`
      SELECT u.id, u.name, u.email, u.admin, u.premium, u.avatar, u.created_at,
             COALESCE(a.count, 0) AS achievements_count
      FROM users u
      LEFT JOIN (
        SELECT user_id, COUNT(*)::int as count
        FROM achievements
        GROUP BY user_id
      ) a ON a.user_id = u.id
      ORDER BY u.created_at DESC`);
    console.log('Usuários retornados:', result.rows.length);
    return NextResponse.json({ users: result.rows });
  } catch {
    return NextResponse.json({ error: 'Erro ao listar usuários' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const db = await getDatabase();
    
    // Verificar se é admin
    const adminCheck = await db.query('SELECT admin FROM users WHERE id = $1', [user.userId]);
    if (!adminCheck.rows[0]?.admin) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { userId, field, value } = await request.json();
    
    if (!userId || !field || typeof value !== 'boolean') {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
    }

    if (field !== 'admin' && field !== 'premium') {
      return NextResponse.json({ error: 'Campo inválido' }, { status: 400 });
    }

    await db.query(`UPDATE users SET ${field} = $1 WHERE id = $2`, [value, userId]);
    
    return NextResponse.json({ message: 'Status atualizado com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    return NextResponse.json({ error: 'Erro ao atualizar status' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const db = await getDatabase();
    
    // Verificar se é admin
    const adminCheck = await db.query('SELECT admin FROM users WHERE id = $1', [user.userId]);
    if (!adminCheck.rows[0]?.admin) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ error: 'ID do usuário é obrigatório' }, { status: 400 });
    }

    // Não permitir que o admin exclua a si mesmo
    if (userId === user.userId) {
      return NextResponse.json({ error: 'Você não pode excluir sua própria conta' }, { status: 400 });
    }

    // Excluir dados relacionados primeiro
    await db.query('DELETE FROM expenses WHERE user_id = $1', [userId]);
    await db.query('DELETE FROM categories WHERE user_id = $1', [userId]);
    await db.query('DELETE FROM budgets WHERE user_id = $1', [userId]);
    await db.query('DELETE FROM financial_goals WHERE user_id = $1', [userId]);
    await db.query('DELETE FROM achievements WHERE user_id = $1', [userId]);
    await db.query('DELETE FROM feedbacks WHERE user_id = $1', [userId]);
    
    // Excluir o usuário
    await db.query('DELETE FROM users WHERE id = $1', [userId]);
    
    return NextResponse.json({ message: 'Usuário excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir usuário:', error);
    return NextResponse.json({ error: 'Erro ao excluir usuário' }, { status: 500 });
  }
}
