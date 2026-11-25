import { emailUsesShippingOrder, shippingOrderValue, subjectDetails, type SubjectQuote } from './shipping-order.ts';

export function quoteShippingOrderPrefix(
  companyName: string,
  values: Array<string | null | undefined>,
): string {
  if (!emailUsesShippingOrder(companyName)) return '';
  const shippingOrders = [...new Set(values
    .map(shippingOrderValue)
    .filter(Boolean))];
  return shippingOrders.length ? `Shipping Order ${shippingOrders.join(', ')} - ` : '';
}

/** Quotes put Shipping Order before the title; invoices put it after, never both. */
export function commercialEmailSubject(tipo: 'quote' | 'invoice', numero: string, ids: string[], quotes: SubjectQuote[], companyName: string): string {
  const byId = new Map(quotes.map(quote => [quote.id, quote]));
  const prefix = tipo === 'quote' ? quoteShippingOrderPrefix(companyName, ids.map(id => byId.get(id)?.numero_nota_entrada)) : '';
  const details = subjectDetails(ids, quotes, companyName, tipo !== 'quote');
  return `${prefix}${tipo === 'quote' ? 'Quote' : 'Invoice'} ${numero}${details ? ` - ${details}` : ''} - ${companyName}`;
}
