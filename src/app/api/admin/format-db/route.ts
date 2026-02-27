import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, insertDefaultCategories } from '@/lib/database';
import { requireAuth } from '@/lib/auth';

// POST /api/admin/format-db
// Formata o banco (remove dados de todas as tabelas relacionadas) preservando a tabela de usuários
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const db = await getDatabase();

    // Verificar se é admin
    const adminCheck = await db.query('SELECT admin FROM users WHERE id = $1', [user.userId]);
    if (!adminCheck.rows[0]?.admin) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Parâmetros opcionais
    const body = request.body ? await request.json().catch(() => ({})) : {} as Record<string, unknown>;
    const reinsertDefaults = body?.reinsertDefaults !== false; // padrão true

    // Transação
    await db.query('BEGIN');
    try {
      // Ordem de deleção para respeitar FKs
      await db.query('DELETE FROM bills');
      await db.query('DELETE FROM expenses');
      await db.query('DELETE FROM budgets');
      await db.query('DELETE FROM financial_goals');
      await db.query('DELETE FROM achievements');
      await db.query('DELETE FROM feedbacks');
      await db.query('DELETE FROM password_resets');
      await db.query('DELETE FROM categories');

      await db.query('COMMIT');
    } catch (err) {
      await db.query('ROLLBACK');
      throw err;
    }

    // Recriar categorias padrão para todos os usuários, se solicitado
    if (reinsertDefaults) {
      const usersRes = await db.query('SELECT id FROM users');
      for (const row of usersRes.rows) {
        await insertDefaultCategories(row.id);
      }
    }

    return NextResponse.json({ success: true, reinsertedDefaults: reinsertDefaults });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    console.error('Erro ao formatar banco:', error);
    return NextResponse.json({ error: 'Falha ao formatar banco de dados' }, { status: 500 });
  }
}
