import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

let pool: Pool | null = null;

export async function getDatabase() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/despfamiliar'
    });

    // Create tables if they don't exist (run only once)
    await pool.query('CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, premium BOOLEAN DEFAULT FALSE, admin BOOLEAN DEFAULT FALSE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)');
    await pool.query('CREATE TABLE IF NOT EXISTS feedbacks (id TEXT PRIMARY KEY, user_id TEXT, email TEXT, message TEXT NOT NULL, page TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users (id))');
    await pool.query('CREATE TABLE IF NOT EXISTS password_resets (id SERIAL PRIMARY KEY, user_id TEXT NOT NULL, token TEXT NOT NULL, expires_at BIGINT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users (id))');
    await pool.query('CREATE TABLE IF NOT EXISTS categories (id TEXT PRIMARY KEY, name TEXT NOT NULL, color TEXT NOT NULL, icon TEXT NOT NULL, budget REAL, user_id TEXT NOT NULL, FOREIGN KEY (user_id) REFERENCES users (id))');
    await pool.query('CREATE TABLE IF NOT EXISTS expenses (id TEXT PRIMARY KEY, amount REAL NOT NULL, description TEXT NOT NULL, category_id TEXT NOT NULL, date TIMESTAMP NOT NULL, user_id TEXT NOT NULL, recurring BOOLEAN DEFAULT FALSE, recurring_type TEXT, tags TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (category_id) REFERENCES categories (id), FOREIGN KEY (user_id) REFERENCES users (id))');
    await pool.query('CREATE TABLE IF NOT EXISTS budgets (id TEXT PRIMARY KEY, category_id TEXT NOT NULL, amount REAL NOT NULL, period TEXT NOT NULL, user_id TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (category_id) REFERENCES categories (id), FOREIGN KEY (user_id) REFERENCES users (id))');
    await pool.query('CREATE TABLE IF NOT EXISTS financial_goals (id TEXT PRIMARY KEY, name TEXT NOT NULL, target_amount REAL NOT NULL, current_amount REAL DEFAULT 0, deadline TIMESTAMP NOT NULL, user_id TEXT NOT NULL, completed BOOLEAN DEFAULT FALSE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users (id))');
    await pool.query('CREATE TABLE IF NOT EXISTS achievements (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, type TEXT NOT NULL, description TEXT NOT NULL, awarded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users (id))');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses (user_id, date)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses (category_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_budgets_user ON budgets (user_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_goals_user ON financial_goals (user_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_achievements_user ON achievements (user_id)');

    // Ensure premium column exists (for migration)
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS premium BOOLEAN DEFAULT FALSE');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT DEFAULT \'👤\'');
  }
  return pool;
}

export async function insertDefaultCategories(userId: string) {
  const db = await getDatabase();
  const defaultCategories = [
    { name: 'Alimentação', color: '#FF6B6B', icon: '🍽️' },
    { name: 'Transporte', color: '#4ECDC4', icon: '🚗' },
    { name: 'Moradia', color: '#45B7D1', icon: '🏠' },
    { name: 'Saúde', color: '#96CEB4', icon: '⚕️' },
    { name: 'Educação', color: '#FECA57', icon: '📚' },
    { name: 'Lazer', color: '#FF9FF3', icon: '🎉' },
    { name: 'Vestuário', color: '#54A0FF', icon: '👕' },
    { name: 'Dívidas', color: '#E74C3C', icon: '💳' },
    { name: 'Cartões de Crédito', color: '#C0392B', icon: '💸' },
    { name: 'Outros', color: '#5F27CD', icon: '📦' }
  ];

  for (const category of defaultCategories) {
    const id = uuidv4();
    await db.query(
      'INSERT INTO categories (id, name, color, icon, user_id) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING',
      [id, category.name, category.color, category.icon, userId]
    );
  }
}