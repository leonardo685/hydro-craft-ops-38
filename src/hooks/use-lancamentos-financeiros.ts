import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useEmpresaId } from '@/hooks/use-empresa-id';

export interface LancamentoFinanceiro {
  id: string;
  tipo: 'entrada' | 'saida' | 'transferencia';
  descricao: string;
  contaDestino?: string;
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
  const { empresaId } = useEmpresaId();

  const fetchLancamentos = async () => {
    if (!empresaId) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      // Buscar em lotes para evitar limite de 1000 rows do Supabase
      const PAGE_SIZE = 1000;
      let allData: any[] = [];
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('lancamentos_financeiros')
          .select('*')
          .eq('empresa_id', empresaId)
          .order('data_esperada', { ascending: false })
          .range(from, from + PAGE_SIZE - 1);

        if (error) throw error;

        if (data && data.length > 0) {
          allData = [...allData, ...data];
          hasMore = data.length === PAGE_SIZE;
          from += PAGE_SIZE;
        } else {
          hasMore = false;
        }
      }

      const lancamentosFormatados = allData.map(lanc => ({
        id: lanc.id,
        tipo: lanc.tipo as 'entrada' | 'saida' | 'transferencia',
        descricao: lanc.descricao,
        categoriaId: lanc.categoria_id,
        valor: Number(lanc.valor),
        contaBancaria: lanc.conta_bancaria,
        contaDestino: lanc.conta_destino,
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
  }, [empresaId]);

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
          conta_destino: lancamento.contaDestino || null,
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
          empresa_id: empresaId,
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
        // Sincronização automática: se data_realizada está preenchida, pago deve ser true
        updateData.pago = lancamento.dataRealizada ? true : false;
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

  const deletarRecorrenciaCompleta = async (lancamentoId: string): Promise<boolean> => {
    try {
      // Buscar o lançamento para verificar se é pai ou filho
      const lancamento = lancamentos.find(l => l.id === lancamentoId);
      if (!lancamento) {
        toast.error("Lançamento não encontrado");
        return false;
      }

      console.log('🗑️ Deletando série completa:', {
        lancamentoId,
        lancamento,
        lancamentoPaiId: lancamento.lancamentoPaiId,
        descricao: lancamento.descricao
      });

      let idsParaDeletar: string[] = [];

      if (lancamento.lancamentoPaiId) {
        // É um filho - deletar o pai e todos os irmãos
        const idPai = lancamento.lancamentoPaiId;
        idsParaDeletar = [
          idPai,
          ...lancamentos.filter(l => l.lancamentoPaiId === idPai).map(l => l.id)
        ];
      } else {
        // É um pai ou lançamento sem relação pai-filho
        // Verificar se tem filhos
        const filhos = lancamentos.filter(l => l.lancamentoPaiId === lancamento.id);
        
        if (filhos.length > 0) {
          // Tem filhos - deletar ele e os filhos
          idsParaDeletar = [lancamento.id, ...filhos.map(l => l.id)];
        } else {
          // Não tem filhos - pode ser uma recorrência criada sem pai-filho
          // Extrair descrição base (sem " - Recorrência X" ou " - Parcela X")
          const descricaoBase = lancamento.descricao
            .replace(/ - Recorrência \d+$/, '')
            .replace(/ - Parcela \d+$/, '')
            .trim();
          
          console.log('🔍 Buscando série com descrição base:', descricaoBase);
          
          // Buscar todos os lançamentos que fazem parte da mesma série
          const serieCompleta = lancamentos.filter(l => {
            const descricaoLancamento = l.descricao
              .replace(/ - Recorrência \d+$/, '')
              .replace(/ - Parcela \d+$/, '')
              .trim();
            
            return descricaoLancamento === descricaoBase &&
              (l.formaPagamento === 'recorrente' || l.formaPagamento === 'parcelado') &&
              l.categoriaId === lancamento.categoriaId &&
              l.valor === lancamento.valor;
          });
          
          if (serieCompleta.length > 1) {
            idsParaDeletar = serieCompleta.map(l => l.id);
            console.log('📋 Encontrados lançamentos da série:', serieCompleta.length, serieCompleta.map(l => l.descricao));
          } else {
            idsParaDeletar = [lancamento.id];
          }
        }
      }

      console.log('🗑️ IDs para deletar:', idsParaDeletar);

      // Deletar todos os IDs encontrados
      const { error } = await supabase
        .from('lancamentos_financeiros')
        .delete()
        .in('id', idsParaDeletar);

      if (error) throw error;

      // Atualizar estado local
      setLancamentos(prev => prev.filter(l => !idsParaDeletar.includes(l.id)));
      
      toast.success(`${idsParaDeletar.length} lançamento(s) da série excluído(s) com sucesso!`);
      return true;
    } catch (error) {
      console.error('Erro ao excluir recorrência:', error);
      toast.error("Erro ao excluir série de recorrência");
      return false;
    }
  };

  const limparTodosLancamentos = async () => {
    try {
      const { error } = await supabase
        .from('lancamentos_financeiros')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Deleta todos os registros

      if (error) throw error;

      setLancamentos([]);
      toast.success('Todos os lançamentos foram removidos');
    } catch (error) {
      console.error('Erro ao limpar lançamentos:', error);
      toast.error('Erro ao limpar lançamentos');
    }
  };

  return {
    lancamentos,
    loading,
    adicionarLancamento,
    atualizarLancamento,
    deletarLancamento,
    deletarRecorrenciaCompleta,
    limparTodosLancamentos,
    refetch: fetchLancamentos
  };
};
