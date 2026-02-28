import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { requireAuth } from '@/lib/auth';

// Configuração Asaas
const ASAAS_API_KEY = process.env.ASAAS_API_KEY;
const ASAAS_BASE_URL = process.env.ASAAS_BASE_URL || 'https://sandbox.asaas.com/api/v3';

export async function POST(request: NextRequest) {
  try {
    if (!ASAAS_API_KEY) {
      return NextResponse.json(
        { error: 'Asaas não configurado. Configure ASAAS_API_KEY no .env' },
        { status: 500 }
      );
    }

    const user = requireAuth(request);
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

    // 2. Criar cobrança Pix
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 1); // Vence amanhã

    const paymentResponse = await fetch(`${ASAAS_BASE_URL}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': ASAAS_API_KEY,
      },
      body: JSON.stringify({
        customer: customerId,
        billingType: 'PIX',
        value: 20.00,
        dueDate: dueDate.toISOString().split('T')[0],
        description: 'Assinatura Premium DespFamiliar - Mensal',
        externalReference: `premium-${dbUser.id}-${Date.now()}`,
      }),
    });

    const paymentData = await paymentResponse.json();

    if (!paymentResponse.ok) {
      console.error('Erro ao criar cobrança Asaas:', paymentData);
      return NextResponse.json(
        { error: 'Erro ao gerar cobrança Pix' },
        { status: 400 }
      );
    }

    // 3. Buscar QR Code
    const qrCodeResponse = await fetch(
      `${ASAAS_BASE_URL}/payments/${paymentData.id}/pixQrCode`,
      {
        headers: {
          'access_token': ASAAS_API_KEY,
        },
      }
    );

    const qrCodeData = await qrCodeResponse.json();

    // 4. Salvar cobrança no banco para tracking
    await db.query(
      `INSERT INTO pix_payments (user_id, asaas_payment_id, asaas_customer_id, amount, status, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (asaas_payment_id) DO NOTHING`,
      [dbUser.id, paymentData.id, customerId, 20.00, 'PENDING', dueDate]
    );

    return NextResponse.json({
      success: true,
      paymentId: paymentData.id,
      qrCodeImage: qrCodeData.encodedImage, // Base64 da imagem QR Code
      qrCodePayload: qrCodeData.payload, // Código Pix Copia e Cola
      expiresAt: dueDate.toISOString(),
      amount: 20.00,
    });

  } catch (error) {
    console.error('Erro ao gerar Pix Asaas:', error);
    return NextResponse.json(
      { error: 'Falha ao gerar Pix' },
      { status: 500 }
    );
  }
}
