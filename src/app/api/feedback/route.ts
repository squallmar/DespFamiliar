import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { v4 as uuidv4 } from 'uuid';
import { getServerSession } from 'next-auth';

export async function POST(req: NextRequest) {
  try {
    const db = await getDatabase();
    const { message, email, page } = await req.json();
    if (!message || typeof message !== 'string' || message.length < 5) {
      return NextResponse.json({ error: 'Mensagem muito curta.' }, { status: 400 });
    }
    // Tenta obter usuário autenticado (opcional)
    let user_id = null;
    try {
      // Se usar next-auth, pode tentar pegar o id do usuário
      const session = await getServerSession();
      if (session?.user?.id) user_id = session.user.id;
    } catch {}
    const id = uuidv4();
    await db.run(
      'INSERT INTO feedbacks (id, user_id, email, message, page) VALUES (?, ?, ?, ?, ?)',
      [id, user_id, email || null, message, page || null]
    );
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Erro ao registrar feedback.' }, { status: 500 });
  }
}
