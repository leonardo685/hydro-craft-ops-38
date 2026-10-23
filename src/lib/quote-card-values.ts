import { hasFiscalBilling } from './company-features';

interface QuoteCardInput {
  valor?: number | string | null;
  urgency_fee_enabled?: boolean | null;
  urgency_fee_percentual?: number | string | null;
  tax_exempt?: boolean | null;
}

/** Visual quote totals; persisted valor already includes any applied discount. */
export function quoteCardValues(quote: QuoteCardInput, companyName: string | null | undefined) {
  const isUS = !hasFiscalBilling(companyName);
  const base = Number(quote.valor) || 0;
  const urgencyFee = isUS && quote.urgency_fee_enabled
    ? base * (Number(quote.urgency_fee_percentual) || 0) / 100
    : 0;
  const value = base + urgencyFee;
  const salesTax = isUS && !quote.tax_exempt ? value * 8.5 / 100 : 0;
  return { value, urgencyFee, salesTax };
}