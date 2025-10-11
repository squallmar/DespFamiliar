export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { requireAuth } from '@/lib/auth';
import * as XLSX from 'xlsx';

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

    const expenses = await db.all(
      `SELECT e.*, c.name as category_name, c.color as category_color, c.icon as category_icon
       FROM expenses e
       LEFT JOIN categories c ON e.category_id = c.id
       WHERE e.user_id = ? AND datetime(e.date) BETWEEN datetime(?) AND datetime(?)
       ORDER BY e.date ASC`,
      [user.userId, from.toISOString(), to.toISOString()]
    );

    // === PDF Export ===
    if (type === 'pdf') {
      const PDFDocument = (await import('pdfkit')).default;
      const doc = new PDFDocument({ margin: 30, size: 'A4' });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));

  doc.font('Times-Roman');
  doc.fontSize(18).text('Relatório de Despesas', { align: 'center' }).moveDown();
  doc.fontSize(10).text(`Período: ${formatDate(from)} a ${formatDate(to)}`).moveDown();
  doc.fontSize(11);
  doc.text('Data', 30, doc.y, { continued: true, width: 70 });
  doc.text('Valor', 100, doc.y, { continued: true, width: 60 });
  doc.text('Descrição', 160, doc.y, { continued: true, width: 150 });
  doc.text('Categoria', 310, doc.y, { continued: true, width: 90 });
  doc.text('Recorrente', 400, doc.y, { continued: true, width: 60 });
  doc.text('Tags', 460, doc.y, { width: 100 });
  doc.moveDown(0.5);

      if (expenses.length === 0) {
        doc.text('Nenhuma despesa encontrada para o período.', 30, doc.y + 10);
      } else {
        (expenses as Expense[]).forEach((e) => {
          doc.text(formatDate(e.date), 30, doc.y, { continued: true, width: 70 });
          doc.text(formatCurrency(Number(e.amount)), 100, doc.y, { continued: true, width: 60 });
          doc.text(e.description, 160, doc.y, { continued: true, width: 150 });
          doc.text(e.category_name ?? '', 310, doc.y, { continued: true, width: 90 });
          doc.text(e.recurring ? 'Sim' : 'Não', 400, doc.y, { continued: true, width: 60 });
          doc.text(e.tags ?? '', 460, doc.y, { width: 100 }).moveDown(0.5);
        });
      }

      doc.end();
      const pdfBuffer: Buffer = await new Promise((resolve) => {
        doc.on('end', () => resolve(Buffer.concat(chunks)));
      });

      const filename = `export-despesas-${from.toISOString().slice(0,10)}_a_${to.toISOString().slice(0,10)}.pdf`;
  return new NextResponse(pdfBuffer as unknown as BodyInit, {
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
