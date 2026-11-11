import { describe, expect, it } from 'vitest';
import { invoiceDeliveryPhotos, invoiceDeliveryOrders, type DeliveryOrder } from './invoice-delivery-photos';

const company = { id: 'us', nome: 'MEC HYDRO' };
const quote = { id: 'quote-26', ordem_servico_id: 'order-26' };
const order: DeliveryOrder = { id: 'order-26', empresa_id: 'us', orcamento_id: 'quote-26', numero_ordem: 'MH-026-26', status: 'finalizada', documento_entrega_url: 'https://example.com/delivery.jpg' };

describe('invoice delivery photos', () => {
  it('keeps signed delivery records saved before a quote was linked', () => {
    const signed = { ...order, orcamento_id: null, assinatura_entrega_path: 'us/order-26/signature.png', data_assinatura_entrega: '2026-11-11T23:00:00Z' };
    expect(invoiceDeliveryOrders([signed], quote, company)[0]?.assinatura_entrega_path).toBe('us/order-26/signature.png');
    expect(invoiceDeliveryOrders([signed], quote, company)[0]?.data_assinatura_entrega).toBe('2026-11-11T23:00:00Z');
  });
  it('does not include another company signature', () => {
    expect(invoiceDeliveryOrders([{ ...order, empresa_id: 'br', assinatura_entrega_path: 'br/sign.png' }], quote, company)).toEqual([]);
  });
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