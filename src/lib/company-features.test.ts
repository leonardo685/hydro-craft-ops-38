import { describe, expect, it } from 'vitest';
import { completionStatus, hasFiscalBilling } from './company-features';

describe('company fiscal workflow isolation', () => {
  it('disables fiscal billing for MEC HYDRO US', () => {
    expect(hasFiscalBilling('MEC HYDRO')).toBe(false);
  });
  it('preserves fiscal billing for MEC HIDRO Brazil regardless of language', () => {
    expect(hasFiscalBilling('MEC HIDRO')).toBe(true);
  });
  it('finishes US equipment without a return invoice', () => {
    expect(completionStatus('MEC HYDRO', 16, 'quote-id')).toBe('finalizada');
  });
  it('still requires return invoices for Brazilian equipment', () => {
    expect(completionStatus('MEC HIDRO', 16, 'quote-id')).toBe('aguardando_retorno');
  });
  it('preserves Brazilian quote-only completion', () => {
    expect(completionStatus('MEC HIDRO', null, 'quote-id')).toBe('finalizada');
  });
});