import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CategoriaFinanceira {
  id: string;
  codigo: string;
  nome: string;
  tipo: 'mae' | 'filha';
  categoriaMaeId?: string;
}

export const useCategoriasFinanceiras = () => {
  const [categorias, setCategorias] = useState<CategoriaFinanceira[]>([]);
  const [loading, setLoading] = useState(true);

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
        categoriaMaeId: cat.categoria_mae_id
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
    categoria: Omit<CategoriaFinanceira, 'id' | 'codigo'>
  ): Promise<CategoriaFinanceira | null> => {
    try {
      const novoCodigo = gerarProximoCodigo(categoria.tipo, categoria.categoriaMaeId);
      
      const { data, error } = await supabase
        .from('categorias_financeiras')
        .insert({
          codigo: novoCodigo,
          nome: categoria.nome,
          tipo: categoria.tipo,
          categoria_mae_id: categoria.categoriaMaeId || null
        })
        .select()
        .single();

      if (error) throw error;

      const novaCategoria: CategoriaFinanceira = {
        id: data.id,
        codigo: data.codigo,
        nome: data.nome,
        tipo: (data.tipo === 'mae' ? 'mae' : 'filha') as 'mae' | 'filha',
        categoriaMaeId: data.categoria_mae_id
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
    deletarCategoria,
    getNomeCategoriaMae,
    getCategoriasForSelect,
    refetch: fetchCategorias
  };
};
