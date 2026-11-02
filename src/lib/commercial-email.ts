import { normalizarNumeroPedido } from './pedido-utils';

/** Commercial tab eligibility and email document type. */
export function commercialEmailType(status: string | null | undefined): "quote" | "invoice" | null {
  if (status === "rejeitado") return null;
  return ["aprovado", "faturamento", "finalizado"].includes(status || "") ? "invoice" : "quote";
}

export interface EmailQuote {
  id: string;
  empresa_id?: string | null;
  status?: string | null;
  numero?: string;
  numero_pedido?: string | null;
  descricao?: string | null;
  assunto_proposta?: string | null;
  equipamento?: string | null;
}

export function emailQuotePO(quote: EmailQuote): string {
  return normalizarNumeroPedido(quote.numero_pedido) || normalizarNumeroPedido(
    quote.descricao?.match(/- Número do Pedido:\s*(.+?)(?:\n|$)/)?.[1]
  );
}

export function samePOEmailQuotes(current: EmailQuote, quotes: EmailQuote[], empresaId: string): EmailQuote[] {
  const po = emailQuotePO(current).toLowerCase();
  if (!po || current.empresa_id !== empresaId || commercialEmailType(current.status) !== 'invoice') return [];
  return quotes.filter(quote => quote.id !== current.id && quote.empresa_id === empresaId &&
    commercialEmailType(quote.status) === 'invoice' && emailQuotePO(quote).toLowerCase() === po)
    .sort((a, b) => (b.numero || '').localeCompare(a.numero || '', undefined, { numeric: true }));
}

export function emailQuoteLines(quotes: EmailQuote[]): string[] {
  const valid = (v?: string | null) => /não especificado|nao especificado/i.test(v || '') ? '' : v?.trim() || '';
  return quotes.map(quote => {
    const subject = valid(quote.assunto_proposta) || valid(quote.equipamento);
    return `**${quote.numero || ''}**${subject ? ` regarding ${subject}` : ''}.`;
  });
}