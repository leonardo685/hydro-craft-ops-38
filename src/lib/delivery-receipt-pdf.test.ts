import { describe, it, expect, vi } from 'vitest';
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
import { solicitanteFromObservacoes, deliveryReceiptFilename } from './delivery-receipt-pdf';
describe('delivery receipt', () => {
  it('reads the requester from quote notes', () => {
    expect(solicitanteFromObservacoes('Tipo: X | Solicitante: John Doe | Documento: Y')).toBe('John Doe');
    expect(solicitanteFromObservacoes('Tipo: X | Solicitante:  | Documento: Y')).toBeNull();
  });
  it('names the file by order number', () => {
    expect(deliveryReceiptFilename({ numeroOrdem: 'MH-012-26' })).toBe('Delivery-Receipt-MH-012-26.pdf');
  });
});
