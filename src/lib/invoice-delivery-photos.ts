import { hasFiscalBilling } from './company-features';

export interface DeliveryOrder {
  id: string;
  empresa_id: string | null;
  orcamento_id: string | null;
  numero_ordem: string;
  status: string;
  documento_entrega_url: string | null;
}

export function invoiceDeliveryPhotos(
  orders: DeliveryOrder[],
  quote: { id?: string; orcamento_id?: string; ordem_servico_id?: string; ordem_referencia?: string },
  company: { id: string; nome: string },
) {
  if (hasFiscalBilling(company.nome)) return [];
  const quoteId = quote.orcamento_id || quote.id;
  if (!quoteId) return [];
  const scoped = orders.filter(order => order.empresa_id === company.id);
  let linked = scoped.filter(order => order.orcamento_id === quoteId ||
    (order.id === quote.ordem_servico_id && !order.orcamento_id));
  if (!linked.length && quote.ordem_referencia) {
    const references = scoped.filter(order => order.numero_ordem === quote.ordem_referencia && !order.orcamento_id);
    if (references.length === 1) linked = references;
  }
  const seen = new Set<string>();
  return linked.filter(order => order.status === 'finalizada' && order.documento_entrega_url)
    .flatMap(order => {
      const url = order.documento_entrega_url;
      if (!url || seen.has(url)) return [];
      seen.add(url);
      return [{ arquivo_url: url, legenda: order.numero_ordem }];
    });
}