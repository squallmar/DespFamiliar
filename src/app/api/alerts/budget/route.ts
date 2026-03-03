import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TODO: Query user's budget limits from database
    // TODO: Get current spending by category for current month
    // TODO: Calculate remaining days in month
    // TODO: Generate personalized recommendations

    const mockAlerts = [
      {
        id: '1',
        categoryId: 'food',
        categoryName: 'Alimentação',
        budgetLimit: 500,
        currentSpent: 425,
        status: 'critical',
        percentageUsed: 85,
        daysLeft: 8,
        message: 'Você atingiu 85% do seu orçamento de Alimentação',
        recommendations: [
          'Reduza gastos com restaurantes',
          'Considere fazer mais refeições em casa',
        ],
        createdAt: new Date().toISOString(),
      },
      {
        id: '2',
        categoryId: 'transport',
        categoryName: 'Transporte',
        budgetLimit: 300,
        currentSpent: 210,
        status: 'warning',
        percentageUsed: 70,
        daysLeft: 8,
        message: 'Você usou 70% do seu orçamento de Transporte',
        recommendations: ['Considere usar transporte público mais'],
        createdAt: new Date().toISOString(),
      },
    ];

    return NextResponse.json(mockAlerts);
  } catch (error) {
    console.error('Error fetching budget alerts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
