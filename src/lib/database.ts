import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

let pool: Pool | null = null;

export async function getDatabase() {
  if (!pool) {
    pool = new Pool({
      connectionString:
        process.env.DATABASE_URL ||
        'postgres://postgres:mM202038@@localhost:5432/despfamiliar',
    });

    // =========================
    // TABELAS PRINCIPAIS
    // =========================
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        premium BOOLEAN DEFAULT FALSE,
        admin BOOLEAN DEFAULT FALSE,
        avatar TEXT DEFAULT '👤',
        premium_expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS feedbacks (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        email TEXT,
        message TEXT NOT NULL,
        page TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS password_resets (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        token TEXT NOT NULL,
        expires_at BIGINT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT NOT NULL,
        icon TEXT NOT NULL,
        budget REAL,
        user_id TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // Family members table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS family_members (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        avatar TEXT DEFAULT '👤',
        color TEXT DEFAULT '#6366F1',
        relation TEXT,
        notes TEXT,
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        UNIQUE (user_id, name)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY,
        amount REAL NOT NULL,
        description TEXT NOT NULL,
        category_id TEXT NOT NULL,
        date TIMESTAMP NOT NULL,
        user_id TEXT NOT NULL,
        spent_by TEXT,
        paid_by TEXT,
        recurring BOOLEAN DEFAULT FALSE,
        recurring_type TEXT,
        tags TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories (id),
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (spent_by) REFERENCES family_members (id),
        FOREIGN KEY (paid_by) REFERENCES family_members (id)
      )
    `);

    // Add columns to existing expenses table if they don't exist
    await pool.query(`
      ALTER TABLE expenses
      ADD COLUMN IF NOT EXISTS spent_by TEXT,
      ADD COLUMN IF NOT EXISTS paid_by TEXT
    `);

    // Add foreign key constraints if they don't exist
    try {
      await pool.query(`
        ALTER TABLE expenses
        ADD CONSTRAINT fk_expenses_spent_by FOREIGN KEY (spent_by) REFERENCES family_members (id)
      `);
    } catch (err) {
      // Constraint might already exist, ignore error
    }

    try {
      await pool.query(`
        ALTER TABLE expenses
        ADD CONSTRAINT fk_expenses_paid_by FOREIGN KEY (paid_by) REFERENCES family_members (id)
      `);
    } catch (err) {
      // Constraint might already exist, ignore error
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS budgets (
        id TEXT PRIMARY KEY,
        category_id TEXT NOT NULL,
        amount REAL NOT NULL,
        period TEXT NOT NULL,
        user_id TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories (id),
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS financial_goals (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        target_amount REAL NOT NULL,
        current_amount REAL DEFAULT 0,
        deadline TIMESTAMP NOT NULL,
        user_id TEXT NOT NULL,
        completed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS achievements (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL,
        description TEXT NOT NULL,
        awarded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS bills (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        description TEXT NOT NULL,
        amount REAL NOT NULL,
        due_date TIMESTAMP NOT NULL,
        category_id TEXT,
        status TEXT DEFAULT 'pending',
        paid_date TIMESTAMP,
        spent_by TEXT,
        paid_by TEXT,
        recurring BOOLEAN DEFAULT FALSE,
        recurring_type TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (category_id) REFERENCES categories (id),
        FOREIGN KEY (spent_by) REFERENCES family_members (id),
        FOREIGN KEY (paid_by) REFERENCES family_members (id)
      )
    `);

    // Add columns to existing bills table if they don't exist
    await pool.query(`
      ALTER TABLE bills
      ADD COLUMN IF NOT EXISTS spent_by TEXT,
      ADD COLUMN IF NOT EXISTS paid_by TEXT
    `);

    // Add foreign key constraints if they don't exist
    try {
      await pool.query(`
        ALTER TABLE bills
        ADD CONSTRAINT fk_bills_spent_by FOREIGN KEY (spent_by) REFERENCES family_members (id)
      `);
    } catch (err) {
      // Constraint might already exist, ignore error
    }

    try {
      await pool.query(`
        ALTER TABLE bills
        ADD CONSTRAINT fk_bills_paid_by FOREIGN KEY (paid_by) REFERENCES family_members (id)
      `);
    } catch (err) {
      // Constraint might already exist, ignore error
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS incomes (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        month TEXT NOT NULL,
        amount REAL NOT NULL,
        source TEXT,
        notes TEXT,
        recurring BOOLEAN DEFAULT FALSE,
        recurring_type TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS premium_coupons (
        id TEXT PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        issuer_id TEXT,
        expires_at TIMESTAMP,
        used_by TEXT,
        used_at TIMESTAMP,
        valid BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // =========================
    // ÍNDICES
    // =========================
    await pool.query('CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses (user_id, date)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses (category_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_expenses_spent_by ON expenses (spent_by)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_expenses_paid_by ON expenses (paid_by)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_budgets_user ON budgets (user_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_goals_user ON financial_goals (user_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_achievements_user ON achievements (user_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_bills_user_due ON bills (user_id, due_date)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_bills_status ON bills (status)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_bills_spent_by ON bills (spent_by)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_bills_paid_by ON bills (paid_by)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_incomes_user_month ON incomes (user_id, month)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_family_members_user ON family_members (user_id)');

    // =========================
    // ADMIN DEV
    // =========================
    try {
      const adminEmail = process.env.DEV_ADMIN_EMAIL || 'squallmar@gmail.com';
      const adminPassword = process.env.DEV_ADMIN_PASSWORD || 'mM2038@';
      const adminName = 'Admin';

      const res = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [adminEmail]
      );

      if (res.rows.length === 0) {
        const hash = await bcrypt.hash(adminPassword, 10);

        await pool.query(
          `INSERT INTO users (id, name, email, password, premium, admin, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())
           ON CONFLICT (email) DO NOTHING`,
          [uuidv4(), adminName, adminEmail, hash, true, true]
        );

        console.log('Dev admin user created:', adminEmail);
      }
    } catch (err) {
      if (err instanceof Error) {
        console.warn('Could not ensure dev admin user:', err.message);
      } else {
        console.warn('Could not ensure dev admin user:', err);
      }
    }
  }

  return pool;
}

// =========================
// CATEGORIAS PADRÃO
// =========================
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
    { name: 'Outros', color: '#5F27CD', icon: '📦' },
  ];

  for (const category of defaultCategories) {
    await db.query(
      `INSERT INTO categories (id, name, color, icon, user_id)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO NOTHING`,
      [uuidv4(), category.name, category.color, category.icon, userId]
    );
  }
}
