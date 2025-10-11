import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { requireAuth } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

// POST: Importa extrato bancário CSV simples e cria despesas
export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const db = await getDatabase();
    const text = await request.text();
    // Espera CSV: data,descricao,valor
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    const imported: any[] = [];
    for (const line of lines.slice(1)) { // pula cabeçalho
      const [date, description, amount] = line.split(',');
      if (!date || !description || !amount) continue;
      const expenseId = uuidv4();
      await db.run(
        'INSERT INTO expenses (id, amount, description, category_id, date, user_id) VALUES (?, ?, ?, ?, ?, ?)',
        [expenseId, parseFloat(amount), description, null, new Date(date).toISOString(), user.userId]
      );
      imported.push({ date, description, amount });
    }
    return NextResponse.json({ success: true, imported });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    console.error('Erro ao importar extrato:', error);
    return NextResponse.json({ error: 'Falha ao importar extrato' }, { status: 500 });
  }
}
