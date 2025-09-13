import { useState, useCallback } from 'react';

export interface CategoriaFinanceira {
  id: string;
  codigo: string;
  nome: string;
  tipo: 'mae' | 'filha';
  categoriaMaeId?: string;
}

const initialCategorias: CategoriaFinanceira[] = [
  {
    id: '1',
    codigo: '1',
    nome: 'Receita Operacional',
    tipo: 'mae'
  },
  {
    id: '2',
    codigo: '1.1',
    nome: 'Receita de Reforma de Cilindros',
    tipo: 'filha',
    categoriaMaeId: '1'
  },
  {
    id: '3',
    codigo: '2',
    nome: 'Despesas Operacionais',
    tipo: 'mae'
  },
  {
    id: '4',
    codigo: '2.1',
    nome: 'Folha de Pagamento',
    tipo: 'filha',
    categoriaMaeId: '3'
  },
  {
    id: '5',
    codigo: '2.2',
    nome: 'Impostos e Taxas',
    tipo: 'filha',
    categoriaMaeId: '3'
  },
  {
    id: '6',
    codigo: '3',
    nome: 'Despesas Financeiras',
    tipo: 'mae'
  },
  {
    id: '7',
    codigo: '3.1',
    nome: 'Juros e Multas',
    tipo: 'filha',
    categoriaMaeId: '6'
  }
];

export const useCategoriasFinanceiras = () => {
  const [categorias, setCategorias] = useState<CategoriaFinanceira[]>(initialCategorias);

  const categoriasMae = categorias.filter(cat => cat.tipo === 'mae');

  const gerarProximoCodigo = useCallback((tipo: 'mae' | 'filha', categoriaMaeId?: string) => {
    if (tipo === 'mae') {
      const codigosMae = categorias
        .filter(cat => cat.tipo === 'mae')
        .map(cat => parseInt(cat.codigo))
        .filter(num => !isNaN(num));
      
      const proximoCodigo = Math.max(0, ...codigosMae) + 1;
      return proximoCodigo.toString();
    } else {
      const categoriaMae = categorias.find(cat => cat.id === categoriaMaeId);
      if (!categoriaMae) return '';
      
      const codigosFilha = categorias
        .filter(cat => cat.tipo === 'filha' && cat.categoriaMaeId === categoriaMaeId)
        .map(cat => {
          const partes = cat.codigo.split('.');
          return parseInt(partes[1]) || 0;
        })
        .filter(num => !isNaN(num));
      
      const proximoSubCodigo = Math.max(0, ...codigosFilha) + 1;
      return `${categoriaMae.codigo}.${proximoSubCodigo}`;
    }
  }, [categorias]);

  const adicionarCategoria = useCallback((categoria: Omit<CategoriaFinanceira, 'id' | 'codigo'>) => {
    const codigo = gerarProximoCodigo(categoria.tipo, categoria.categoriaMaeId);
    
    const novaCategoria: CategoriaFinanceira = {
      id: Date.now().toString(),
      codigo,
      ...categoria
    };

    setCategorias(prev => [...prev, novaCategoria]);
    return novaCategoria;
  }, [gerarProximoCodigo]);

  const categoriasOrdenadas = categorias.sort((a, b) => {
    const codigoA = a.codigo.split('.').map(n => parseInt(n)).join('.');
    const codigoB = b.codigo.split('.').map(n => parseInt(n)).join('.');
    return codigoA.localeCompare(codigoB, undefined, { numeric: true });
  });

  const getNomeCategoriaMae = useCallback((categoriaMaeId?: string) => {
    if (!categoriaMaeId) return '';
    const categoriaMae = categorias.find(cat => cat.id === categoriaMaeId);
    return categoriaMae ? categoriaMae.nome : '';
  }, [categorias]);

  const getCategoriasForSelect = useCallback(() => {
    return categoriasOrdenadas.map(categoria => ({
      value: categoria.id,
      label: `${categoria.codigo} - ${categoria.nome}`,
      tipo: categoria.tipo
    }));
  }, [categoriasOrdenadas]);

  return {
    categorias,
    categoriasMae,
    categoriasOrdenadas,
    gerarProximoCodigo,
    adicionarCategoria,
    getNomeCategoriaMae,
    getCategoriasForSelect
  };
};