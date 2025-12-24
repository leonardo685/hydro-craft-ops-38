import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useEmpresaId } from '@/hooks/use-empresa-id';

export interface CategoriaFinanceira {
  id: string;
  codigo: string;
  nome: string;
  tipo: 'mae' | 'filha';
  categoriaMaeId?: string;
  cor?: string;
  classificacao: 'entrada' | 'saida';
}

// Função para gerar cor aleatória em HSL
const gerarCorAleatoria = (): string => {
  const hue = Math.floor(Math.random() * 360);
  const saturation = Math.floor(Math.random() * 30) + 60; // 60-90%
  const lightness = Math.floor(Math.random() * 20) + 45; // 45-65%
  return `${hue} ${saturation}% ${lightness}%`;
};

export const useCategoriasFinanceiras = () => {
  const [categorias, setCategorias] = useState<CategoriaFinanceira[]>([]);
  const [loading, setLoading] = useState(true);
  const { empresaId } = useEmpresaId();

  // Buscar categorias do Supabase
  const fetchCategorias = async () => {
    try {
      const { data, error } = await supabase
        .from('categorias_financeiras')
        .select('*')
        .order('codigo');

      if (error) throw error;

      const categoriasFormatadas = (data || []).map(cat => ({
        id: cat.id,
        codigo: cat.codigo,
        nome: cat.nome,
        tipo: (cat.tipo === 'mae' ? 'mae' : 'filha') as 'mae' | 'filha',
        categoriaMaeId: cat.categoria_mae_id,
        cor: cat.cor,
        classificacao: (cat.classificacao || 'entrada') as 'entrada' | 'saida'
      }));

      setCategorias(categoriasFormatadas);
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
      toast.error('Erro ao carregar categorias financeiras');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategorias();
  }, []);

  const categoriasMae = useMemo(
    () => categorias.filter(cat => cat.tipo === 'mae'),
    [categorias]
  );

  const gerarProximoCodigo = useMemo(
    () => (tipo: 'mae' | 'filha', categoriaMaeId?: string): string => {
      if (tipo === 'mae') {
        const categoriasMae = categorias.filter(c => c.tipo === 'mae');
        if (categoriasMae.length === 0) return '1';
        
        const ultimoCodigo = Math.max(
          ...categoriasMae.map(c => parseInt(c.codigo) || 0)
        );
        return String(ultimoCodigo + 1);
      } else {
        const categoriasFilhas = categorias.filter(
          c => c.tipo === 'filha' && c.categoriaMaeId === categoriaMaeId
        );
        
        if (!categoriaMaeId || categoriasFilhas.length === 0) {
          const categoriaMae = categorias.find(c => c.id === categoriaMaeId);
          return categoriaMae ? `${categoriaMae.codigo}.1` : '1.1';
        }
        
        const ultimoCodigo = Math.max(
          ...categoriasFilhas.map(c => {
            const partes = c.codigo.split('.');
            return parseInt(partes[1] || '0') || 0;
          })
        );
        
        const categoriaMae = categorias.find(c => c.id === categoriaMaeId);
        return categoriaMae ? `${categoriaMae.codigo}.${ultimoCodigo + 1}` : '1.1';
      }
    },
    [categorias]
  );

  const adicionarCategoria = async (
    categoria: Omit<CategoriaFinanceira, 'id' | 'codigo' | 'cor'>
  ): Promise<CategoriaFinanceira | null> => {
    try {
      const novoCodigo = gerarProximoCodigo(categoria.tipo, categoria.categoriaMaeId);
      
      // Se for filha, pega a cor da mãe, senão gera uma nova cor
      let cor: string;
      if (categoria.tipo === 'filha' && categoria.categoriaMaeId) {
        const categoriaMae = categorias.find(c => c.id === categoria.categoriaMaeId);
        cor = categoriaMae?.cor || gerarCorAleatoria();
      } else {
        cor = gerarCorAleatoria();
      }
      
      const { data, error } = await supabase
        .from('categorias_financeiras')
        .insert({
          codigo: novoCodigo,
          nome: categoria.nome,
          tipo: categoria.tipo,
          categoria_mae_id: categoria.categoriaMaeId || null,
          cor: cor,
          classificacao: categoria.classificacao,
          empresa_id: empresaId
        })
        .select()
        .single();

      if (error) throw error;

      const novaCategoria: CategoriaFinanceira = {
        id: data.id,
        codigo: data.codigo,
        nome: data.nome,
        tipo: (data.tipo === 'mae' ? 'mae' : 'filha') as 'mae' | 'filha',
        categoriaMaeId: data.categoria_mae_id,
        cor: data.cor,
        classificacao: data.classificacao as 'entrada' | 'saida'
      };

      setCategorias(prev => [...prev, novaCategoria]);
      toast.success('Categoria criada com sucesso!');
      return novaCategoria;
    } catch (error) {
      console.error('Erro ao adicionar categoria:', error);
      toast.error('Erro ao criar categoria');
      return null;
    }
  };

  const atualizarCategoria = async (
    id: string,
    updates: {
      nome?: string;
      categoriaMaeId?: string;
    }
  ): Promise<boolean> => {
    try {
      const categoriaAtual = categorias.find(c => c.id === id);
      if (!categoriaAtual) {
        toast.error('Categoria não encontrada');
        return false;
      }

      // Validação: nome não pode ser vazio
      if (updates.nome !== undefined && !updates.nome.trim()) {
        toast.error('Nome da categoria não pode ser vazio');
        return false;
      }

      // Se for conta filha e estiver mudando a categoria mãe
      if (updates.categoriaMaeId !== undefined && categoriaAtual.tipo === 'filha') {
        const novaMae = categorias.find(c => c.id === updates.categoriaMaeId);
        if (!novaMae || novaMae.tipo !== 'mae') {
          toast.error('Categoria mãe inválida');
          return false;
        }

        // Verificar se as classificações são compatíveis
        if (novaMae.classificacao !== categoriaAtual.classificacao) {
          toast.error('A categoria mãe deve ter a mesma classificação (entrada/saída)');
          return false;
        }
      }

      const updateData: any = {};
      if (updates.nome !== undefined) {
        updateData.nome = updates.nome.trim();
      }
      if (updates.categoriaMaeId !== undefined) {
        updateData.categoria_mae_id = updates.categoriaMaeId;
      }

      // Se mudou a categoria mãe, recalcular o código
      if (updates.categoriaMaeId !== undefined && categoriaAtual.tipo === 'filha') {
        const novaMae = categorias.find(c => c.id === updates.categoriaMaeId);
        if (!novaMae) {
          toast.error('Categoria mãe não encontrada');
          return false;
        }
        
        // Buscar todas as filhas da nova mãe (exceto a que está sendo editada)
        const filhasDaNovaMae = categorias.filter(
          c => c.tipo === 'filha' && c.categoriaMaeId === updates.categoriaMaeId && c.id !== id
        );
        
        // Calcular o próximo número sequencial
        let proximoNumero = 1;
        if (filhasDaNovaMae.length > 0) {
          const numerosExistentes = filhasDaNovaMae.map(c => {
            const partes = c.codigo.split('.');
            return parseInt(partes[1] || '0') || 0;
          });
          proximoNumero = Math.max(...numerosExistentes) + 1;
        }
        
        updateData.codigo = `${novaMae.codigo}.${proximoNumero}`;
      }

      const { data, error } = await supabase
        .from('categorias_financeiras')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      const categoriaAtualizada: CategoriaFinanceira = {
        id: data.id,
        codigo: data.codigo,
        nome: data.nome,
        tipo: data.tipo as 'mae' | 'filha',
        categoriaMaeId: data.categoria_mae_id,
        cor: data.cor,
        classificacao: data.classificacao as 'entrada' | 'saida'
      };

      setCategorias(prev => prev.map(cat => cat.id === id ? categoriaAtualizada : cat));
      toast.success('Categoria atualizada com sucesso!');
      return true;
    } catch (error) {
      console.error('Erro ao atualizar categoria:', error);
      toast.error('Erro ao atualizar categoria');
      return false;
    }
  };

  const deletarCategoria = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('categorias_financeiras')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setCategorias(prev => prev.filter(cat => cat.id !== id));
      toast.success('Categoria deletada com sucesso!');
      return true;
    } catch (error) {
      console.error('Erro ao deletar categoria:', error);
      toast.error('Erro ao deletar categoria');
      return false;
    }
  };

  const categoriasOrdenadas = useMemo(
    () => [...categorias].sort((a, b) => {
      const aParts = a.codigo.split('.').map(Number);
      const bParts = b.codigo.split('.').map(Number);
      
      for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
        const aVal = aParts[i] || 0;
        const bVal = bParts[i] || 0;
        if (aVal !== bVal) return aVal - bVal;
      }
      return 0;
    }),
    [categorias]
  );

  const getNomeCategoriaMae = useMemo(
    () => (categoriaMaeId?: string): string => {
      if (!categoriaMaeId) return '-';
      const categoria = categorias.find(c => c.id === categoriaMaeId);
      return categoria ? categoria.nome : '-';
    },
    [categorias]
  );

  const getCategoriasForSelect = useMemo(
    () => (): { value: string, label: string, tipo: 'mae' | 'filha' }[] => {
      return categoriasOrdenadas.map(cat => ({
        value: cat.id,
        label: `${cat.codigo} - ${cat.nome}`,
        tipo: cat.tipo
      }));
    },
    [categoriasOrdenadas]
  );

  return {
    categorias: categoriasOrdenadas,
    categoriasMae,
    loading,
    gerarProximoCodigo,
    adicionarCategoria,
    atualizarCategoria,
    deletarCategoria,
    getNomeCategoriaMae,
    getCategoriasForSelect,
    refetch: fetchCategorias
  };
};
