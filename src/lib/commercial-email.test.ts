import { describe, expect, it } from "vitest";
import { commercialEmailType, commercialEmailSentAt, samePOEmailQuotes } from "./commercial-email";

describe("Commercial email document rules", () => {
  it('shows a Quote sent date only in the Quote stage', () => {
    expect(commercialEmailSentAt({ status: 'pendente', email_quote_enviado_em: '2026-11-13T18:50:00Z' })).toBe('2026-11-13T18:50:00Z');
  });
  it('does not show an old Quote send as an Invoice send after approval', () => {
    expect(commercialEmailSentAt({ status: 'aprovado', email_quote_enviado_em: '2026-11-13T18:50:00Z' })).toBeNull();
  });
  it('uses the Invoice sent date in Approved and Finalized', () => {
    for (const status of ['aprovado', 'finalizado']) {
      expect(commercialEmailSentAt({ status, email_invoice_enviado_em: '2026-11-13T19:00:00Z' })).toBe('2026-11-13T19:00:00Z');
    }
  });
  it('leaves unsent and rejected quotes unmarked', () => {
    expect(commercialEmailSentAt({ status: 'pendente' })).toBeNull();
    expect(commercialEmailSentAt({ status: 'rejeitado', email_quote_enviado_em: '2026-11-13T18:50:00Z' })).toBeNull();
  });
  it("Awaiting Approval sends Quote", () => {
    expect(commercialEmailType("pendente")).toBe("quote");
  });
  it("Approved sends Invoice, including the billing status in that tab", () => {
    expect(commercialEmailType("aprovado")).toBe("invoice");
    expect(commercialEmailType("faturamento")).toBe("invoice");
  });
  it("Finalized sends Invoice", () => {
    expect(commercialEmailType("finalizado")).toBe("invoice");
  });
  it("Reproved does not allow email", () => {
    expect(commercialEmailType("rejeitado")).toBeNull();
  });
});

describe('Same P.O. email selection', () => {
  const current = { id: 'a', empresa_id: 'us', status: 'aprovado', numero_pedido: 'P.O. 123' };
  const quotes = [
    { ...current, id: 'b', status: 'finalizado', numero_pedido: '123' },
    { ...current, id: 'c', empresa_id: 'br' },
    { ...current, id: 'd', status: 'pendente' },
    { ...current, id: 'e', status: 'rejeitado' },
    { ...current, id: 'f', numero_pedido: '124' },
  ];
  it('offers Approved and Finalized together for the same P.O.', () => {
    expect(samePOEmailQuotes(current, quotes, 'us').map(q => q.id)).toEqual(['b']);
    expect(samePOEmailQuotes({ ...current, status: 'finalizado' }, [{ ...current, id: 'g' }], 'us').map(q => q.id)).toEqual(['g']);
  });
  it('does not group absent or placeholder P.O.s', () => {
    expect(samePOEmailQuotes({ ...current, numero_pedido: 'none' }, quotes, 'us')).toEqual([]);
    expect(samePOEmailQuotes({ ...current, numero_pedido: '' }, quotes, 'us')).toEqual([]);
  });
  it('rejects a current quote from another company', () => {
    expect(samePOEmailQuotes(current, quotes, 'br')).toEqual([]);
  });
  it('does not offer grouped sending from Awaiting Approval', () => {
    expect(samePOEmailQuotes({ ...current, status: 'pendente' }, quotes, 'us')).toEqual([]);
  });
});