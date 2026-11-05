import { hasFiscalBilling } from './company-features';

// Single source of truth for the amounts shown on US quote cards and in the
// approval dialog. `valor` is the gross/original amount and `desconto_percentual`
// is the effective discount applied to it, so the displayed value is never
// discounted twice and never shown without its discount.
interface QuoteCardInput {
  valor?: number | string | null;
  desconto_percentual?: number | string | null;
  urgency_fee_enabled?: boolean | null;
  urgency_fee_percentual?: number | string | null;
  tax_exempt?: boolean | null;
}

export function quoteCardValues(quote: QuoteCardInput, companyName: string | null | undefined) {
  const isUS = !hasFiscalBilling(companyName);
  const valorBruto = Number(quote.valor) || 0;
  const descontoPct = Math.min(100, Math.max(0, Number(quote.desconto_percentual) || 0));
  const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
  const base = round2(valorBruto * (1 - descontoPct / 100));
  const urgencyFee = isUS && quote.urgency_fee_enabled ? round2(base * ((Number(quote.urgency_fee_percentual) || 0) / 100)) : 0;
  const salesTax = isUS && !quote.tax_exempt ? round2((base + urgencyFee) * 0.085) : 0;
  return { value: round2(base + urgencyFee), urgencyFee, salesTax };
}
