import cron from 'node-cron';
import nodemailer from 'nodemailer';
import { getDatabase } from './database';

let transporter: nodemailer.Transporter | null = null;
let cronJobsStarted = false;

/**
 * Initialize email transporter
 */
function getEmailTransporter() {
  if (!transporter) {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
      console.warn('SMTP not configured. Email reports will not work.');
      return null;
    }

    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    console.log(`✓ Email transporter configured (${host}:${port})`);
  }

  return transporter;
}

/**
 * Check if email is configured
 */
export function isEmailConfigured(): boolean {
  return !!(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  );
}

/**
 * Send email report
 */
export async function sendEmailReport(
  to: string,
  subject: string,
  html: string
): Promise<boolean> {
  const transporter = getEmailTransporter();
  if (!transporter) {
    throw new Error('Email not configured');
  }

  const from = process.env.SMTP_FROM || 'noreply@despfamiliar.com';

  try {
    await transporter.sendMail({
      from,
      to,
      subject,
      html,
    });
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

/**
 * Generate HTML report summary
 */
async function generateReportHTML(
  userId: string,
  format: string,
  categories: string[]
): Promise<string> {
  const db = await getDatabase();

  // Get user info
  const userResult = await db.query('SELECT name, email FROM users WHERE id = $1', [
    userId,
  ]);
  const user = userResult.rows[0];

  // Get current month expenses
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  let categoryFilter = '';
  const params: any[] = [userId, startOfMonth];

  if (categories && categories.length > 0) {
    categoryFilter = ` AND c.name = ANY($3)`;
    params.push(categories);
  }

  const expensesResult = await db.query(
    `SELECT e.amount, e.description, e.date, c.name as category, c.icon
     FROM expenses e
     LEFT JOIN categories c ON e.category_id = c.id
     WHERE e.user_id = $1 AND e.date >= $2${categoryFilter}
     ORDER BY e.date DESC`,
    params
  );

  const expenses = expensesResult.rows;
  const totalSpent = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);

  // Get category breakdown
  const categoryTotals: { [key: string]: number } = {};
  expenses.forEach((e) => {
    const cat = e.category || 'Outros';
    categoryTotals[cat] = (categoryTotals[cat] || 0) + parseFloat(e.amount);
  });

  const topCategories = Object.entries(categoryTotals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  // Generate HTML based on format
  if (format === 'summary') {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #6366F1; color: white; padding: 20px; border-radius: 8px; text-align: center; }
    .summary { background: #F3F4F6; padding: 15px; border-radius: 8px; margin: 20px 0; }
    .stat { display: inline-block; width: 48%; margin: 5px 0; }
    .category { padding: 10px; border-left: 4px solid #6366F1; margin: 10px 0; background: #F9FAFB; }
    .footer { text-align: center; color: #6B7280; margin-top: 30px; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>💰 Relatório Financeiro</h1>
      <p>${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</p>
    </div>
    
    <div class="summary">
      <h2>📊 Resumo do Período</h2>
      <div class="stat"><strong>Total Gasto:</strong> R$ ${totalSpent.toFixed(2)}</div>
      <div class="stat"><strong>Transações:</strong> ${expenses.length}</div>
    </div>
    
    <h3>🏆 Top Categorias</h3>
    ${topCategories
      .map(
        ([cat, total]) => `
      <div class="category">
        <strong>${cat}</strong>: R$ ${total.toFixed(2)}
      </div>
    `
      )
      .join('')}
    
    <div class="footer">
      <p>DespFamiliar - Gestão Financeira Familiar</p>
      <p><a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}">Acessar Plataforma</a></p>
    </div>
  </div>
</body>
</html>`;
  } else if (format === 'detailed') {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 700px; margin: 0 auto; padding: 20px; }
    .header { background: #6366F1; color: white; padding: 20px; border-radius: 8px; text-align: center; }
    .expense { border-bottom: 1px solid #E5E7EB; padding: 10px 0; }
    .expense-date { color: #6B7280; font-size: 12px; }
    .expense-amount { float: right; font-weight: bold; color: #EF4444; }
    .footer { text-align: center; color: #6B7280; margin-top: 30px; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>💰 Relatório Detalhado</h1>
      <p>${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</p>
      <h2>R$ ${totalSpent.toFixed(2)}</h2>
    </div>
    
    <h3>📝 Todas as Transações</h3>
    ${expenses
      .map(
        (e) => `
      <div class="expense">
        <div class="expense-amount">R$ ${parseFloat(e.amount).toFixed(2)}</div>
        <div><strong>${e.description}</strong></div>
        <div class="expense-date">${e.category} • ${new Date(e.date).toLocaleDateString('pt-BR')}</div>
      </div>
    `
      )
      .join('')}
    
    <div class="footer">
      <p>DespFamiliar - Gestão Financeira Familiar</p>
    </div>
  </div>
</body>
</html>`;
  } else {
    // charts format (simplified for email)
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #6366F1; color: white; padding: 20px; border-radius: 8px; text-align: center; }
    .chart-bar { background: #E5E7EB; height: 30px; border-radius: 4px; margin: 10px 0; position: relative; }
    .chart-fill { background: #6366F1; height: 100%; border-radius: 4px; }
    .chart-label { position: absolute; left: 10px; top: 5px; font-weight: bold; color: white; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Relatório Visual</h1>
      <p>${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</p>
    </div>
    
    <h3>Gastos por Categoria</h3>
    ${topCategories
      .map(([cat, total]) => {
        const percentage = (total / totalSpent) * 100;
        return `
      <div>
        <div>${cat}</div>
        <div class="chart-bar">
          <div class="chart-fill" style="width: ${percentage}%">
            <span class="chart-label">R$ ${total.toFixed(2)}</span>
          </div>
        </div>
      </div>`;
      })
      .join('')}
    
    <div style="text-align: center; margin-top: 30px; color: #6B7280; font-size: 12px;">
      <p>DespFamiliar</p>
    </div>
  </div>
</body>
</html>`;
  }
}

/**
 * Send scheduled report to user
 */
async function sendScheduledReport(
  userId: string,
  email: string,
  frequency: string,
  format: string,
  categories: string[]
) {
  try {
    const html = await generateReportHTML(userId, format, categories);
    const subject = `💰 Relatório Financeiro ${frequency === 'daily' ? 'Diário' : frequency === 'weekly' ? 'Semanal' : 'Mensal'}`;

    const sent = await sendEmailReport(email, subject, html);

    if (sent) {
      console.log(`✓ Report sent to ${email} (${frequency})`);
    } else {
      console.error(`✗ Failed to send report to ${email}`);
    }
  } catch (error) {
    console.error(`Error sending report to ${email}:`, error);
  }
}

/**
 * Process all scheduled reports for a frequency
 */
async function processScheduledReports(frequency: 'daily' | 'weekly' | 'monthly') {
  if (!isEmailConfigured()) {
    console.warn('Email not configured, skipping scheduled reports');
    return;
  }

  const db = await getDatabase();

  const result = await db.query(
    `SELECT id, user_id, email, report_format, categories
     FROM email_subscriptions
     WHERE frequency = $1 AND active = true`,
    [frequency]
  );

  console.log(`Processing ${result.rows.length} ${frequency} reports...`);

  for (const sub of result.rows) {
    const categories = sub.categories ? sub.categories.split(',') : [];
    await sendScheduledReport(
      sub.user_id,
      sub.email,
      frequency,
      sub.report_format,
      categories
    );
  }
}

/**
 * Start cron jobs for scheduled reports
 */
export function startEmailScheduler() {
  if (cronJobsStarted) {
    console.log('Cron jobs already started');
    return;
  }

  if (!isEmailConfigured()) {
    console.warn('Email not configured. Scheduled reports disabled.');
    return;
  }

  // Daily reports: Every day at 9 AM
  cron.schedule('0 9 * * *', () => {
    console.log('Running daily report job...');
    processScheduledReports('daily');
  });

  // Weekly reports: Every Monday at 9 AM
  cron.schedule('0 9 * * 1', () => {
    console.log('Running weekly report job...');
    processScheduledReports('weekly');
  });

  // Monthly reports: First day of month at 9 AM
  cron.schedule('0 9 1 * *', () => {
    console.log('Running monthly report job...');
    processScheduledReports('monthly');
  });

  cronJobsStarted = true;
  console.log('✓ Email scheduler started (daily @ 9am, weekly @ Mon 9am, monthly @ 1st 9am)');
}

/**
 * Send test email
 */
export async function sendTestEmail(to: string): Promise<boolean> {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 500px; margin: 0 auto; padding: 20px; text-align: center; }
    .header { background: #6366F1; color: white; padding: 30px; border-radius: 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✉️ Email de Teste</h1>
      <p>Seu email está configurado corretamente!</p>
    </div>
    <p style="margin-top: 20px;">DespFamiliar - Sistema de Gestão Financeira</p>
  </div>
</body>
</html>`;

  return sendEmailReport(to, '✉️ Teste de Email - DespFamiliar', html);
}
