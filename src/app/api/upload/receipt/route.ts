import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { uploadReceipt } from '@/lib/storage';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('receipt') as File;
    const expenseId = formData.get('expenseId') as string;

    if (!file || !expenseId) {
      return NextResponse.json(
        { error: 'Missing file or expenseId' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      'image/png',
      'image/jpeg',
      'image/webp',
      'application/pdf',
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Unsupported file format' },
        { status: 400 }
      );
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const receiptId = uuidv4();

    // Upload file to S3 or local storage (with automatic fallback)
    const { key, url, storage } = await uploadReceipt(file, expenseId, userId);

    // Save receipt metadata to database
    await db.query(
      `INSERT INTO receipts (id, user_id, expense_id, file_name, file_size, file_type, file_url, storage_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [receiptId, userId, expenseId, file.name, file.size, file.type, url, storage]
    );

    const receipt = {
      id: receiptId,
      userId,
      expenseId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      uploadedAt: new Date().toISOString(),
      fileUrl: url,
      storageType: storage,
      fileKey: key,
    };

    return NextResponse.json(receipt, { status: 201 });
  } catch (error) {
    console.error('Error uploading receipt:', error);
    return NextResponse.json(
      { error: 'Failed to upload receipt' },
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
    const expenseId = searchParams.get('expenseId');

    if (!expenseId) {
      return NextResponse.json(
        { error: 'expenseId is required' },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    const result = await db.query(
      `SELECT id, user_id, expense_id, file_name, file_size, file_type, file_url, uploaded_at
       FROM receipts
       WHERE user_id = $1 AND expense_id = $2`,
      [userId, expenseId]
    );

    const receipts = result.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      expenseId: row.expense_id,
      fileName: row.file_name,
      fileSize: row.file_size,
      fileType: row.file_type,
      fileUrl: row.file_url,
      uploadedAt: row.uploaded_at,
    }));

    return NextResponse.json(receipts);
  } catch (error) {
    console.error('Error fetching receipts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
