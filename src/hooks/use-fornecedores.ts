import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useEmpresaId } from '@/hooks/use-empresa-id';

export interface Fornecedor {
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

export const useFornecedores = () => {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { empresaId } = useEmpresaId();

  const carregarFornecedores = async () => {
    try {
      const { data, error } = await supabase
        .from('fornecedores')
        .select('*')
        .order('nome', { ascending: true });

      if (error) throw error;

      setFornecedores(data || []);
    } catch (error) {
      console.error('Erro ao carregar fornecedores:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar fornecedores",
        variant: "destructive",
      });
    }
  };

  const criarFornecedor = async (dadosFornecedor: Omit<Fornecedor, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('fornecedores')
        .insert([{ ...dadosFornecedor, empresa_id: empresaId }])
        .select()
        .single();

      if (error) throw error;

      await carregarFornecedores();
      
      toast({
        title: "Sucesso",
        description: "Fornecedor criado com sucesso",
      });

      return data;
    } catch (error) {
      console.error('Erro ao criar fornecedor:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar fornecedor",
        variant: "destructive",
      });
      throw error;
    }
  };

  const atualizarFornecedor = async (id: string, dados: Partial<Fornecedor>) => {
    try {
      const { error } = await supabase
        .from('fornecedores')
        .update(dados)
        .eq('id', id);

      if (error) throw error;

      await carregarFornecedores();
      
      toast({
        title: "Sucesso",
        description: "Fornecedor atualizado com sucesso",
      });
    } catch (error) {
      console.error('Erro ao atualizar fornecedor:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar fornecedor",
        variant: "destructive",
      });
      throw error;
    }
  };

  useEffect(() => {
    const carregarDados = async () => {
      setLoading(true);
      await carregarFornecedores();
      setLoading(false);
    };

    carregarDados();
  }, []);

  return {
    fornecedores,
    loading,
    criarFornecedor,
    atualizarFornecedor,
    recarregar: carregarFornecedores
  };
};
