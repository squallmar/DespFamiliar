import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || 'month';

    const db = await getDatabase();

    // Get current period dates
    const now = new Date();
    let startDate: Date;
    let endDate = new Date(now);
    let daysInPeriod: number;

    switch (period) {
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - now.getDay());
        startDate.setHours(0, 0, 0, 0);
        daysInPeriod = 7;
        break;
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        daysInPeriod = 90;
        break;
      default: // month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        daysInPeriod = nextMonth.getDate();
    }

    const daysElapsed = Math.ceil(
      (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const daysLeft = daysInPeriod - daysElapsed;

    // Get budgets for user
    const budgets = await db.query(
      `SELECT b.id, b.amount, b.period, c.id as category_id, c.name as category_name
       FROM budgets b
       LEFT JOIN categories c ON b.category_id = c.id
       WHERE b.user_id = $1 AND b.period = $2`,
      [userId, period]
    );

    if (budgets.rows.length === 0) {
      return NextResponse.json([]);
    }

    // Get spending for each category in current period
    const alerts = await Promise.all(
      budgets.rows.map(async (budget) => {
        const spendingResult = await db.query(
          `SELECT COALESCE(SUM(amount), 0) as total
           FROM expenses
           WHERE user_id = $1 
           AND category_id = $2 
           AND date >= $3 
           AND date <= $4`,
          [userId, budget.category_id, startDate, endDate]
        );

        const spent = parseFloat(spendingResult.rows[0].total);
        const budgetLimit = budget.amount;
        const percentageUsed = (spent / budgetLimit) * 100;
        const remaining = budgetLimit - spent;

        // Calculate daily average and projection
        const dailyAverage = spent / daysElapsed;
        const projectedTotal = dailyAverage * daysInPeriod;

        // Determine status
        let status: 'healthy' | 'warning' | 'critical';
        let severity: 'low' | 'medium' | 'high';

        if (percentageUsed >= 90) {
          status = 'critical';
          severity = 'high';
        } else if (percentageUsed >= 70) {
          status = 'warning';
          severity = 'medium';
        } else {
          status = 'healthy';
          severity = 'low';
        }

        // Generate recommendations based on status
        const recommendations: Array<{ action: string; potentialSavings: number; priority: 'low' | 'medium' | 'high' }> = [];

        if (status === 'critical') {
          recommendations.push({
            action: `Reduza imediatamente gastos em ${budget.category_name}`,
            potentialSavings: Math.max(0, spent - budgetLimit),
            priority: 'high',
          });
          recommendations.push({
            action: `Defina limite diário de R$ ${(remaining / Math.max(1, daysLeft)).toFixed(2)}`,
            potentialSavings: dailyAverage * 0.3,
            priority: 'high',
          });
        } else if (status === 'warning') {
          recommendations.push({
            action: `Monitore gastos em ${budget.category_name} de perto`,
            potentialSavings: dailyAverage * 0.2,
            priority: 'medium',
          });
          if (projectedTotal > budgetLimit) {
            recommendations.push({
              action: `No ritmo atual, você excederá o orçamento em R$ ${(projectedTotal - budgetLimit).toFixed(2)}`,
              potentialSavings: projectedTotal - budgetLimit,
              priority: 'medium',
            });
          }
        } else {
          recommendations.push({
            action: `Continue no ritmo atual`,
            potentialSavings: 0,
            priority: 'low',
          });
        }

        // Calculate trend vs previous period
        const prevStartDate = new Date(startDate);
        prevStartDate.setMonth(prevStartDate.getMonth() - 1);
        const prevEndDate = new Date(prevStartDate);
        prevEndDate.setMonth(prevEndDate.getMonth() + 1);

        const prevSpendingResult = await db.query(
          `SELECT COALESCE(SUM(amount), 0) as total
           FROM expenses
           WHERE user_id = $1 
           AND category_id = $2 
           AND date >= $3 
           AND date < $4`,
          [userId, budget.category_id, prevStartDate, prevEndDate]
        );

        const prevSpent = parseFloat(prevSpendingResult.rows[0].total);
        const trendPercentage = prevSpent > 0 ? ((spent - prevSpent) / prevSpent) * 100 : 0;
        const trend = trendPercentage > 5 ? 'up' : trendPercentage < -5 ? 'down' : 'stable';

        return {
          id: budget.id,
          userId,
          categoryId: budget.category_id,
          categoryName: budget.category_name,
          budgetLimit,
          spent,
          remaining,
          percentageUsed: Math.round(percentageUsed),
          status,
          severity,
          daysLeft,
          dailyAverage,
          projectedTotal,
          message: `${budget.category_name}: ${Math.round(percentageUsed)}% (R$ ${spent.toFixed(2)} / R$ ${budgetLimit.toFixed(2)}) - ${daysLeft} dias restantes`,
          recommendations,
          trend,
          trendPercentage: Math.round(trendPercentage),
          lastUpdated: new Date().toISOString(),
        };
      })
    );

    // Sort by severity (critical first)
    alerts.sort((a, b) => {
      const severityOrder = { high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });

    return NextResponse.json(alerts);
  } catch (error) {
    console.error('Error fetching budget alerts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
