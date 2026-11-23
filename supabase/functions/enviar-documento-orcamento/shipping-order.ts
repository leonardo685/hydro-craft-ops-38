export type SubjectQuote = { id: string; numero?: string | null; numero_nota_entrada?: string | null; assunto_proposta?: string | null; equipamento?: string | null };

export function shippingOrderValue(v: unknown): string {
  const s = String(v ?? '').replace(/[\r\n]+/g, ' ').trim();
  return !s || /^(n\/?a|none|-+)$/i.test(s) ? '' : s;
}

const proposal = (q?: SubjectQuote) => {
  const valid = (v?: string | null) => /não especificado|nao especificado/i.test(v || '') ? '' : String(v || '').trim();
  return valid(q?.assunto_proposta) || valid(q?.equipamento);
};

/** Shipping Orders of the selected quotes (unique, in selection order). */
export function shippingOrders(ids: string[], quotes: SubjectQuote[]): string[] {
  const byId = new Map(quotes.map(q => [q.id, q]));
  return [...new Set(ids.map(id => shippingOrderValue(byId.get(id)?.numero_nota_entrada)).filter(Boolean))];
}

/** Subject part after "Quote/Invoice <numero>": Shipping Order(s) and, for a single document, the proposal subject. */
export function subjectDetails(ids: string[], quotes: SubjectQuote[]): string {
  const sos = shippingOrders(ids, quotes);
  const first = quotes.find(q => q.id === ids[0]);
  return [sos.length ? `Shipping Order ${sos.join(', ')}` : '', ids.length === 1 ? proposal(first) : '']
    .filter(Boolean).join(' - ').slice(0, 300);
}
