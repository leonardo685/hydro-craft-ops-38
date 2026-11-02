import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { EnviarDocumentoEmailModal } from './EnviarDocumentoEmailModal';

const mocks = vi.hoisted(() => ({ generate: vi.fn(), invoke: vi.fn(), toast: vi.fn() }));
const current = { id: 'a', empresa_id: 'us', status: 'aprovado', numero: '0037/26', numero_pedido: '123', cliente_nome: 'Client', assunto_proposta: 'Repair' };
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/hooks/use-clientes', () => ({ useClientes: () => ({ clientes: [], adicionarEmail: vi.fn() }) }));
vi.mock('@/contexts/EmpresaContext', () => ({ useEmpresa: () => ({ empresaAtual: company }) }));
const company = { id: 'us', nome: 'MEC HYDRO' };
vi.mock('@/lib/orcamento-modern-pdf', () => ({ gerarArquivoOrcamentoPorId: mocks.generate }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  functions: { invoke: mocks.invoke },
  from: () => {
    const q: any = { select: () => q, eq: () => q, in: () => q, order: () => q,
      range: async () => ({ data: [{ ...current, id: 'b', numero: '0038/26', status: 'finalizado', assunto_proposta: 'Mount' }] }) };
    return q;
  },
} }));

describe('Email invoice selection', () => {
  beforeEach(() => {
    cleanup(); vi.clearAllMocks();
    mocks.generate.mockResolvedValue({ bytes: new ArrayBuffer(1), nome: 'selected.pdf' });
    mocks.invoke.mockResolvedValue({ data: { success: true }, error: null });
  });
  it('sends only the open invoice by default', async () => {
    render(<EnviarDocumentoEmailModal open onOpenChange={vi.fn()} orcamento={current} language="en" />);
    await screen.findByRole('checkbox', { name: 'Incluir Invoice 0038/26' });
    fireEvent.change(screen.getByPlaceholderText('Novo e-mail'), { target: { value: 'client@example.com' } });
    fireEvent.keyDown(screen.getByPlaceholderText('Novo e-mail'), { key: 'Enter' });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar Invoice' }));
    await waitFor(() => expect(mocks.invoke).toHaveBeenCalledOnce());
    expect(mocks.generate).toHaveBeenCalledWith('a', company, 'en', ['a']);
  });
  it('includes a checked Finalized invoice with the Approved invoice in the attachment selection', async () => {
    render(<EnviarDocumentoEmailModal open onOpenChange={vi.fn()} orcamento={current} language="en" />);
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Incluir Invoice 0038/26' }));
    fireEvent.change(screen.getByPlaceholderText('Novo e-mail'), { target: { value: 'client@example.com' } });
    fireEvent.keyDown(screen.getByPlaceholderText('Novo e-mail'), { key: 'Enter' });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar 2 Invoices' }));
    await waitFor(() => expect(mocks.invoke).toHaveBeenCalledOnce());
    expect(mocks.generate).toHaveBeenCalledWith('a', company, 'en', ['a', 'b']);
    expect(mocks.invoke.mock.calls[0][1].body.pdfBase64).toBe('AA==');
  });
});