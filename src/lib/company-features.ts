/** Company-specific workflow capabilities, independent of the selected language. */
export function hasFiscalBilling(companyName: string | null | undefined): boolean {
  return !companyName?.trim().toUpperCase().includes('MEC HYDRO');
}

/** Only Brazilian documents print the linked service order number. */
export function showsOrderReference(companyName: string | null | undefined): boolean {
  return hasFiscalBilling(companyName);
}

export function completionStatus(companyName: string | null | undefined, receiptId: number | null | undefined, quoteId: string | null | undefined): string {
  if (!hasFiscalBilling(companyName)) return 'finalizada';
  return receiptId ? 'aguardando_retorno' : quoteId ? 'finalizada' : 'faturado';
}
/** MEC HYDRO composes payment condition from a day count and a term type. */
export function usesStructuredPaymentTerms(companyName: string | null | undefined): boolean {
  return !hasFiscalBilling(companyName);
}

export const PAYMENT_TERM_TYPES = ['NET', 'BUSINESS DAYS'] as const;
export type PaymentTermType = typeof PAYMENT_TERM_TYPES[number];

export function parsePaymentTerms(value: string | null | undefined): { days: number; type: PaymentTermType } {
  const text = (value || '').toUpperCase();
  const days = parseInt(text.match(/\d+/)?.[0] || '30', 10);
  const type: PaymentTermType = text.includes('BUSINESS') ? 'BUSINESS DAYS' : 'NET';
  return { days: Number.isFinite(days) ? days : 30, type };
}

export function formatPaymentTerms(days: number, type: PaymentTermType): string {
  return `${Math.max(0, days)} ${type}`;
}
