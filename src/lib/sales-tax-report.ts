import { quoteCardValues } from './quote-card-values';

export interface SalesTaxRow {
  numero: string; cliente: string; dataRecebimento: string;
  taxable: number; salesTax: number; total: number; exempt: boolean;
}

const prefix = (numero: string) => `Invoice ${String(numero).replace('/', '-')} - `;

/** Sales tax collected in a month: invoices whose payment was received (paid entry) in that month. */
export function buildSalesTaxReport(quotes: any[], entries: any[], companyName: string | null | undefined, year: number, month: number) {
  const rows: SalesTaxRow[] = [];
  for (const q of quotes) {
    const e = entries.find(l => l.pago && l.data_realizada && String(l.descricao || '').startsWith(prefix(q.numero)));
    if (!e) continue;
    const d = new Date(e.data_realizada);
    if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month) continue;
    const { value, salesTax } = quoteCardValues(q, companyName);
    rows.push({ numero: q.numero, cliente: q.cliente_nome, dataRecebimento: String(e.data_realizada).slice(0, 10),
      taxable: salesTax > 0 ? value : 0, salesTax, total: Math.round((value + salesTax) * 100) / 100, exempt: salesTax === 0 });
  }
  rows.sort((a, b) => a.dataRecebimento.localeCompare(b.dataRecebimento));
  const sum = (k: keyof SalesTaxRow) => Math.round(rows.reduce((s, r) => s + (r[k] as number), 0) * 100) / 100;
  return { rows, totalSales: sum('total') - sum('salesTax'), taxableSales: sum('taxable'), salesTax: sum('salesTax') };
}
