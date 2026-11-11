import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { AprovarOrcamentoModal } from './AprovarOrcamentoModal';

vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/contexts/EmpresaContext', () => ({ useEmpresa: () => ({ empresaAtual: { id: 'us', nome: 'MEC HYDRO' } }) }));
vi.mock('@/lib/webhook-utils', () => ({ enviarWebhook: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  from: () => {
    const q: any = { select: () => q, eq: () => q, neq: () => q, order: () => Promise.resolve({ data: [] }) };
    return q;
  },
} }));
afterEach(cleanup);
const quote = { id: 'quote', numero: '0045/26', valor: 1000, desconto_percentual: 10, cliente_nome: 'Client' };

describe('approval price comparison', () => {
  it('shows 1000 original, 10 percent discount and 900 final, including after editing discount', () => {
    render(<AprovarOrcamentoModal open orcamento={quote} onOpenChange={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.getByLabelText('Valor do Orçamento ($)')).toHaveValue(1000);
    expect(screen.getByLabelText('Desconto (%)')).toHaveValue(10);
    expect(screen.getByLabelText('Valor Final ($)')).toHaveValue(900);
    fireEvent.change(screen.getByLabelText('Desconto (%)'), { target: { value: '20' } });
    expect(screen.getByLabelText('Valor do Orçamento ($)')).toHaveValue(1000);
    expect(screen.getByLabelText('Valor Final ($)')).toHaveValue(800);
  });
  it('keeps urgency in both displayed totals without applying discount twice', () => {
    render(<AprovarOrcamentoModal open orcamento={{ ...quote, urgency_fee_enabled: true, urgency_fee_percentual: 30 }} onOpenChange={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.getByLabelText('Valor do Orçamento ($)')).toHaveValue(1300);
    expect(screen.getByLabelText('Valor Final ($)')).toHaveValue(1170);
  });
});