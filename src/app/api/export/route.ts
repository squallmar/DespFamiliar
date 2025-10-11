
import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { requireAuth } from '@/lib/auth';
import * as XLSX from 'xlsx';

function getMonthRange(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const from = new Date(year, month, 1);
  const to = new Date(year, month + 1, 0, 23, 59, 59, 999);
  return { from, to };
}

export async function GET(request: NextRequest) {
  try {
    console.log('[EXPORT] Iniciando exportação');
    const user = requireAuth(request);
    console.log('[EXPORT] Usuário autenticado:', user);
    const db = await getDatabase();

    const language = searchParams.get('lang') || 'pt-BR';
    const currency = searchParams.get('cur') || 'BRL';
    console.log('[EXPORT] Params:', { type, fromParam, toParam, language, currency });

    let from: Date;
    let to: Date;
    if (fromParam && toParam) {
      from = new Date(fromParam);
      to = new Date(toParam);
    } else {
      const range = getMonthRange(new Date());
      from = range.from;
      to = range.to;
    }
    console.log('[EXPORT] Período:', { from, to });

    // Helper para formatar moeda
    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat(language, { style: 'currency', currency }).format(value);
    };
    // Helper para formatar data
    const formatDate = (date: string | Date) => {
      return new Date(date).toLocaleDateString(language);
    };

    // Buscar despesas do período (apenas uma vez)
    const expenses = await db.all(
      `SELECT e.*, c.name as category_name, c.color as category_color, c.icon as category_icon
       FROM expenses e
       LEFT JOIN categories c ON e.category_id = c.id
       WHERE e.user_id = ? AND datetime(e.date) BETWEEN datetime(?) AND datetime(?)
       ORDER BY e.date ASC`,
      [user.userId, from.toISOString(), to.toISOString()]
    );

      // Garantir que o evento 'end' seja disparado
      const pdfBuffer: Buffer = await new Promise((resolve) => {
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.end();
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
    if (type === 'excel' || type === 'xlsx') {
      // Montar dados para Excel
      const excelData = expenses.map((e) => ({
            doc.text(formatCurrency(Number(e.amount)), 100, doc.y, { continued: true, width: 60 });
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


    export async function GET(request: NextRequest) {
      try {
        console.log('[EXPORT] Iniciando exportação');
        const user = requireAuth(request);
        console.log('[EXPORT] Usuário autenticado:', user);
        const db = await getDatabase();

        const { searchParams } = new URL(request.url);
        const type = (searchParams.get('type') || 'csv').toLowerCase();
        const fromParam = searchParams.get('from');
        const toParam = searchParams.get('to');
        const language = searchParams.get('lang') || 'pt-BR';
        const currency = searchParams.get('cur') || 'BRL';
        console.log('[EXPORT] Params:', { type, fromParam, toParam, language, currency });

        let from: Date;
        let to: Date;
        if (fromParam && toParam) {
          from = new Date(fromParam);
          to = new Date(toParam);
        } else {
          const range = getMonthRange(new Date());
          from = range.from;
          to = range.to;
        }
        console.log('[EXPORT] Período:', { from, to });

        // Helpers para formatação
        const formatCurrency = (value: number) => new Intl.NumberFormat(language, { style: 'currency', currency }).format(value);
        const formatDate = (date: string | Date) => new Date(date).toLocaleDateString(language);

        // Buscar despesas do período
        const expenses = await db.all(
          `SELECT e.*, c.name as category_name, c.color as category_color, c.icon as category_icon
           FROM expenses e
           LEFT JOIN categories c ON e.category_id = c.id
           WHERE e.user_id = ? AND datetime(e.date) BETWEEN datetime(?) AND datetime(?)
           ORDER BY e.date ASC`,
          [user.userId, from.toISOString(), to.toISOString()]
        );

        if (type === 'pdf') {
          const PDFDocument = (await import('pdfkit')).default;
          const doc = new PDFDocument({ margin: 30, size: 'A4' });
          const chunks: Buffer[] = [];
          doc.on('data', (chunk: Buffer) => chunks.push(chunk));

          doc.fontSize(18).text('Relatório de Despesas', { align: 'center' });
          doc.moveDown();
          doc.fontSize(10).text(`Período: ${formatDate(from)} a ${formatDate(to)}`);
          doc.moveDown();
          doc.fontSize(11).font('Helvetica-Bold');
          doc.text('Data', 30, doc.y, { continued: true, width: 70 });
          doc.text('Valor', 100, doc.y, { continued: true, width: 60 });
          doc.text('Descrição', 160, doc.y, { continued: true, width: 150 });
          doc.text('Categoria', 310, doc.y, { continued: true, width: 90 });
          doc.text('Recorrente', 400, doc.y, { continued: true, width: 60 });
          doc.text('Tags', 460, doc.y, { width: 100 });
          doc.moveDown(0.5);
          doc.font('Helvetica');
          if (expenses.length === 0) {
            doc.text('Nenhuma despesa encontrada para o período.', 30, doc.y + 10);
          } else {
            expenses.forEach((e: Record<string, any>) => {
              doc.text(formatDate(e.date), 30, doc.y, { continued: true, width: 70 });
              doc.text(formatCurrency(Number(e.amount)), 100, doc.y, { continued: true, width: 60 });
              doc.text(e.description, 160, doc.y, { continued: true, width: 150 });
              doc.text(e.category_name ?? '', 310, doc.y, { continued: true, width: 90 });
              doc.text(e.recurring ? 'Sim' : 'Não', 400, doc.y, { continued: true, width: 60 });
              doc.text(e.tags ?? '', 460, doc.y, { width: 100 });
              doc.moveDown(0.5);
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
        if (type === 'excel' || type === 'xlsx') {
          const excelData = expenses.map((e) => ({
            ID: e.id,
            Data: formatDate(e.date),
            Valor: formatCurrency(Number(e.amount)),
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
        // CSV
        const headers = [
          'id',
          'date',
          'amount',
          'description',
          'categoryId',
          'categoryName',
          'categoryIcon',
          'recurring',
          'recurringType',
          'tags'
        ];
        const escape = (v: unknown) => {
          if (v === null || v === undefined) return '';
          const s = String(v as string | number | boolean | Date);
          if (s.includes('"') || s.includes(',') || s.includes('\n')) {
            return '"' + s.replace(/"/g, '""') + '"';
          }
          return s;
        };
        const rows: string[] = [];
        rows.push(headers.join(','));
        for (const e of expenses) {
          rows.push([
            escape(e.id),
            escape(formatDate(e.date)),
            escape(formatCurrency(Number(e.amount))),
            escape(e.description),
            escape(e.category_id),
            escape(e.category_name ?? ''),
            escape(e.category_icon ?? ''),
            escape(e.recurring ? 1 : 0),
            escape(e.recurring_type ?? ''),
            escape(e.tags ?? '')
          ].join(','));
        }
        const csv = rows.join('\n');
        const filename = `export-despesas-${from.toISOString().slice(0,10)}_a_${to.toISOString().slice(0,10)}.csv`;
        return new NextResponse(csv, {
          status: 200,
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="${filename}"`
          }
        });
      } catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
          return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }
        console.error('Erro na exportação CSV:', error);
        return NextResponse.json({ error: 'Falha ao exportar dados' }, { status: 500 });
      }
    }
