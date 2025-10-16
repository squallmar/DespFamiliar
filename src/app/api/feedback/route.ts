
import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
  try {
    const db = await getDatabase();
    const { message, email, page } = await request.json();
    if (!message || typeof message !== 'string' || message.length < 5) {
      return NextResponse.json({ error: 'Mensagem muito curta.' }, { status: 400 });
    }
    // Tenta obter usuário autenticado (opcional)
    const user_id = null; // Se quiser autenticação, use seu próprio método aqui
    const id = uuidv4();
    await db.query(
      'INSERT INTO feedbacks (id, user_id, email, message, page) VALUES ($1, $2, $3, $4, $5)',
      [id, user_id, email || null, message, page || null]
    );
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Erro ao registrar feedback.' }, { status: 500 });
  }
}
