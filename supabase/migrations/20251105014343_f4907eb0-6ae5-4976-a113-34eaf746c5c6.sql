-- Criar tabela de histórico de orçamentos
CREATE TABLE IF NOT EXISTS public.historico_orcamentos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  orcamento_id UUID NOT NULL REFERENCES public.orcamentos(id) ON DELETE CASCADE,
  numero_revisao INTEGER NOT NULL,
  
  -- Dados do orçamento (snapshot completo)
  numero TEXT NOT NULL,
  equipamento TEXT NOT NULL,
  cliente_nome TEXT NOT NULL,
  cliente_id UUID,
  valor NUMERIC NOT NULL DEFAULT 0,
  desconto_percentual NUMERIC DEFAULT 0,
  
  -- Informações comerciais
  condicao_pagamento TEXT,
  prazo_entrega TEXT,
  prazo_pagamento INTEGER,
  assunto_proposta TEXT,
  frete TEXT,
  
  -- Observações e descrições
  descricao TEXT,
  observacoes TEXT,
  observacoes_nota TEXT,
  
  -- Dados de precificação (snapshot)
  preco_desejado NUMERIC DEFAULT 0,
  impostos_percentual NUMERIC DEFAULT 16,
  impostos_valor NUMERIC DEFAULT 0,
  comissao_percentual NUMERIC DEFAULT 0,
  comissao_valor NUMERIC DEFAULT 0,
  percentuais_customizados JSONB DEFAULT '[]'::jsonb,
  custos_variaveis JSONB DEFAULT '[]'::jsonb,
  total_custos_variaveis NUMERIC DEFAULT 0,
  margem_contribuicao NUMERIC DEFAULT 0,
  percentual_margem NUMERIC DEFAULT 0,
  
  -- Status na época da revisão
  status TEXT NOT NULL,
  
  -- Metadados
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data_revisao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraint para garantir unicidade da revisão por orçamento
  UNIQUE(orcamento_id, numero_revisao)
);

-- Criar tabela para armazenar itens de cada revisão
CREATE TABLE IF NOT EXISTS public.historico_itens_orcamento (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  historico_orcamento_id UUID NOT NULL REFERENCES public.historico_orcamentos(id) ON DELETE CASCADE,
  
  -- Dados do item
  tipo TEXT NOT NULL,
  codigo TEXT,
  descricao TEXT NOT NULL,
  quantidade NUMERIC NOT NULL DEFAULT 1,
  valor_unitario NUMERIC NOT NULL DEFAULT 0,
  valor_total NUMERIC NOT NULL DEFAULT 0,
  detalhes JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para melhorar performance
CREATE INDEX idx_historico_orcamentos_orcamento ON public.historico_orcamentos(orcamento_id);
CREATE INDEX idx_historico_orcamentos_numero_rev ON public.historico_orcamentos(orcamento_id, numero_revisao);
CREATE INDEX idx_historico_itens_historico ON public.historico_itens_orcamento(historico_orcamento_id);

-- RLS Policies para historico_orcamentos
ALTER TABLE public.historico_orcamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Histórico de orçamentos é visível para todos"
  ON public.historico_orcamentos FOR SELECT
  USING (true);

CREATE POLICY "Qualquer um pode criar histórico de orçamentos"
  ON public.historico_orcamentos FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Qualquer um pode atualizar histórico de orçamentos"
  ON public.historico_orcamentos FOR UPDATE
  USING (true);

CREATE POLICY "Qualquer um pode deletar histórico de orçamentos"
  ON public.historico_orcamentos FOR DELETE
  USING (true);

-- RLS Policies para historico_itens_orcamento
ALTER TABLE public.historico_itens_orcamento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Histórico de itens é visível para todos"
  ON public.historico_itens_orcamento FOR SELECT
  USING (true);

CREATE POLICY "Qualquer um pode criar histórico de itens"
  ON public.historico_itens_orcamento FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Qualquer um pode atualizar histórico de itens"
  ON public.historico_itens_orcamento FOR UPDATE
  USING (true);

CREATE POLICY "Qualquer um pode deletar histórico de itens"
  ON public.historico_itens_orcamento FOR DELETE
  USING (true);

-- Comentários
COMMENT ON TABLE public.historico_orcamentos IS 'Armazena o histórico completo de versões de cada orçamento';
COMMENT ON TABLE public.historico_itens_orcamento IS 'Armazena os itens de cada versão do histórico de orçamento';
COMMENT ON COLUMN public.historico_orcamentos.numero_revisao IS 'Número sequencial da revisão (1, 2, 3...)';