import { NextRequest, NextResponse } from 'next/server';
import { generateInsights, isAIConfigured } from '@/lib/ai';
import { getDatabase } from '@/lib/database';

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if OpenAI is configured
    if (!isAIConfigured()) {
      return NextResponse.json(
        {
          error: 'AI service not configured',
          message: 'Please set OPENAI_API_KEY environment variable',
        },
        { status: 503 }
      );
    }

    const { periodDays, categories, focus } = (await req.json()) as {
      periodDays?: number;
      categories?: string[];
      focus?: 'savings' | 'balance' | 'growth';
    };

    // Generate AI-powered insights
    const insights = await generateInsights(
      userId,
      periodDays || 30,
      categories,
      focus
    );

    return NextResponse.json(
      {
        requestId: `req_${Date.now()}`,
        status: 'completed',
        generatedAt: new Date().toISOString(),
        insights,
        totalOpportunities: insights.filter((i) => i.type === 'opportunity')
          .length,
        estimatedSavings: insights.reduce((sum, i) => sum + i.impact, 0),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error generating insights:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate insights',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const type = searchParams.get('type');

    const db = await getDatabase();

    let query = `
      SELECT id, user_id, insight_type, category, title, description, 
             impact_amount, confidence, action, created_at, expires_at
      FROM insights
      WHERE user_id = $1 AND expires_at > NOW()`;

    const params: any[] = [userId];

    if (type) {
      query += ' AND insight_type = $2';
      params.push(type);
    }

    query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1);
    params.push(limit);

    const result = await db.query(query, params);

    const insights = result.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      type: row.insight_type,
      category: row.category,
      title: row.title,
      description: row.description,
      impact: row.impact_amount,
      confidence: row.confidence,
      action: row.action,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
    }));

    return NextResponse.json(insights);
  } catch (error) {
    console.error('Error fetching insights:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
