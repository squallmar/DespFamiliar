const { Client } = require('pg');

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgres://postgres:mM202038@@localhost:5432/despfamiliar',
  });

  await client.connect();

  const expensesGlobal = await client.query(`
    SELECT COUNT(*) AS cnt, COALESCE(SUM(amount),0) AS total, MIN(date) AS min_date, MAX(date) AS max_date
    FROM expenses
  `);

  const febMarExpenses = await client.query(`
    SELECT user_id, to_char(date, 'YYYY-MM') AS ym, COUNT(*) AS cnt, COALESCE(SUM(amount),0) AS total
    FROM expenses
    WHERE date(date) BETWEEN date('2026-02-01') AND date('2026-03-31')
    GROUP BY user_id, to_char(date, 'YYYY-MM')
    ORDER BY ym, user_id
  `);

  const febMarBills = await client.query(`
    SELECT user_id, status, to_char(due_date, 'YYYY-MM') AS ym, COUNT(*) AS cnt, COALESCE(SUM(amount),0) AS total
    FROM bills
    WHERE date(due_date) BETWEEN date('2026-02-01') AND date('2026-03-31')
    GROUP BY user_id, status, to_char(due_date, 'YYYY-MM')
    ORDER BY ym, user_id, status
  `);

  const paidBillsWindow = await client.query(`
    SELECT user_id, to_char(paid_date, 'YYYY-MM') AS ym, COUNT(*) AS cnt, COALESCE(SUM(amount),0) AS total
    FROM bills
    WHERE paid_date IS NOT NULL
      AND status = 'paid'
      AND date(paid_date) BETWEEN date('2026-02-01') AND date('2026-03-31')
    GROUP BY user_id, to_char(paid_date, 'YYYY-MM')
    ORDER BY ym, user_id
  `);

  console.log('=== EXPENSES GLOBAL ===');
  console.table(expensesGlobal.rows);

  console.log('=== EXPENSES FEB/MAR 2026 ===');
  console.table(febMarExpenses.rows);

  console.log('=== BILLS BY STATUS (DUE IN FEB/MAR 2026) ===');
  console.table(febMarBills.rows);

  console.log('=== PAID BILLS IN FEB/MAR 2026 ===');
  console.table(paidBillsWindow.rows);

  await client.end();
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
