import { NextRequest, NextResponse } from 'next/server';

interface ParseResult {
  fileName: string;
  format: 'csv' | 'ofx' | 'qif';
  transactionsCount: number;
  categorizedCount: number;
  pendingCount: number;
  preview: any[];
  errors?: string[];
  warnings?: string[];
}

interface ImportedTransaction {
  date: string;
  description: string;
  amount: number;
  category: string;
}

function parseCSV(content: string): ImportedTransaction[] {
  const lines = content.split('\n');
  const transactions: ImportedTransaction[] = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const [date, description, amount, category] = lines[i].split(',');
    transactions.push({
      date: date?.trim(),
      description: description?.trim(),
      amount: parseFloat(amount),
      category: category?.trim() || 'Sem categoria',
    });
  }

  return transactions;
}

function parseOFX(content: string): ImportedTransaction[] {
  // Basic OFX parsing - extract STMTRS elements
  const transactions: ImportedTransaction[] = [];
  const stmtRsRegex = /<STMTRS>[\s\S]*?<\/STMTRS>/g;
  const matches = content.match(stmtRsRegex) || [];

  matches.forEach((match) => {
    const dateMatch = match.match(/<DTPOSTED>(\d{8})/);
    const descrMatch = match.match(/<MEMO>(.*?)<\/MEMO>/);
    const amountMatch = match.match(/<TRNAMT>(-?\d+\.?\d*)/);

    if (dateMatch && descrMatch && amountMatch) {
      const dateStr = dateMatch[1];
      transactions.push({
        date: `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`,
        description: descrMatch[1],
        amount: parseFloat(amountMatch[1]),
        category: 'Sem categoria',
      });
    }
  });

  return transactions;
}

function parseQIF(content: string): ImportedTransaction[] {
  const transactions: ImportedTransaction[] = [];
  const lines = content.split('\n');
  let currentTransaction: Partial<ImportedTransaction> = {};

  lines.forEach((line) => {
    const code = line[0];
    const value = line.slice(1).trim();

    switch (code) {
      case 'D':
        currentTransaction.date = value;
        break;
      case 'T':
        currentTransaction.amount = parseFloat(value);
        break;
      case 'P':
        currentTransaction.description = value;
        break;
      case 'L':
        currentTransaction.category = value || 'Sem categoria';
        break;
      case '^':
        if (
          currentTransaction.date &&
          currentTransaction.description &&
          typeof currentTransaction.amount === 'number'
        ) {
          transactions.push({
            date: currentTransaction.date,
            description: currentTransaction.description,
            amount: currentTransaction.amount,
            category: currentTransaction.category || 'Sem categoria',
          });
        }
        currentTransaction = {};
        break;
    }
  });

  return transactions;
}

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const format = formData.get('format') as 'csv' | 'ofx' | 'qif';

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    const content = await file.text();
    let transactions: ImportedTransaction[] = [];

    switch (format) {
      case 'csv':
        transactions = parseCSV(content);
        break;
      case 'ofx':
        transactions = parseOFX(content);
        break;
      case 'qif':
        transactions = parseQIF(content);
        break;
      default:
        return NextResponse.json(
          { error: 'Unsupported format' },
          { status: 400 }
        );
    }

    // TODO: Auto-categorize transactions using AI/ML
    const categorized = transactions.filter((t) => t.category !== 'Sem categoria');
    const pending = transactions.filter((t) => t.category === 'Sem categoria');

    const result: ParseResult = {
      fileName: file.name,
      format,
      transactionsCount: transactions.length,
      categorizedCount: categorized.length,
      pendingCount: pending.length,
      preview: transactions.slice(0, 5),
      warnings:
        pending.length > 0
          ? [`${pending.length} transações precisam de categorização manual`]
          : [],
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error parsing import:', error);
    return NextResponse.json(
      { error: 'Failed to parse file' },
      { status: 400 }
    );
  }
}
