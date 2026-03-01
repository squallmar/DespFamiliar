import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { requireAuth } from '@/lib/auth';
import { checkRateLimit, getClientIpFromRequest } from '@/lib/rate-limit';

// Configuração Asaas
const ASAAS_API_KEY = process.env.ASAAS_API_KEY;
const ASAAS_BASE_URL = process.env.ASAAS_BASE_URL || 'https://sandbox.asaas.com/api/v3';

export async function POST(request: NextRequest) {
  try {
    if (!ASAAS_API_KEY) {
      return NextResponse.json(
        { error: 'Asaas não configurado. Configure ASAAS_API_KEY no .env' },
        { status: 503 }
      );
    }

    let user;
    try {
      user = requireAuth(request);
    } catch {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    const ip = getClientIpFromRequest(request);
    const rateLimit = checkRateLimit(`premium:asaas:${user.userId}:${ip}`, 4, 10 * 60 * 1000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Muitas tentativas. Aguarde alguns minutos para gerar nova cobrança.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.retryAfterSeconds),
          },
        }
      );
    }

    const db = await getDatabase();

    const result = await db.query(
      'SELECT * FROM users WHERE id = $1',
      [user.userId]
    );

    const dbUser = result.rows[0];

    if (!dbUser) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    // 1. Criar ou buscar cliente no Asaas
    const customerResponse = await fetch(`${ASAAS_BASE_URL}/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': ASAAS_API_KEY,
      },
      body: JSON.stringify({
        name: dbUser.name || dbUser.email,
        email: dbUser.email,
        cpfCnpj: dbUser.cpf || undefined,
        externalReference: dbUser.id,
      }),
    });

    const customerData = await customerResponse.json();
    
    if (!customerResponse.ok && customerData.errors?.[0]?.code !== 'already_exists') {
      console.error('Erro ao criar cliente Asaas:', customerData);
      return NextResponse.json(
        { error: 'Erro ao criar cliente no Asaas' },
        { status: 400 }
      );
    }

    const customerId = customerData.id || customerData.errors?.[0]?.description?.match(/[a-f0-9]{32}/)?.[0];

    if (!customerId) {
      return NextResponse.json(
        { error: 'Não foi possível identificar o cliente no Asaas' },
        { status: 400 }
      );
    }

    // 2. Criar assinatura recorrente Pix (mensal)
    const nextDueDate = new Date();
    nextDueDate.setDate(nextDueDate.getDate() + 1); // Primeira cobrança amanhã

    const subscriptionResponse = await fetch(`${ASAAS_BASE_URL}/subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': ASAAS_API_KEY,
      },
      body: JSON.stringify({
        customer: customerId,
        billingType: 'PIX',
        value: 20.00,
        nextDueDate: nextDueDate.toISOString().split('T')[0],
        cycle: 'MONTHLY',
        description: 'Assinatura Premium DespFamiliar - R$20/mês',
        externalReference: `premium-subscription-${dbUser.id}-${Date.now()}`,
      }),
    });

    const subscriptionData = await subscriptionResponse.json();

    if (!subscriptionResponse.ok) {
      console.error('Erro ao criar assinatura Asaas:', subscriptionData);
      return NextResponse.json(
        { error: 'Erro ao gerar assinatura Pix mensal' },
        { status: 400 }
      );
    }

    // 3. Buscar pagamentos da assinatura para pegar o QR Code
    const paymentsResponse = await fetch(
      `${ASAAS_BASE_URL}/subscriptions/${subscriptionData.id}/payments`,
      {
        headers: {
          'access_token': ASAAS_API_KEY,
        },
      }
    );

    const paymentsData = await paymentsResponse.json();

    if (!paymentsResponse.ok || !paymentsData.data?.[0]) {
      console.error('Erro ao buscar pagamentos da assinatura:', paymentsData);
      return NextResponse.json(
        { error: 'Erro ao processar assinatura' },
        { status: 400 }
      );
    }

    const firstPayment = paymentsData.data[0];

    // 4. Buscar QR Code do primeiro pagamento
    const pixResponse = await fetch(
      `${ASAAS_BASE_URL}/payments/${firstPayment.id}/pixQrCode`,
      {
        headers: {
          'access_token': ASAAS_API_KEY,
        },
      }
    );

    const pixData = await pixResponse.json();

    if (!pixResponse.ok) {
      console.error('Erro ao buscar Pix QR Code:', pixData);
      return NextResponse.json(
        { error: 'Erro ao gerar QR Code Pix' },
        { status: 400 }
      );
    }

    // 5. Salvar assinatura no banco para tracking
    try {
      await db.query(
        `INSERT INTO pix_payments (user_id, asaas_subscription_id, asaas_customer_id, amount, status, next_due_date)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (asaas_subscription_id) DO NOTHING`,
        [dbUser.id, subscriptionData.id, customerId, 20.00, 'PENDING', nextDueDate]
      );
    } catch (dbError) {
      console.error('Falha ao persistir assinatura Pix localmente:', dbError);
    }

    return NextResponse.json({
      success: true,
      subscriptionId: subscriptionData.id,
      paymentId: firstPayment.id,
      qrCodeImage: pixData.encodedImage, // Base64 da imagem QR Code
      qrCodePayload: pixData.payload, // Código Pix Copia e Cola
      expiresAt: firstPayment.expirationDate,
      amount: 20.00,
      isMonthly: true,
    });

  } catch (error) {
    console.error('Erro ao gerar Pix Asaas:', error);
    return NextResponse.json(
      { error: 'Falha ao gerar Pix' },
      { status: 500 }
    );
  }
}
