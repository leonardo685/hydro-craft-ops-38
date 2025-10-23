import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ContaBancaria {
  id: string;
  nome: string;
  banco?: string;
  agencia?: string;
  conta?: string;
  saldo_inicial: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export const useContasBancarias = () => {
  const [contas, setContas] = useState<ContaBancaria[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchContas = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('contas_bancarias')
        .select('*')
        .order('nome');

      if (error) throw error;
      setContas(data || []);
    } catch (error) {
      console.error('Erro ao carregar contas bancárias:', error);
      toast.error('Erro ao carregar contas bancárias');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContas();
  }, []);

  const adicionarConta = async (conta: Omit<ContaBancaria, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('contas_bancarias')
        .insert([conta])
        .select()
        .single();

      if (error) throw error;

      setContas(prev => [...prev, data]);
      toast.success('Conta bancária criada com sucesso');
      return data;
    } catch (error) {
      console.error('Erro ao criar conta bancária:', error);
      toast.error('Erro ao criar conta bancária');
      throw error;
    }
  };

  const atualizarConta = async (id: string, conta: Partial<ContaBancaria>) => {
    try {
      const { data, error } = await supabase
        .from('contas_bancarias')
        .update(conta)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setContas(prev => prev.map(c => c.id === id ? data : c));
      toast.success('Conta bancária atualizada com sucesso');
      return data;
    } catch (error) {
      console.error('Erro ao atualizar conta bancária:', error);
      toast.error('Erro ao atualizar conta bancária');
      throw error;
    }
  };

  const deletarConta = async (id: string) => {
    try {
      const { error } = await supabase
        .from('contas_bancarias')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setContas(prev => prev.filter(c => c.id !== id));
      toast.success('Conta bancária excluída com sucesso');
    } catch (error) {
      console.error('Erro ao deletar conta bancária:', error);
      toast.error('Erro ao deletar conta bancária');
      throw error;
    }
  };

  const contasAtivas = useMemo(() => {
    return contas.filter(conta => conta.ativo);
  }, [contas]);

  const getContasForSelect = useMemo(() => {
    return contasAtivas.map(conta => ({
      value: conta.nome,
      label: `${conta.nome}${conta.banco ? ` - ${conta.banco}` : ''}`
    }));
  }, [contasAtivas]);

  return {
    contas,
    contasAtivas,
    loading,
    adicionarConta,
    atualizarConta,
    deletarConta,
    getContasForSelect,
    refetch: fetchContas
  };
};