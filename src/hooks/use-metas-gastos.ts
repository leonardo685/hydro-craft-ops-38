import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface MetaGasto {
  id: string;
  categoriaId: string;
  valorMeta: number;
  periodo: 'mensal' | 'trimestral' | 'anual';
  dataInicio: Date;
  dataFim: Date;
  observacoes?: string;
  modeloGestao: 'dre' | 'esperado' | 'realizado';
}

export const useMetasGastos = (modeloGestao?: 'dre' | 'esperado' | 'realizado') => {
  const [metas, setMetas] = useState<MetaGasto[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMetas = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('metas_gastos')
        .select('*')
        .order('data_inicio', { ascending: false });

      if (modeloGestao) {
        query = query.eq('modelo_gestao', modeloGestao);
      }

      const { data, error } = await query;

      if (error) throw error;

      const metasFormatadas = (data || []).map(meta => ({
        id: meta.id,
        categoriaId: meta.categoria_id,
        valorMeta: Number(meta.valor_meta),
        periodo: meta.periodo as 'mensal' | 'trimestral' | 'anual',
        dataInicio: new Date(meta.data_inicio),
        dataFim: new Date(meta.data_fim),
        observacoes: meta.observacoes,
        modeloGestao: meta.modelo_gestao as 'dre' | 'esperado' | 'realizado'
      }));

      setMetas(metasFormatadas);
    } catch (error) {
      console.error('Erro ao buscar metas:', error);
      toast.error('Erro ao carregar metas de gastos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetas();
  }, [modeloGestao]);

  const adicionarMeta = async (
    meta: Omit<MetaGasto, 'id'>
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('metas_gastos')
        .insert({
          categoria_id: meta.categoriaId,
          valor_meta: meta.valorMeta,
          periodo: meta.periodo,
          data_inicio: meta.dataInicio.toISOString(),
          data_fim: meta.dataFim.toISOString(),
          observacoes: meta.observacoes || null,
          modelo_gestao: meta.modeloGestao
        });

      if (error) throw error;

      await fetchMetas();
      toast.success('Meta criada com sucesso!');
      return true;
    } catch (error) {
      console.error('Erro ao adicionar meta:', error);
      toast.error('Erro ao criar meta');
      return false;
    }
  };

  const atualizarMeta = async (
    id: string,
    meta: Partial<Omit<MetaGasto, 'id'>>
  ): Promise<boolean> => {
    try {
      const updateData: any = {};
      
      if (meta.categoriaId) updateData.categoria_id = meta.categoriaId;
      if (meta.valorMeta !== undefined) updateData.valor_meta = meta.valorMeta;
      if (meta.periodo) updateData.periodo = meta.periodo;
      if (meta.dataInicio) updateData.data_inicio = meta.dataInicio.toISOString();
      if (meta.dataFim) updateData.data_fim = meta.dataFim.toISOString();
      if (meta.observacoes !== undefined) updateData.observacoes = meta.observacoes;
      if (meta.modeloGestao) updateData.modelo_gestao = meta.modeloGestao;

      const { error } = await supabase
        .from('metas_gastos')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      await fetchMetas();
      toast.success('Meta atualizada com sucesso!');
      return true;
    } catch (error) {
      console.error('Erro ao atualizar meta:', error);
      toast.error('Erro ao atualizar meta');
      return false;
    }
  };

  const deletarMeta = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('metas_gastos')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setMetas(prev => prev.filter(meta => meta.id !== id));
      toast.success('Meta deletada com sucesso!');
      return true;
    } catch (error) {
      console.error('Erro ao deletar meta:', error);
      toast.error('Erro ao deletar meta');
      return false;
    }
  };

  return {
    metas,
    loading,
    adicionarMeta,
    atualizarMeta,
    deletarMeta,
    refetch: fetchMetas
  };
};
