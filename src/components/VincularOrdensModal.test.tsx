import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { VincularOrdensModal } from './VincularOrdensModal';

const mocks = vi.hoisted(() => ({ from: vi.fn(), update: vi.fn(), eq: vi.fn(), webhook: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: mocks.from } }));
vi.mock('@/contexts/EmpresaContext', () => ({ useEmpresa: () => ({ empresaAtual: { id: 'company-us', nome: 'MEC HYDRO' } }) }));
vi.mock('@/lib/webhook-utils', () => ({ enviarWebhook: mocks.webhook }));

describe('Linking a finalized quote', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    let reads = 0;
    const query: any = {
      select: vi.fn().mockReturnThis(),
      eq: mocks.eq.mockImplementation(() => query),
      update: mocks.update.mockImplementation(() => query),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockImplementation(() => Promise.resolve({ data: reads++ === 0 ? [] : [{ id: 'order-1', numero_ordem: 'MH-001-26', status: 'finalizada' }] })),
      then: (resolve: (value: unknown) => unknown) => Promise.resolve({ error: null }).then(resolve),
    };
    mocks.from.mockReturnValue(query);
  });

  it('persists the selected order for the active company without reopening the order or sending approval', async () => {
    const onSuccess = vi.fn();
    render(<VincularOrdensModal open onOpenChange={vi.fn()} onSuccess={onSuccess}
      orcamento={{ id: 'quote-finalized', empresa_id: 'company-us', status: 'finalizado', numero: '0037/26', valor: 250 }} />);
    fireEvent.click(await screen.findByText('MH-001-26'));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar Alterações' }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());
    expect(mocks.update).toHaveBeenCalledWith({ orcamento_id: 'quote-finalized', valor_estimado: 250 });
    expect(mocks.eq).toHaveBeenCalledWith('empresa_id', 'company-us');
    expect(mocks.webhook).not.toHaveBeenCalled();
  });
});