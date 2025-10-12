import { getDatabase } from './src/lib/database';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

async function createAdmin() {
  const db = await getDatabase();
  const hash = await bcrypt.hash('mM2038@', 10);
  await db.query(
    'INSERT INTO users (id, name, email, password, premium, admin, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW()) ON CONFLICT (email) DO NOTHING',
    [uuidv4(), 'Admin', 'squallmar@gmail.com', hash, true, true]
  );
  console.log('Admin criado com sucesso!');
  process.exit(0);
}

createAdmin();
