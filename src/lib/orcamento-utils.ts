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

const ORCAMENTOS_STORAGE_KEY = 'orcamentos';
const ORDENS_SERVICO_STORAGE_KEY = 'ordensServico';

export const getOrcamentos = (): Orcamento[] => {
  const stored = localStorage.getItem(ORCAMENTOS_STORAGE_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  
  // Iniciar com lista vazia
  const initialOrcamentos: Orcamento[] = [];
  localStorage.setItem(ORCAMENTOS_STORAGE_KEY, JSON.stringify(initialOrcamentos));
  return initialOrcamentos;
};

export const getOrdensServico = (): OrdemServico[] => {
  const stored = localStorage.getItem(ORDENS_SERVICO_STORAGE_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  
  // Iniciar com lista vazia
  const initialOrdens: OrdemServico[] = [];
  localStorage.setItem(ORDENS_SERVICO_STORAGE_KEY, JSON.stringify(initialOrdens));
  return initialOrdens;
};

export const updateOrcamento = (id: number, updates: Partial<Orcamento>): void => {
  const orcamentos = getOrcamentos();
  const index = orcamentos.findIndex(o => o.id === id);
  if (index !== -1) {
    orcamentos[index] = { ...orcamentos[index], ...updates };
    localStorage.setItem(ORCAMENTOS_STORAGE_KEY, JSON.stringify(orcamentos));
  }
};

export const aprovarOrcamento = (id: number): void => {
  const orcamentos = getOrcamentos();
  const orcamento = orcamentos.find(o => o.id === id);
  if (!orcamento) return;

  const dataAprovacao = new Date().toISOString().split('T')[0];
  
  // Atualizar orçamento para faturamento
  updateOrcamento(id, {
    status: 'faturamento',
    dataAprovacao
  });

  // Se o orçamento foi baseado em uma análise, aprovar a análise também
  if (orcamento.analiseOrigem) {
    const analises = JSON.parse(localStorage.getItem('analises') || '[]');
    const analiseIndex = analises.findIndex((a: any) => a.id === orcamento.analiseOrigem);
    
    if (analiseIndex !== -1) {
      analises[analiseIndex] = {
        ...analises[analiseIndex],
        status: 'Aprovada',
        dataAprovacao: dataAprovacao,
        orcamentoAprovado: orcamento.numeroOrdem || `${orcamento.numero}`,
        valorAprovado: orcamento.valorComDesconto || orcamento.valorTotal || 0
      };
      
      localStorage.setItem('analises', JSON.stringify(analises));
    }
  }

  // Se vinculado a ordem de serviço, criar/atualizar ordem de serviço
  if (orcamento.vinculadoOrdemServico) {
    const ordensServico = getOrdensServico();
    const ordemExistente = ordensServico.find(os => os.orcamentoId === id);
    
    if (!ordemExistente) {
      const novaOrdem: OrdemServico = {
        id: `OS-${new Date().getFullYear()}-${String(ordensServico.length + 1).padStart(3, '0')}`,
        orcamentoId: id,
        equipamento: orcamento.equipamento,
        cliente: orcamento.cliente,
        valor: orcamento.valor,
        progresso: 0,
        etapa: 'aguardando_inicio',
        dataInicio: dataAprovacao,
        previsaoEntrega: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 10 dias
        tecnicoResponsavel: 'A definir'
      };
      
      ordensServico.push(novaOrdem);
      localStorage.setItem(ORDENS_SERVICO_STORAGE_KEY, JSON.stringify(ordensServico));
      
      // Atualizar orçamento com ID da ordem de serviço
      updateOrcamento(id, { ordemServicoId: novaOrdem.id });
    }
  }
};

export const reprovarOrcamento = (id: number): void => {
  updateOrcamento(id, { status: 'rejeitado' });
};

export const emitirNotaFiscal = (orcamentoId: number, dadosNF: {
  numeroNF: string;
  formaPagamento: string;
  dataVencimento: string;
}): void => {
  updateOrcamento(orcamentoId, {
    status: 'finalizado',
    numeroNF: dadosNF.numeroNF,
    formaPagamento: dadosNF.formaPagamento,
    dataVencimento: dadosNF.dataVencimento,
    dataEmissao: new Date().toISOString().split('T')[0]
  });
};

export const getOrcamentosPendentes = (): Orcamento[] => {
  return getOrcamentos().filter(o => o.status === 'pendente');
};

export const getOrcamentosEmFaturamento = (): Orcamento[] => {
  return getOrcamentos().filter(o => o.status === 'faturamento');
};

export const getOrcamentosFinalizados = (): Orcamento[] => {
  return getOrcamentos().filter(o => o.status === 'finalizado');
};