import { describe, it, expect } from 'vitest';
import { formatPaymentTerms, parsePaymentTerms, usesStructuredPaymentTerms } from './company-features';

describe('MEC HYDRO payment terms', () => {
  it('composes "30 NET"', () => expect(formatPaymentTerms(30, 'NET')).toBe('30 NET'));
  it('composes "45 BUSINESS DAYS"', () => expect(formatPaymentTerms(45, 'BUSINESS DAYS')).toBe('45 BUSINESS DAYS'));
  it('never goes below 0 days', () => expect(formatPaymentTerms(-1, 'NET')).toBe('0 NET'));
  it('reads back saved values', () => {
    expect(parsePaymentTerms('30 BUSINESS DAYS')).toEqual({ days: 30, type: 'BUSINESS DAYS' });
    expect(parsePaymentTerms('15 NET')).toEqual({ days: 15, type: 'NET' });
  });
  it('only applies to MEC HYDRO', () => {
    expect(usesStructuredPaymentTerms('MEC HYDRO LLC')).toBe(true);
    expect(usesStructuredPaymentTerms('MEC HIDRO BRASIL')).toBe(false);
  });
});
