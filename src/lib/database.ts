import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

let pool: Pool | null = null;

export async function getDatabase() {
  if (!pool) {
    pool = new Pool({
      connectionString:
        process.env.DATABASE_URL ||
        'postgres://postgres:mM202038%40@localhost:5432/despfamiliar',
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
        category TEXT,
        priority TEXT DEFAULT 'medium',
        completed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // Shared expenses table for expense splitting
    await pool.query(`
      CREATE TABLE IF NOT EXISTS shared_expenses (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        expense_id TEXT NOT NULL,
        description TEXT NOT NULL,
        total_amount REAL NOT NULL,
        split_type TEXT DEFAULT 'equal',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (expense_id) REFERENCES expenses (id)
      )
    `);

    // Shared expense participants
    await pool.query(`
      CREATE TABLE IF NOT EXISTS shared_expense_participants (
        id TEXT PRIMARY KEY,
        shared_expense_id TEXT NOT NULL,
        member_id TEXT NOT NULL,
        member_name TEXT NOT NULL,
        share_percentage REAL NOT NULL DEFAULT 50,
        amount_owed REAL NOT NULL,
        amount_paid REAL DEFAULT 0,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (shared_expense_id) REFERENCES shared_expenses (id),
        FOREIGN KEY (member_id) REFERENCES family_members (id)
      )
    `);

    // Settlements/debts between family members
    await pool.query(`
      CREATE TABLE IF NOT EXISTS settlements (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        from_member_id TEXT NOT NULL,
        to_member_id TEXT NOT NULL,
        amount REAL NOT NULL,
        paid_amount REAL DEFAULT 0,
        status TEXT DEFAULT 'pending',
        linked_expense_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        settled_at TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (from_member_id) REFERENCES family_members (id),
        FOREIGN KEY (to_member_id) REFERENCES family_members (id)
      )
    `);

    // Push notification subscriptions
    await pool.query(`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        endpoint TEXT NOT NULL,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (user_id, endpoint),
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // Email report subscriptions
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_subscriptions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        email TEXT NOT NULL,
        frequency TEXT NOT NULL,
        report_format TEXT DEFAULT 'summary',
        categories TEXT,
        active BOOLEAN DEFAULT TRUE,
        subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // Receipts/attachments
    await pool.query(`
      CREATE TABLE IF NOT EXISTS receipts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        expense_id TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_size INTEGER,
        file_type TEXT,
        file_url TEXT NOT NULL,
        storage_type TEXT DEFAULT 'local',
        ocr_text TEXT,
        ocr_confidence REAL,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (expense_id) REFERENCES expenses (id)
      )
    `);

    // AI-generated insights
    await pool.query(`
      CREATE TABLE IF NOT EXISTS insights (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        insight_type TEXT NOT NULL,
        category TEXT,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        impact_amount REAL,
        confidence REAL,
        action TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // Spending anomalies
    await pool.query(`
      CREATE TABLE IF NOT EXISTS anomalies (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        anomaly_type TEXT NOT NULL,
        category TEXT,
        description TEXT NOT NULL,
        amount REAL,
        normal_min REAL,
        normal_max REAL,
        normal_avg REAL,
        severity TEXT DEFAULT 'medium',
        explanation TEXT,
        suggestion TEXT,
        detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
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

    await pool.query(`
      CREATE TABLE IF NOT EXISTS pix_payments (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        asaas_subscription_id TEXT UNIQUE,
        asaas_customer_id TEXT,
        amount DECIMAL(10, 2) NOT NULL DEFAULT 20.00,
        status TEXT NOT NULL DEFAULT 'PENDING',
        next_due_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        confirmed_at TIMESTAMP,
        cancelled_at TIMESTAMP,
        notes TEXT
      )
    `);

    // Keep legacy databases compatible with the current pix_payments schema.
    await pool.query(`
      ALTER TABLE pix_payments
      ADD COLUMN IF NOT EXISTS asaas_subscription_id TEXT,
      ADD COLUMN IF NOT EXISTS next_due_date TIMESTAMP,
      ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP
    `);

    await pool.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'pix_payments'
            AND column_name = 'asaas_payment_id'
        ) THEN
          UPDATE pix_payments
          SET asaas_subscription_id = asaas_payment_id
          WHERE asaas_subscription_id IS NULL;
        END IF;
      END
      $$;
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
    await pool.query('CREATE INDEX IF NOT EXISTS idx_pix_payments_user ON pix_payments (user_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_pix_payments_status ON pix_payments (status)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_pix_payments_asaas ON pix_payments (asaas_subscription_id)');
    
    // New feature tables indexes
    await pool.query('CREATE INDEX IF NOT EXISTS idx_shared_expenses_user ON shared_expenses (user_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_shared_expense_participants_shared_expense ON shared_expense_participants (shared_expense_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_settlements_user ON settlements (user_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_settlements_from_member ON settlements (from_member_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_settlements_to_member ON settlements (to_member_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_settlements_status ON settlements (status)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions (user_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_email_subscriptions_user ON email_subscriptions (user_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_receipts_user ON receipts (user_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_receipts_expense ON receipts (expense_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_insights_user ON insights (user_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_insights_type ON insights (insight_type)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_anomalies_user ON anomalies (user_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_anomalies_type ON anomalies (anomaly_type)');

    // =========================
    // ADMIN DEV
    // =========================
    try {
      const allowDevAdminBootstrap =
        process.env.NODE_ENV === 'development' &&
        process.env.ENABLE_DEV_ADMIN_BOOTSTRAP === 'true';

      if (!allowDevAdminBootstrap) {
        return pool;
      }

      const adminEmail = process.env.DEV_ADMIN_EMAIL;
      const adminPassword = process.env.DEV_ADMIN_PASSWORD;
      const adminName = 'Admin';

      if (!adminEmail || !adminPassword || adminPassword.length < 12) {
        console.warn('Dev admin bootstrap ignorado: configure DEV_ADMIN_EMAIL e DEV_ADMIN_PASSWORD forte (>=12).');
        return pool;
      }

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
