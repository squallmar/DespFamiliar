import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const db = await getDatabase();
    const hash = await bcrypt.hash('mM2038@', 10);
    await db.query(
      'INSERT INTO users (id, name, email, password, premium, admin, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW()) ON CONFLICT (email) DO NOTHING',
      [uuidv4(), 'Admin', 'squallmar@gmail.com', hash, true, true]
    );
    return NextResponse.json({ message: 'Admin criado com sucesso!' });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao criar admin', details: error?.message }, { status: 500 });
  }
}
