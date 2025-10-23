export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { requireAuth } from '@/lib/auth';
import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest) {
  // Definição de tipo para despesas
  type Expense = {
    id: string;
    date: string;
    amount: number | string;
    description: string;
    category_id?: string;
    category_name?: string;
    category_color?: string;
    category_icon?: string;
    recurring?: number | boolean;
    recurring_type?: string;
    tags?: string;
  };
  try {
    const user = await requireAuth(request);
    const db = await getDatabase();
    const { searchParams } = new URL(request.url);
    const type = (searchParams.get('type') || 'csv').toLowerCase();
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    const language = searchParams.get('lang') || 'pt-BR';
    const currency = searchParams.get('cur') || 'BRL';

    const formatCurrency = (v: number) => new Intl.NumberFormat(language, { style: 'currency', currency }).format(v);
    const formatDate = (d: string | Date) => new Date(d).toLocaleDateString(language);
    const getMonthRange = (date = new Date()) => {
      const y = date.getFullYear(), m = date.getMonth();
      return { from: new Date(y, m, 1), to: new Date(y, m + 1, 0, 23, 59, 59, 999) };
    };

    const { from, to } = fromParam && toParam ? 
      { from: new Date(fromParam), to: new Date(toParam) } : 
      getMonthRange();

    const expensesResult = await db.query(
      `SELECT e.*, c.name as category_name, c.color as category_color, c.icon as category_icon
       FROM expenses e
       LEFT JOIN categories c ON e.category_id = c.id
       WHERE e.user_id = $1 AND date(e.date) >= date($2) AND date(e.date) <= date($3)
       ORDER BY e.date ASC`,
      [user.userId, from.toISOString(), to.toISOString()]
    );
    const expenses = expensesResult.rows;

    // === PDF Export ===
    if (type === 'pdf') {
      const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');

  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([595.28, 841.89]); // A4 size in points
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontSizeTitle = 18;
  const fontSizeSub = 10;
  const fontSizeTable = 11;
  let y = 800;

      // Título
      page.drawText('Relatório de Despesas', {
        x: 50,
        y,
        size: fontSizeTitle,
        font,
        color: rgb(0, 0, 0),
      });
      y -= 30;
      page.drawText(`Período: ${formatDate(from)} a ${formatDate(to)}`, {
        x: 50,
        y,
        size: fontSizeSub,
        font,
        color: rgb(0, 0, 0),
      });
      y -= 30;

      // Cabeçalho da tabela
      const headers = ['Data', 'Valor', 'Descrição', 'Categoria', 'Recorrente', 'Tags'];
      let x = 50;
      headers.forEach((header, idx) => {
        page.drawText(header, {
          x,
          y,
          size: fontSizeTable,
          font,
          color: rgb(0.1, 0.1, 0.1),
        });
        x += [70, 60, 150, 90, 60, 100][idx] || 60;
      });
      y -= 20;

      if (expenses.length === 0) {
        page.drawText('Nenhuma despesa encontrada para o período.', {
          x: 50,
          y,
          size: fontSizeTable,
          font,
          color: rgb(0.5, 0, 0),
        });
      } else {
        for (const e of expenses) {
          x = 50;
          const row = [
            formatDate(e.date),
            formatCurrency(Number(e.amount)),
            String(e.description),
            String(e.category_name ?? ''),
            e.recurring ? 'Sim' : 'Não',
            String(e.tags ?? ''),
          ];
          row.forEach((cell, idx) => {
            page.drawText(cell, {
              x,
              y,
              size: fontSizeTable,
              font,
              color: rgb(0, 0, 0),
              maxWidth: [70, 60, 150, 90, 60, 100][idx] || 60,
            });
            x += [70, 60, 150, 90, 60, 100][idx] || 60;
          });
          y -= 18;
          if (y < 60) {
            y = 800;
            page = pdfDoc.addPage([595.28, 841.89]);
          }
        }
      }

      const pdfBytes = await pdfDoc.save();
      const filename = `export-despesas-${from.toISOString().slice(0,10)}_a_${to.toISOString().slice(0,10)}.pdf`;
      return new NextResponse(Buffer.from(pdfBytes), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`
        }
      });
    }

    // === Excel Export ===
    if (['excel', 'xlsx'].includes(type)) {
      const excelData = (expenses as Expense[]).map((e) => ({
        Data: new Date(e.date).toLocaleDateString('pt-BR'),
        Valor: e.amount,
        Descrição: e.description,
        Categoria: e.category_name,
        Ícone: e.category_icon,
        Recorrente: e.recurring ? 'Sim' : 'Não',
        TipoRecorrência: e.recurring_type ?? '',
        Tags: e.tags ?? ''
      }));

      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Despesas');
      const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      const filename = `export-despesas-${from.toISOString().slice(0,10)}_a_${to.toISOString().slice(0,10)}.xlsx`;
      return new NextResponse(excelBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}"`
        }
      });
    }

    // === CSV Export ===
    const headers = ['id','date','amount','description','categoryId','categoryName','categoryIcon','recurring','recurringType','tags'];
    const escape = (v: unknown) => {
      if (v == null) return '';
      const s = String(v);
      return s.includes('"') || s.includes(',') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = [headers.join(',')];
    for (const e of expenses) {
      rows.push([
        e.id, formatDate(e.date), formatCurrency(Number(e.amount)), e.description,
        e.category_id, e.category_name ?? '', e.category_icon ?? '',
        e.recurring ? '1' : '0', e.recurring_type ?? '', e.tags ?? ''
      ].map(escape).join(','));
    }

    const csvWithBom = '\uFEFF' + rows.join('\n');
    const filename = `export-despesas-${from.toISOString().slice(0,10)}_a_${to.toISOString().slice(0,10)}.csv`;

    // --- CONQUISTA: Primeira exportação ---
    const ach = await db.query('SELECT id FROM achievements WHERE user_id = $1 AND type = $2', [user.userId, 'first_export']);
    if (!ach.rows[0]) {
      await db.query('INSERT INTO achievements (id, user_id, type, description) VALUES ($1, $2, $3, $4)',
        [uuidv4(), user.userId, 'first_export', 'Primeira exportação de dados!']);
    }

    return new NextResponse(csvWithBom, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });

  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    console.error('Erro na exportação:', error);
    return NextResponse.json({ error: 'Falha ao exportar dados' }, { status: 500 });
  }
}
