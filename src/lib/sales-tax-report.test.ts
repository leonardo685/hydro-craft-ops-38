import { describe, it, expect } from 'vitest';
import { buildSalesTaxReport } from './sales-tax-report';

const quotes = [{ numero: '0001/26', cliente_nome: 'A', valor: 1000 }, { numero: '0002/26', cliente_nome: 'B', valor: 500, tax_exempt: true }, { numero: '0003/26', cliente_nome: 'C', valor: 2000 }];
const entries = [
  { descricao: 'Invoice 0001-26 - A', pago: true, data_realizada: '2026-10-05T12:00:00Z' },
  { descricao: 'Invoice 0002-26 - B', pago: true, data_realizada: '2026-10-20T12:00:00Z' },
  { descricao: 'Invoice 0003-26 - C', pago: false, data_realizada: null },
];

describe('monthly sales tax report', () => {
  it('sums tax only from invoices received in the month', () => {
    const r = buildSalesTaxReport(quotes, entries, 'MEC HYDRO', 2026, 9);
    expect(r.salesTax).toBe(85);
    expect(r.taxableSales).toBe(1000);
    expect(r.totalSales).toBe(1500);
    expect(r.rows).toHaveLength(2);
  });
  it('excludes invoices received in another month', () => {
    expect(buildSalesTaxReport(quotes, entries, 'MEC HYDRO', 2026, 10).rows).toHaveLength(0);
  });
});
