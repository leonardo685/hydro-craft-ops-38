import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
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
  it('uses a completion status accepted by the service order constraint for US delivery', () => {
    const migration = readFileSync('supabase/migrations/20250920193306_0794110a-25fb-4023-ab82-630597879dac.sql', 'utf8');
    const allowedStatuses = [...migration.matchAll(/'([^']+)'/g)].map(match => match[1]);
    const deliveryStatus = completionStatus('MEC HYDRO', null, 'quote-id');
    expect(deliveryStatus).toBe('finalizada');
    expect(allowedStatuses).toContain(deliveryStatus);
    expect(allowedStatuses).not.toContain('finalizado');
  });
  it('still requires return invoices for Brazilian equipment', () => {
    expect(completionStatus('MEC HIDRO', 16, 'quote-id')).toBe('aguardando_retorno');
  });
  it('preserves Brazilian quote-only completion', () => {
    expect(completionStatus('MEC HIDRO', null, 'quote-id')).toBe('finalizada');
  });
});