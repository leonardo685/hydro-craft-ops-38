import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useEmpresaId } from '@/hooks/use-empresa-id';

export interface PagamentoStripe {
  id: string;
  orcamento_id: string;
  stripe_session_id: string;
  checkout_url: string | null;
  valor: number;
  moeda: string;
  status: 'pendente' | 'pago' | 'falhou' | 'reembolsado';
  metodo: string | null;
  cliente_email: string | null;
  paid_at: string | null;
  created_at: string;
}

export function usePagamentosStripe(orcamentoId?: string) {
  const { empresaId } = useEmpresaId();
  const [pagamentos, setPagamentos] = useState<PagamentoStripe[]>([]);
  const [loading, setLoading] = useState(false);
  const [gerando, setGerando] = useState(false);

  const fetchPagamentos = useCallback(async () => {
    if (!orcamentoId || !empresaId) {
      setPagamentos([]);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('pagamentos_stripe')
        .select('*')
        .eq('orcamento_id', orcamentoId)
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPagamentos((data || []) as PagamentoStripe[]);
    } catch (error) {
      console.error('Erro ao carregar pagamentos:', error);
    } finally {
      setLoading(false);
    }
  }, [orcamentoId, empresaId]);

  useEffect(() => {
    fetchPagamentos();
  }, [fetchPagamentos]);

  const gerarLinkPagamento = async (clienteEmail?: string): Promise<string | null> => {
    if (!orcamentoId) return null;
    setGerando(true);
    try {
      const { data, error } = await supabase.functions.invoke('criar-checkout-stripe', {
        body: {
          orcamento_id: orcamentoId,
          origin: window.location.origin,
          cliente_email: clienteEmail || undefined,
        },
      });

      if (error) throw error;
      if (!data?.url) throw new Error(data?.error || 'Não foi possível gerar o link');

      await fetchPagamentos();
      toast.success('Link de pagamento gerado');
      return data.url as string;
    } catch (error: any) {
      console.error('Erro ao gerar link de pagamento:', error);
      toast.error(error?.message || 'Erro ao gerar link de pagamento');
      return null;
    } finally {
      setGerando(false);
    }
  };

  return { pagamentos, loading, gerando, gerarLinkPagamento, refetch: fetchPagamentos };
}
