import { parsePaymentTerms } from './company-features';

/** Expected payment date (YYYY-MM-DD) from delivery date and the quote's payment condition. NET = calendar days, BUSINESS DAYS = Mon–Fri. */
export function expectedPaymentDate(deliveryDate: string, paymentCondition: string | null | undefined): string {
  const [y, m, d] = deliveryDate.slice(0, 10).split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (!paymentCondition?.trim()) return date.toISOString().slice(0, 10);
  const { days, type } = parsePaymentTerms(paymentCondition);
  if (type === 'BUSINESS DAYS') {
    let left = days;
    while (left > 0) {
      date.setUTCDate(date.getUTCDate() + 1);
      const wd = date.getUTCDay();
      if (wd !== 0 && wd !== 6) left--;
    }
  } else {
    date.setUTCDate(date.getUTCDate() + days);
  }
  return date.toISOString().slice(0, 10);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Financial category chosen as the quote's Service Type (stored as "Tipo: <id> | ..."). */
export function quoteServiceCategoryId(observacoes: string | null | undefined): string | null {
  const id = observacoes?.split('|')[0]?.replace('Tipo:', '').trim();
  return id && UUID.test(id) ? id : null;
}
