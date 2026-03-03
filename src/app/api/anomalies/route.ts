import { NextRequest, NextResponse } from 'next/server';
import { detectAnomalies, isAIConfigured } from '@/lib/ai';
import { getDatabase } from '@/lib/database';

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const severity = searchParams.get('severity');
    const type = searchParams.get('type');
    const refresh = searchParams.get('refresh') === 'true';

    // If refresh requested or no cached anomalies, run detection
    if (refresh) {
      try {
        await detectAnomalies(userId, 90);
      } catch (error) {
        console.warn('Anomaly detection failed, using cached data:', error);
      }
    }

    const db = await getDatabase();

    let query = `
      SELECT id, user_id, anomaly_type, category, description, amount,
             normal_min, normal_max, normal_avg, severity, explanation, 
             suggestion, detected_at
      FROM anomalies
      WHERE user_id = $1`;

    const params: any[] = [userId];

    if (severity) {
      query += ' AND severity = $2';
      params.push(severity);
    }

    if (type) {
      const typeIndex = params.length + 1;
      query += ` AND anomaly_type = $${typeIndex}`;
      params.push(type);
    }

    query += ' ORDER BY detected_at DESC LIMIT 20';

    const result = await db.query(query, params);

    const anomalies = result.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      detectionDate: row.detected_at,
      type: row.anomaly_type,
      category: row.category,
      description: row.description,
      amount: row.amount,
      normalRange: {
        min: row.normal_min,
        max: row.normal_max,
        average: row.normal_avg,
      },
      severity: row.severity,
      explanation: row.explanation,
      suggestion: row.suggestion,
    }));

    return NextResponse.json(anomalies);
  } catch (error) {
    console.error('Error fetching anomalies:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { lookbackDays } = (await req.json()) as {
      lookbackDays?: number;
    };

    // Run anomaly detection
    const anomalies = await detectAnomalies(userId, lookbackDays || 90);

    return NextResponse.json(
      {
        requestId: `anomaly_${Date.now()}`,
        detectedAt: new Date().toISOString(),
        anomalies,
        totalAnomalies: anomalies.length,
        highSeverity: anomalies.filter((a) => a.severity === 'high').length,
        aiEnabled: isAIConfigured(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error detecting anomalies:', error);
    return NextResponse.json(
      {
        error: 'Failed to detect anomalies',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
