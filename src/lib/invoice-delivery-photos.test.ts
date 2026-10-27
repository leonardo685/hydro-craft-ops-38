import { describe, expect, it } from 'vitest';
import { invoiceDeliveryPhotos, type DeliveryOrder } from './invoice-delivery-photos';

const company = { id: 'us', nome: 'MEC HYDRO' };
const quote = { id: 'quote-26', ordem_servico_id: 'order-26' };
const order: DeliveryOrder = { id: 'order-26', empresa_id: 'us', orcamento_id: 'quote-26', numero_ordem: 'MH-026-26', status: 'finalizada', documento_entrega_url: 'https://example.com/delivery.jpg' };

describe('invoice delivery photos', () => {
  it('includes the finalized order delivery in its own invoice', () => {
    expect(invoiceDeliveryPhotos([order], quote, company)).toEqual([{ arquivo_url: order.documento_entrega_url, legenda: 'MH-026-26' }]);
  });
  it('excludes other companies', () => {
    expect(invoiceDeliveryPhotos([{ ...order, empresa_id: 'br' }], quote, company)).toEqual([]);
  });
  it('excludes photos assigned to another quote even when direct order matches', () => {
    expect(invoiceDeliveryPhotos([{ ...order, orcamento_id: 'other' }], quote, company)).toEqual([]);
  });
  it('excludes orders not finalized', () => {
    expect(invoiceDeliveryPhotos([{ ...order, status: 'aprovada' }], quote, company)).toEqual([]);
  });
  it('preserves Brazil invoices', () => {
    expect(invoiceDeliveryPhotos([order], quote, { ...company, nome: 'MEC HIDRO' })).toEqual([]);
  });
  it('includes every delivered order of a multi-order invoice without duplicate images', () => {
    expect(invoiceDeliveryPhotos([order, { ...order, id: 'second' }], quote, company)).toHaveLength(1);
  });
});