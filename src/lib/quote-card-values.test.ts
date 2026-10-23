import { describe, expect, it } from 'vitest';
import { quoteCardValues } from './quote-card-values';

describe('US quote card Sales Tax', () => {
  it('calculates sales tax rather than using a manually entered technicians value', () => {
    expect(quoteCardValues({ valor: 1000 }, 'MEC HYDRO').salesTax).toBe(85);
  });
  it.each([[20, 1200, 102], [30, 1300, 110.5]])('includes %s percent urgency in the value and tax base', (percent, value, tax) => {
    expect(quoteCardValues({ valor: 1000, urgency_fee_enabled: true, urgency_fee_percentual: percent }, 'MEC HYDRO'))
      .toEqual({ value, urgencyFee: value - 1000, salesTax: tax });
  });
  it('returns zero sales tax when the quote has tax disabled', () => {
    expect(quoteCardValues({ valor: 1000, tax_exempt: true }, 'MEC HYDRO').salesTax).toBe(0);
  });
  it.each([[20, 1528.8], [30, 1656.2]])('shows the approval amount with %s percent urgency without changing the persisted base', (percent, total) => {
    const quote = { valor: 1274, urgency_fee_enabled: true, urgency_fee_percentual: percent };
    expect(quoteCardValues(quote, 'MEC HYDRO').value).toBeCloseTo(total, 2);
    expect(quote.valor).toBe(1274);
  });
  it('applies the approval discount to the base and urgency exactly once when reopened', () => {
    const persisted = { valor: 1000 * (1 - 10 / 100), urgency_fee_enabled: true, urgency_fee_percentual: 30 };
    expect(quoteCardValues(persisted, 'MEC HYDRO').value).toBe(1170);
  });
  it('sums sales tax from existing quotes including zero-tax quotes', () => {
    const quotes = [{ valor: 1000 }, { valor: 2000 }, { valor: 500, tax_exempt: true }];
    expect(quotes.reduce((sum, quote) => sum + quoteCardValues(quote, 'MEC HYDRO').salesTax, 0)).toBe(255);
  });
  it('does not apply US fees or sales tax to Brazil', () => {
    expect(quoteCardValues({ valor: 1000, urgency_fee_enabled: true, urgency_fee_percentual: 30 }, 'MEC HIDRO'))
      .toEqual({ value: 1000, urgencyFee: 0, salesTax: 0 });
  });
});