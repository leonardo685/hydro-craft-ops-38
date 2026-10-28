import { describe, expect, it, vi } from 'vitest';
import { deleteRejectedQuote, withoutDeletedQuote } from './delete-rejected-quote';

describe('rejected quote deletion', () => {
  const quote = { id: 'quote-1', empresa_id: 'us-company', status: 'rejeitado', valor: 1000 };
  it('deletes the rejected quote scoped to its company', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: quote.id, error: null });
    await expect(deleteRejectedQuote({ rpc } as never, quote, 'us-company')).resolves.toBe('quote-1');
    expect(rpc).toHaveBeenCalledWith('excluir_orcamento_rejeitado', { p_orcamento_id: 'quote-1', p_empresa_id: 'us-company' });
  });
  it('removes the deleted quote from rejected count and value', () => {
    const remaining = withoutDeletedQuote([quote, { ...quote, id: 'quote-2', valor: 500 }], quote.id, 'us-company');
    expect(remaining.filter(q => q.status === 'rejeitado')).toHaveLength(1);
    expect(remaining.reduce((sum, q) => sum + q.valor, 0)).toBe(500);
  });
  it('does not remove another company quote from local state', () => {
    const brazil = { ...quote, empresa_id: 'br-company' };
    expect(withoutDeletedQuote([quote, brazil], quote.id, 'us-company')).toEqual([brazil]);
  });
  it('rejects another company before making a request', async () => {
    const rpc = vi.fn();
    await expect(deleteRejectedQuote({ rpc } as never, quote, 'br-company')).rejects.toThrow();
    expect(rpc).not.toHaveBeenCalled();
  });
  it('rejects non-rejected quotes before making a request', async () => {
    const rpc = vi.fn();
    await expect(deleteRejectedQuote({ rpc } as never, { ...quote, status: 'aprovado' }, 'us-company')).rejects.toThrow();
    expect(rpc).not.toHaveBeenCalled();
  });
  it('does not report success when deletion fails', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: new Error('Financial records linked') });
    await expect(deleteRejectedQuote({ rpc } as never, quote, 'us-company')).rejects.toThrow('Financial records linked');
  });
  it('requires confirmation of the deleted ID', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
    await expect(deleteRejectedQuote({ rpc } as never, quote, 'us-company')).rejects.toThrow('confirmar');
  });
});