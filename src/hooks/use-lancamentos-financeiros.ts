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
  dataEmissao: Date;
  pago: boolean;
  createdAt: Date;
  formaPagamento: 'a_vista' | 'parcelado' | 'recorrente';
  numeroParcelas?: number;
  parcelaNumero?: number;
  frequenciaRepeticao?: 'semanal' | 'quinzenal' | 'mensal' | 'anual';
  lancamentoPaiId?: string;
  mesesRecorrencia?: number;
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
        dataEmissao: new Date(lanc.data_emissao),
        pago: lanc.pago,
        createdAt: new Date(lanc.created_at),
        formaPagamento: (lanc.forma_pagamento || 'a_vista') as 'a_vista' | 'parcelado' | 'recorrente',
        numeroParcelas: lanc.numero_parcelas,
        parcelaNumero: lanc.parcela_numero,
        frequenciaRepeticao: lanc.frequencia_repeticao as 'semanal' | 'quinzenal' | 'mensal' | 'anual' | undefined,
        lancamentoPaiId: lanc.lancamento_pai_id,
        mesesRecorrencia: lanc.meses_recorrencia,
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
  ): Promise<{ success: boolean; id?: string }> => {
    try {
      const { data: insertData, error } = await supabase
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
          data_emissao: lancamento.dataEmissao.toISOString(),
          pago: lancamento.pago,
          forma_pagamento: lancamento.formaPagamento,
          numero_parcelas: lancamento.numeroParcelas || null,
          parcela_numero: lancamento.parcelaNumero || null,
          frequencia_repeticao: lancamento.frequenciaRepeticao || null,
          lancamento_pai_id: lancamento.lancamentoPaiId || null,
          meses_recorrencia: lancamento.mesesRecorrencia || null,
        })
        .select()
        .single();

      if (error) throw error;

      await fetchLancamentos();
      toast.success('Lançamento adicionado com sucesso!');
      return insertData ? { success: true, id: insertData.id } : { success: true };
    } catch (error) {
      console.error('Erro ao adicionar lançamento:', error);
      toast.error('Erro ao criar lançamento');
      return { success: false };
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
      if (lancamento.dataEmissao) updateData.data_emissao = lancamento.dataEmissao.toISOString();
      if (lancamento.pago !== undefined) updateData.pago = lancamento.pago;
      if (lancamento.formaPagamento) updateData.forma_pagamento = lancamento.formaPagamento;
      if (lancamento.numeroParcelas !== undefined) updateData.numero_parcelas = lancamento.numeroParcelas;
      if (lancamento.parcelaNumero !== undefined) updateData.parcela_numero = lancamento.parcelaNumero;
      if (lancamento.frequenciaRepeticao !== undefined) updateData.frequencia_repeticao = lancamento.frequenciaRepeticao;
      if (lancamento.lancamentoPaiId !== undefined) updateData.lancamento_pai_id = lancamento.lancamentoPaiId;
      if (lancamento.mesesRecorrencia !== undefined) updateData.meses_recorrencia = lancamento.mesesRecorrencia;

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
