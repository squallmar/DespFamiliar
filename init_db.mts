import { getDatabase } from './src/lib/database';

async function initDb() {
  const db = await getDatabase();

  // Tabela users
  await db.query(`CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    premium BOOLEAN DEFAULT FALSE,
    admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
  );`);

  // Tabela categories
  await db.query(`CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(20),
    icon VARCHAR(50),
    budget NUMERIC,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE
  );`);

  // Tabela expenses
  await db.query(`CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY,
    amount NUMERIC NOT NULL,
    description VARCHAR(255),
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    date TIMESTAMP NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    recurring BOOLEAN DEFAULT FALSE,
    recurring_type VARCHAR(20)
  );`);

  // Tabela achievements
  await db.query(`CREATE TABLE IF NOT EXISTS achievements (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    description VARCHAR(255),
    awarded_at TIMESTAMP DEFAULT NOW()
  );`);

  // Tabela budgets
  await db.query(`CREATE TABLE IF NOT EXISTS budgets (
    id UUID PRIMARY KEY,
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE
  );`);

  // Tabela financial_goals
  await db.query(`CREATE TABLE IF NOT EXISTS financial_goals (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    target NUMERIC NOT NULL,
    current NUMERIC DEFAULT 0,
    deadline TIMESTAMP
  );`);

  console.log('Tabelas criadas/verificadas com sucesso!');
  process.exit(0);
}

initDb();
