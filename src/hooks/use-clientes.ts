import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useEmpresaId } from '@/hooks/use-empresa-id';

export interface Cliente {
  id: string;
  nome: string;
  cnpj_cpf?: string;
  email?: string;
  telefone?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  inscricao_estadual?: string;
  inscricao_municipal?: string;
  observacoes?: string;
  created_at: string;
  updated_at: string;
}

export const useClientes = () => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { empresaId } = useEmpresaId();

  const carregarClientes = async () => {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('nome', { ascending: true });

      if (error) throw error;

      setClientes(data || []);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar clientes",
        variant: "destructive",
      });
    }
  };

  const criarCliente = async (dadosCliente: Omit<Cliente, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .insert([{ ...dadosCliente, empresa_id: empresaId }])
        .select()
        .single();

      if (error) throw error;

      await carregarClientes();
      
      toast({
        title: "Sucesso",
        description: "Cliente criado com sucesso",
      });

      return data;
    } catch (error) {
      console.error('Erro ao criar cliente:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar cliente",
        variant: "destructive",
      });
      throw error;
    }
  };

  const atualizarCliente = async (id: string, dados: Partial<Cliente>) => {
    try {
      const { error } = await supabase
        .from('clientes')
        .update(dados)
        .eq('id', id);

      if (error) throw error;

      await carregarClientes();
      
      toast({
        title: "Sucesso",
        description: "Cliente atualizado com sucesso",
      });
    } catch (error) {
      console.error('Erro ao atualizar cliente:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar cliente",
        variant: "destructive",
      });
      throw error;
    }
  };

  useEffect(() => {
    const carregarDados = async () => {
      setLoading(true);
      await carregarClientes();
      setLoading(false);
    };

    carregarDados();
  }, []);

  return {
    clientes,
    loading,
    criarCliente,
    atualizarCliente,
    recarregar: carregarClientes
  };
};