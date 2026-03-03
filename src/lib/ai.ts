import OpenAI from 'openai';
import { getDatabase } from './database';

let openai: OpenAI | null = null;

function getOpenAI() {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }
    openai = new OpenAI({ apiKey });
  }
  return openai;
}

export interface Expense {
  id: string;
  amount: number;
  description: string;
  category: string;
  date: string;
}

export interface SpendingInsight {
  id: string;
  userId: string;
  type: 'opportunity' | 'recommendation' | 'warning' | 'anomaly';
  category: string;
  title: string;
  description: string;
  impact: number;
  confidence: number;
  action: string;
  createdAt: string;
  expiresAt: string;
}

export interface SpendingAnomaly {
  id: string;
  userId: string;
  type: 'spike_detection' | 'pattern_change' | 'unusual_category' | 'outlier';
  category: string;
  description: string;
  amount: number;
  normalRange: {
    min: number;
    max: number;
    average: number;
  };
  severity: 'low' | 'medium' | 'high';
  explanation: string;
  suggestion: string;
}

/**
 * Fetch user expenses for analysis
 */
async function getUserExpenses(
  userId: string,
  periodDays: number = 30
): Promise<Expense[]> {
  const db = await getDatabase();

  const result = await db.query(
    `SELECT e.id, e.amount, e.description, e.date, c.name as category
     FROM expenses e
     LEFT JOIN categories c ON e.category_id = c.id
     WHERE e.user_id = $1 AND e.date >= NOW() - INTERVAL '${periodDays} days'
     ORDER BY e.date DESC`,
    [userId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    amount: row.amount,
    description: row.description,
    category: row.category || 'Outros',
    date: row.date,
  }));
}

/**
 * Calculate category statistics
 */
function calculateCategoryStats(expenses: Expense[]) {
  const categoryTotals: { [key: string]: number[] } = {};

  expenses.forEach((expense) => {
    if (!categoryTotals[expense.category]) {
      categoryTotals[expense.category] = [];
    }
    categoryTotals[expense.category].push(expense.amount);
  });

  const stats: {
    [key: string]: { total: number; avg: number; count: number };
  } = {};

  Object.keys(categoryTotals).forEach((category) => {
    const amounts = categoryTotals[category];
    const total = amounts.reduce((sum, amt) => sum + amt, 0);
    const avg = total / amounts.length;
    stats[category] = { total, avg, count: amounts.length };
  });

  return stats;
}

/**
 * Generate AI-powered spending insights
 */
export async function generateInsights(
  userId: string,
  periodDays: number = 30,
  categories?: string[],
  focus?: 'savings' | 'balance' | 'growth'
): Promise<SpendingInsight[]> {
  try {
    const expenses = await getUserExpenses(userId, periodDays);

    if (expenses.length === 0) {
      return [];
    }

    const categoryStats = calculateCategoryStats(expenses);
    const totalSpending = expenses.reduce((sum, e) => sum + e.amount, 0);

    // Prepare data for AI
    const categoryBreakdown = Object.entries(categoryStats)
      .map(
        ([cat, stats]) =>
          `${cat}: R$ ${stats.total.toFixed(2)} (${stats.count} transações, média R$ ${stats.avg.toFixed(2)})`
      )
      .join('\n');

    const prompt = `Você é um consultor financeiro especializado em análise de gastos familiares. Analise os seguintes dados de gastos dos últimos ${periodDays} dias:

Total gasto: R$ ${totalSpending.toFixed(2)}
Número de transações: ${expenses.length}

Gastos por categoria:
${categoryBreakdown}

${focus ? `Foco da análise: ${focus === 'savings' ? 'economia e redução de gastos' : focus === 'balance' ? 'equilíbrio financeiro' : 'crescimento patrimonial'}` : ''}

Gere 3-5 insights acionáveis em formato JSON com a seguinte estrutura:
{
  "insights": [
    {
      "type": "opportunity|recommendation|warning|anomaly",
      "category": "nome da categoria",
      "title": "título curto e direto",
      "description": "descrição detalhada do insight",
      "impact": número em reais do impacto estimado mensal,
      "confidence": número de 0 a 1 (confiança do insight),
      "action": "ação específica recomendada"
    }
  ]
}

Regras:
- Use português brasileiro
- Seja específico com valores
- Priorize insights acionáveis
- Insights devem ser realistas e baseados nos dados`;

    const ai = getOpenAI();

    const completion = await ai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'Você é um assistente financeiro especializado. Sempre responda em JSON válido.',
        },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 1500,
    });

    const responseText = completion.choices[0].message.content || '{}';
    const parsed = JSON.parse(responseText);

    const db = await getDatabase();
    const results: SpendingInsight[] = [];

    for (const insight of parsed.insights || []) {
      const insightId = `ai_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Insights expire in 7 days

      // Save to database
      await db.query(
        `INSERT INTO insights (id, user_id, insight_type, category, title, description, impact_amount, confidence, action, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          insightId,
          userId,
          insight.type,
          insight.category,
          insight.title,
          insight.description,
          insight.impact,
          insight.confidence,
          insight.action,
          expiresAt,
        ]
      );

      results.push({
        id: insightId,
        userId,
        type: insight.type,
        category: insight.category,
        title: insight.title,
        description: insight.description,
        impact: insight.impact,
        confidence: insight.confidence,
        action: insight.action,
        createdAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
      });
    }

    return results;
  } catch (error) {
    console.error('Error generating insights:', error);
    throw error;
  }
}

