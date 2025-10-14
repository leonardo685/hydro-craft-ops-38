import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface LancamentoFinanceiro {
  id: string;
  tipo: 'entrada' | 'saida';
  descricao: string;
  categoriaId?: string;
  valor: number;
  contaBancaria: string;
  fornecedorCliente?: string;
  dataEsperada: Date;
  dataRealizada?: Date | null;
  pago: boolean;
  createdAt: Date;
}

export const useLancamentosFinanceiros = () => {
  const [lancamentos, setLancamentos] = useState<LancamentoFinanceiro[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLancamentos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('lancamentos_financeiros')
        .select('*')
        .order('data_esperada', { ascending: false });

      if (error) throw error;

      const lancamentosFormatados = (data || []).map(lanc => ({
        id: lanc.id,
        tipo: lanc.tipo as 'entrada' | 'saida',
        descricao: lanc.descricao,
        categoriaId: lanc.categoria_id,
        valor: Number(lanc.valor),
        contaBancaria: lanc.conta_bancaria,
        fornecedorCliente: lanc.fornecedor_cliente,
        dataEsperada: new Date(lanc.data_esperada),
        dataRealizada: lanc.data_realizada ? new Date(lanc.data_realizada) : null,
        pago: lanc.pago,
        createdAt: new Date(lanc.created_at)
      }));

      setLancamentos(lancamentosFormatados);
    } catch (error) {
      console.error('Erro ao buscar lançamentos:', error);
      toast.error('Erro ao carregar lançamentos financeiros');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLancamentos();
  }, []);

  const adicionarLancamento = async (
    lancamento: Omit<LancamentoFinanceiro, 'id' | 'createdAt'>
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('lancamentos_financeiros')
        .insert({
          tipo: lancamento.tipo,
          descricao: lancamento.descricao,
          categoria_id: lancamento.categoriaId || null,
          valor: lancamento.valor,
          conta_bancaria: lancamento.contaBancaria,
          fornecedor_cliente: lancamento.fornecedorCliente || null,
          data_esperada: lancamento.dataEsperada.toISOString(),
          data_realizada: lancamento.dataRealizada?.toISOString() || null,
          pago: lancamento.pago
        });

      if (error) throw error;

      await fetchLancamentos();
      toast.success('Lançamento adicionado com sucesso!');
      return true;
    } catch (error) {
      console.error('Erro ao adicionar lançamento:', error);
      toast.error('Erro ao criar lançamento');
      return false;
    }
  };

  const atualizarLancamento = async (
    id: string,
    lancamento: Partial<Omit<LancamentoFinanceiro, 'id' | 'createdAt'>>
  ): Promise<boolean> => {
    try {
      const updateData: any = {};
      
      if (lancamento.tipo) updateData.tipo = lancamento.tipo;
      if (lancamento.descricao) updateData.descricao = lancamento.descricao;
      if (lancamento.categoriaId !== undefined) updateData.categoria_id = lancamento.categoriaId;
      if (lancamento.valor !== undefined) updateData.valor = lancamento.valor;
      if (lancamento.contaBancaria) updateData.conta_bancaria = lancamento.contaBancaria;
      if (lancamento.fornecedorCliente !== undefined) updateData.fornecedor_cliente = lancamento.fornecedorCliente;
      if (lancamento.dataEsperada) updateData.data_esperada = lancamento.dataEsperada.toISOString();
      if (lancamento.dataRealizada !== undefined) {
        updateData.data_realizada = lancamento.dataRealizada ? lancamento.dataRealizada.toISOString() : null;
      }
      if (lancamento.pago !== undefined) updateData.pago = lancamento.pago;

      const { error } = await supabase
        .from('lancamentos_financeiros')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      await fetchLancamentos();
      toast.success('Lançamento atualizado com sucesso!');
      return true;
    } catch (error) {
      console.error('Erro ao atualizar lançamento:', error);
      toast.error('Erro ao atualizar lançamento');
      return false;
    }
  };

  const deletarLancamento = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('lancamentos_financeiros')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setLancamentos(prev => prev.filter(lanc => lanc.id !== id));
      toast.success('Lançamento deletado com sucesso!');
      return true;
    } catch (error) {
      console.error('Erro ao deletar lançamento:', error);
      toast.error('Erro ao deletar lançamento');
      return false;
    }
  };

  return {
    lancamentos,
    loading,
    adicionarLancamento,
    atualizarLancamento,
    deletarLancamento,
    refetch: fetchLancamentos
  };
};
