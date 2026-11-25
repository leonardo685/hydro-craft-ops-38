import { describe, expect, it, vi } from 'vitest';
import { deleteQuote } from './delete-quote';

describe('quote deletion', () => {
  const baseQuote = { id: 'quote-1', empresa_id: 'us-company' };

  it.each(['pendente', 'aprovado', 'faturamento', 'finalizado'])(
    'deletes a %s quote through the transaction that blocks financial dependencies',
    async (status) => {
      const rpc = vi.fn().mockResolvedValue({ data: baseQuote.id, error: null });
      await expect(deleteQuote({ rpc } as never, { ...baseQuote, status }, 'us-company')).resolves.toBe(baseQuote.id);
      expect(rpc).toHaveBeenCalledWith('excluir_orcamento_sem_financeiro', {
        p_orcamento_id: baseQuote.id,
        p_empresa_id: 'us-company',
      });
    },
  );

  it('keeps rejected quotes on the existing rejected-quote transaction', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: baseQuote.id, error: null });
    await deleteQuote({ rpc } as never, { ...baseQuote, status: 'rejeitado' }, 'us-company');
    expect(rpc).toHaveBeenCalledWith('excluir_orcamento_rejeitado', {
      p_orcamento_id: baseQuote.id,
      p_empresa_id: 'us-company',
    });
  });

  it('refuses to delete a quote belonging to another company', async () => {
    const rpc = vi.fn();
    await expect(deleteQuote({ rpc } as never, { ...baseQuote, status: 'pendente' }, 'br-company')).rejects.toThrow('permission');
    expect(rpc).not.toHaveBeenCalled();
  });

  it('shows the financial dependency failure instead of reporting success', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: new Error('This quote has linked financial records and cannot be deleted.'),
    });
    await expect(deleteQuote({ rpc } as never, { ...baseQuote, status: 'aprovado' }, 'us-company')).rejects.toThrow('financial records');
  });

  it('requires the transaction to confirm the deleted quote ID', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
    await expect(deleteQuote({ rpc } as never, { ...baseQuote, status: 'finalizado' }, 'us-company')).rejects.toThrow('confirmed');
  });
});