/**
 * Detect spending anomalies using statistical analysis + AI interpretation
 */
export async function detectAnomalies(
  userId: string,
  lookbackDays: number = 90
): Promise<SpendingAnomaly[]> {
  try {
    const expenses = await getUserExpenses(userId, lookbackDays);

    if (expenses.length < 10) {
      // Need minimum data for meaningful analysis
      return [];
    }

    const categoryStats = calculateCategoryStats(expenses);
    const anomalies: SpendingAnomaly[] = [];

    // Statistical anomaly detection
    for (const [category, stats] of Object.entries(categoryStats)) {
      const categoryExpenses = expenses.filter((e) => e.category === category);
      const amounts = categoryExpenses.map((e) => e.amount);

      // Calculate standard deviation
      const mean = stats.avg;
      const variance =
        amounts.reduce((sum, amt) => sum + Math.pow(amt - mean, 2), 0) /
        amounts.length;
      const stdDev = Math.sqrt(variance);

      // Detect outliers (> 2 standard deviations)
      const outliers = categoryExpenses.filter(
        (e) => Math.abs(e.amount - mean) > 2 * stdDev
      );

      if (outliers.length > 0) {
        for (const outlier of outliers) {
          const severity =
            Math.abs(outlier.amount - mean) > 3 * stdDev ? 'high' : 'medium';

          anomalies.push({
            id: `anomaly_${outlier.id}`,
            userId,
            type: 'outlier',
            category,
            description: `Gasto atípico: ${outlier.description}`,
            amount: outlier.amount,
            normalRange: {
              min: Math.max(0, mean - 2 * stdDev),
              max: mean + 2 * stdDev,
              average: mean,
            },
            severity,
            explanation: `Este valor está ${((Math.abs(outlier.amount - mean) / stdDev).toFixed(1))}x acima/abaixo da média`,
            suggestion: `Verifique se este gasto de R$ ${outlier.amount.toFixed(2)} está correto. A média para ${category} é R$ ${mean.toFixed(2)}.`,
          });
        }
      }

      // Detect spending spikes (total > 1.5x average)
      if (stats.total > mean * stats.count * 1.5) {
        anomalies.push({
          id: `spike_${category}`,
          userId,
          type: 'spike_detection',
          category,
          description: `Aumento significativo em ${category}`,
          amount: stats.total,
          normalRange: {
            min: mean * 0.8,
            max: mean * 1.2,
            average: mean,
          },
          severity: stats.total > mean * stats.count * 2 ? 'high' : 'medium',
          explanation: `Gastos em ${category} estão ${((stats.total / (mean * stats.count) - 1) * 100).toFixed(0)}% acima do normal`,
          suggestion: `Revise seus gastos em ${category} e considere estabelecer um orçamento mais rigoroso.`,
        });
      }
    }

    // Use AI for contextual interpretation if anomalies found
    if (anomalies.length > 0) {
      const anomalySummary = anomalies
        .slice(0, 5)
        .map(
          (a) =>
            `${a.type}: ${a.category} - R$ ${a.amount.toFixed(2)} (normal: R$ ${a.normalRange.average.toFixed(2)})`
        )
        .join('\n');

      const prompt = `Analise estas anomalias de gastos detectadas:

${anomalySummary}

Para cada anomalia, forneça uma explicação mais contextual e uma sugestão específica em português brasileiro.
Responda em JSON:
{
  "interpretations": [
    {
      "type": "tipo da anomalia",
      "explanation": "explicação contextualizada",
      "suggestion": "sugestão específica de ação"
    }
  ]
}`;

      try {
        const ai = getOpenAI();
        const completion = await ai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content:
                'Você é um assistente financeiro. Responda sempre em JSON válido.',
            },
            { role: 'user', content: prompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.6,
          max_tokens: 1000,
        });

        const responseText = completion.choices[0].message.content || '{}';
        const parsed = JSON.parse(responseText);

        // Enhance anomalies with AI interpretations
        if (parsed.interpretations && parsed.interpretations.length > 0) {
          parsed.interpretations.forEach((interp: any, idx: number) => {
            if (anomalies[idx]) {
              anomalies[idx].explanation = interp.explanation;
              anomalies[idx].suggestion = interp.suggestion;
            }
          });
        }
      } catch (aiError) {
        console.warn('AI interpretation failed, using statistical analysis only:', aiError);
        // Continue with statistical anomalies only
      }
    }

    // Save anomalies to database
    const db = await getDatabase();
    for (const anomaly of anomalies) {
      await db.query(
        `INSERT INTO anomalies (id, user_id, anomaly_type, category, description, amount, normal_min, normal_max, normal_avg, severity, explanation, suggestion)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (id) DO NOTHING`,
        [
          anomaly.id,
          userId,
          anomaly.type,
          anomaly.category,
          anomaly.description,
          anomaly.amount,
          anomaly.normalRange.min,
          anomaly.normalRange.max,
          anomaly.normalRange.average,
          anomaly.severity,
          anomaly.explanation,
          anomaly.suggestion,
        ]
      );
    }

    return anomalies;
  } catch (error) {
    console.error('Error detecting anomalies:', error);
    throw error;
  }
}

/**
 * Check if OpenAI is configured
 */
export function isAIConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}
