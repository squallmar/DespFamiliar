import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data } = await req.json();

    // TODO: Call OpenAI/Claude API with spending data
    // const insights = await generateInsightsWithLLM(data);

    const mockInsights = [
      {
        id: '1',
        type: 'opportunity',
        title: 'Reduzir gastos em alimentação',
        description: 'Você gastou 35% mais em alimentação este mês comparado à média',
        impact: 125.5,
        confidence: 0.87,
        category: 'Alimentação',
        action: 'Revisar hábitos de alimentação fora',
        createdAt: new Date().toISOString(),
      },
      {
        id: '2',
        type: 'recommendation',
        title: 'Aproveitar desconto no lanche',
        description: 'Há desconto de 20% em cafés entre 2-4 da tarde',
        impact: 35.0,
        confidence: 0.92,
        action: 'Visualizar oferta',
        createdAt: new Date().toISOString(),
      },
    ];

    // TODO: Save insights to database
    return NextResponse.json(mockInsights);
  } catch (error) {
    console.error('Error generating insights:', error);
    return NextResponse.json(
      { error: 'Failed to generate insights' },
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

    // TODO: Query insights from database
    const insights = [
      {
        id: '1',
        type: 'opportunity',
        title: 'Oportunidade de economia',
        description: 'Identificada categoria com gastos acima da média',
        confidence: 0.85,
        createdAt: new Date().toISOString(),
        isRead: false,
      },
    ];

    return NextResponse.json(insights);
  } catch (error) {
    console.error('Error fetching insights:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
