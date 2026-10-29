import { describe, it, expect } from 'vitest';
import { expectedPaymentDate, quoteServiceCategoryId } from './delivery-billing';

describe('delivery billing', () => {
  it('30 NET = 30 calendar days after delivery', () => expect(expectedPaymentDate('2026-10-29', '30 NET')).toBe('2026-11-28'));
  it('5 BUSINESS DAYS skips weekends', () => expect(expectedPaymentDate('2026-10-29', '5 BUSINESS DAYS')).toBe('2026-11-05'));
  it('no condition = delivery date', () => expect(expectedPaymentDate('2026-10-29', '')).toBe('2026-10-29'));
  it('reads Service Type category', () => {
    expect(quoteServiceCategoryId('Tipo: 3f2b1c4d-1111-4222-8333-444455556666 | Solicitante: x')).toBe('3f2b1c4d-1111-4222-8333-444455556666');
    expect(quoteServiceCategoryId('Tipo: reforma | x')).toBeNull();
  });
});
