import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

export async function GET(req: NextRequest) {
  try {
    const db = await getDatabase();
    const rows = await db.all('SELECT * FROM feedbacks ORDER BY created_at DESC LIMIT 100');
    return NextResponse.json({ feedbacks: rows });
  } catch (err) {
    return NextResponse.json({ error: 'Erro ao buscar feedbacks.' }, { status: 500 });
  }
}
