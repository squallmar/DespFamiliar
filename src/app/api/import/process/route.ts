import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

/**
 * Process imported transactions
 * POST /api/import/process
 * 
 * Receives parsed transactions from /api/import/parse
 * Creates expense records in database
 * Returns processing status
 */
export async function POST(req: NextRequest) {
  try {
    // Get user from header
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { transactions, mapping, skipDuplicates = true } = body;

    if (!transactions || !Array.isArray(transactions)) {
      return NextResponse.json(
        { error: 'transactions array is required' },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    // Get user's categories for auto-assignment
    const categoriesResult = await db.query(
      'SELECT id, name FROM categories WHERE user_id = $1',
      [userId]
    );
    const categories = categoriesResult.rows;

    // Process each transaction
    const results = {
      total: transactions.length,
      created: 0,
      skipped: 0,
      errors: 0,
      createdIds: [] as string[],
      errorDetails: [] as { transaction: any; error: string }[],
    };

    for (const transaction of transactions) {
      try {
        // Apply user's column mapping if provided
        const mapped = mapping
          ? {
              date: transaction[mapping.date],
              description: transaction[mapping.description],
              amount: transaction[mapping.amount],
              category: transaction[mapping.category],
            }
          : transaction;

        // Validate required fields
        if (!mapped.date || !mapped.amount) {
          results.errors++;
          results.errorDetails.push({
            transaction,
            error: 'Missing required fields (date, amount)',
          });
          continue;
        }

        // Parse and validate date
        let expenseDate: Date;
        try {
          expenseDate = new Date(mapped.date);
          if (isNaN(expenseDate.getTime())) {
            throw new Error('Invalid date');
          }
        } catch {
          results.errors++;
          results.errorDetails.push({
            transaction,
            error: 'Invalid date format',
          });
          continue;
        }

        // Parse amount (handle both comma and dot as decimal separator)
        const amountStr = String(mapped.amount)
          .replace(/[^\d,.-]/g, '')
          .replace(',', '.');
        const amount = parseFloat(amountStr);

        if (isNaN(amount) || amount < 0) {
          results.errors++;
          results.errorDetails.push({
            transaction,
            error: 'Invalid amount',
          });
          continue;
        }

        const description = mapped.description || 'Importado';

        // Check for duplicates
        if (skipDuplicates) {
          const duplicateCheck = await db.query(
            `SELECT id FROM expenses
             WHERE user_id = $1 AND date = $2 AND amount = $3 AND description = $4`,
            [userId, expenseDate, amount, description]
          );

          if (duplicateCheck.rows.length > 0) {
            results.skipped++;
            continue;
          }
        }

        // Auto-assign category based on description
        let categoryId: string | null = null;

        if (mapped.category) {
          // Try to match provided category name
          const matchedCategory = categories.find(
            (c) => c.name.toLowerCase() === mapped.category.toLowerCase()
          );
          if (matchedCategory) {
            categoryId = matchedCategory.id;
          }
        } else {
          // Auto-categorize based on keywords
          categoryId = autoCategorizTransaction(description, categories);
        }

        // Insert expense
        const insertResult = await db.query(
          `INSERT INTO expenses (user_id, category_id, amount, description, date, created_at)
           VALUES ($1, $2, $3, $4, $5, NOW())
           RETURNING id`,
          [userId, categoryId, amount, description, expenseDate]
        );

        results.created++;
        results.createdIds.push(insertResult.rows[0].id);
      } catch (error: any) {
        results.errors++;
        results.errorDetails.push({
          transaction,
          error: error.message || 'Unknown error',
        });
      }
    }

    // Return processing results
    return NextResponse.json({
      success: true,
      results: {
        total: results.total,
        created: results.created,
        skipped: results.skipped,
        errors: results.errors,
      },
      createdIds: results.createdIds,
      errors: results.errorDetails.length > 0 ? results.errorDetails : undefined,
    });
  } catch (error: any) {
    console.error('Import processing error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process import' },
      { status: 500 }
    );
  }
}

/**
 * Auto-categorize transaction based on description keywords
 */
function autoCategorizTransaction(
  description: string,
  categories: { id: string; name: string }[]
): string | null {
  const desc = description.toLowerCase();

  // Common category keywords (Portuguese)
  const categoryKeywords: { [key: string]: string[] } = {
    Alimentação: [
      'mercado',
      'supermercado',
      'padaria',
      'restaurante',
      'lanchonete',
      'ifood',
      'uber eats',
      'rappi',
    ],
    Transporte: [
      'uber',
      '99',
      'cabify',
      'gasolina',
      'posto',
      'estacionamento',
      'onibus',
      'metro',
    ],
    Saúde: [
      'farmacia',
      'drogaria',
      'hospital',
      'clinica',
      'medico',
      'laboratorio',
      'exame',
    ],
    Educação: ['escola', 'faculdade', 'curso', 'livro', 'livraria', 'apostila'],
    Lazer: [
      'cinema',
      'teatro',
      'show',
      'netflix',
      'spotify',
      'prime',
      'disney',
      'jogo',
    ],
    Moradia: [
      'aluguel',
      'condominio',
      'luz',
      'agua',
      'gas',
      'internet',
      'telefone',
    ],
    'Vestuário': ['roupa', 'calcado', 'sapato', 'loja', 'vestuario'],
  };

  // Find matching category
  for (const [categoryName, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some((keyword) => desc.includes(keyword))) {
      const matchedCategory = categories.find((c) => c.name === categoryName);
      if (matchedCategory) {
        return matchedCategory.id;
      }
    }
  }

  // No match found
  return null;
}

/**
 * GET import processing status
 * GET /api/import/process?importId=xxx
 */
export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const importId = searchParams.get('importId');

    if (!importId) {
      return NextResponse.json({ error: 'importId is required' }, { status: 400 });
    }

    // In a full implementation, you would track import batches in a separate table
    // For now, we'll just return success
    return NextResponse.json({
      importId,
      status: 'completed',
      message: 'Import completed successfully',
    });
  } catch (error: any) {
    console.error('Get import status error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get import status' },
      { status: 500 }
    );
  }
}
