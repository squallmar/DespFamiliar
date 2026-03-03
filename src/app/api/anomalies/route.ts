import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TODO: Analyze expenses and detect anomalies
    const anomalies = [
      {
        id: '1',
        type: 'spike_detection',
        description: 'Pico de gasto em Restaurantes',
        category: 'Lazer',
        amount: 185.5,
        normalRange: { min: 50, max: 100 },
        date: new Date().toISOString(),
        severity: 'medium',
        explanation: 'Este gasto está 85% acima do seu intervalo normal para esta categoria',
      },
      {
        id: '2',
        type: 'pattern_change',
        description: 'Mudança em padrão de gastos com Transporte',
        category: 'Transporte',
        amount: 240.0,
        normalRange: { min: 150, max: 200 },
        date: new Date().toISOString(),
        severity: 'low',
        explanation: 'Você está gastando consistentemente mais com transporte nos últimos 3 meses',
      },
    ];

    // TODO: Query anomalies from database
    return NextResponse.json(anomalies);
  } catch (error) {
    console.error('Error detecting anomalies:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
