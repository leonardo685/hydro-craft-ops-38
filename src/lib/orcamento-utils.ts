// Este arquivo foi limpo - todos os dados agora são gerenciados pelo Supabase
// As funcionalidades de orçamentos serão implementadas usando a base de dados

export interface Orcamento {
  id: number;
  numero: string;
  numeroOrdem?: string;
  equipamento: string;
  cliente: string;
  valor: number;
  valorTotal?: number;
  valorComDesconto?: number;
  status: 'pendente' | 'aprovado' | 'rejeitado' | 'faturamento' | 'finalizado';
  itens: Array<{
    descricao: string;
    quantidade: number;
    valor: number;
  }>;
  dataValidade: string;
  observacoes: string;
  vinculadoOrdemServico?: boolean;
  ordemServicoId?: string;
  dataAprovacao?: string;
  dataEmissao?: string;
  numeroNF?: string;
  formaPagamento?: string;
  dataVencimento?: string;
  analiseOrigem?: string;
}

export interface OrdemServico {
  id: string;
  orcamentoId: number;
  equipamento: string;
  cliente: string;
  valor: number;
  progresso: number;
  etapa: 'aguardando_inicio' | 'em_producao' | 'finalizado' | 'entregue';
  dataInicio: string;
  previsaoEntrega: string;
  tecnicoResponsavel: string;
}

// Funções mockadas retornando arrays vazios - implementação será feita com Supabase
export const getOrcamentos = (): Orcamento[] => {
  return [];
};

export const getOrdensServico = (): OrdemServico[] => {
  return [];
};

export const updateOrcamento = (id: number, updates: Partial<Orcamento>): void => {
  // TODO: Implementar com Supabase
  console.log('updateOrcamento - dados serão gerenciados pelo Supabase');
};

export const aprovarOrcamento = (id: number): void => {
  // TODO: Implementar com Supabase
  console.log('aprovarOrcamento - dados serão gerenciados pelo Supabase');
};

export const reprovarOrcamento = (id: number): void => {
  // TODO: Implementar com Supabase
  console.log('reprovarOrcamento - dados serão gerenciados pelo Supabase');
};

export const emitirNotaFiscal = (orcamentoId: number, dadosNF: {
  numeroNF: string;
  formaPagamento: string;
  dataVencimento: string;
}): void => {
  // TODO: Implementar com Supabase
  console.log('emitirNotaFiscal - dados serão gerenciados pelo Supabase');
};

export const getOrcamentosPendentes = (): Orcamento[] => {
  return [];
};

export const getOrcamentosEmFaturamento = (): Orcamento[] => {
  return [];
};

export const getOrcamentosFinalizados = (): Orcamento[] => {
  return [];
};