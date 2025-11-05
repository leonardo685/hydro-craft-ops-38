-- Criar tabela de histórico de precificação
CREATE TABLE IF NOT EXISTS public.historico_precificacao (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  orcamento_id UUID NOT NULL REFERENCES public.orcamentos(id) ON DELETE CASCADE,
  numero_revisao INTEGER NOT NULL,
  
  -- Dados da precificação
  preco_desejado NUMERIC NOT NULL DEFAULT 0,
  desconto_percentual NUMERIC DEFAULT 0,
  impostos_percentual NUMERIC DEFAULT 16,
  impostos_valor NUMERIC DEFAULT 0,
  comissao_percentual NUMERIC DEFAULT 0,
  comissao_valor NUMERIC DEFAULT 0,
  percentuais_customizados JSONB DEFAULT '[]'::jsonb,
  custos_variaveis JSONB DEFAULT '[]'::jsonb,
  total_custos_variaveis NUMERIC DEFAULT 0,
  margem_contribuicao NUMERIC DEFAULT 0,
  percentual_margem NUMERIC DEFAULT 0,
  
  -- Metadados
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraint para garantir unicidade da revisão por orçamento
  UNIQUE(orcamento_id, numero_revisao)
);

-- Criar índice para melhorar performance
CREATE INDEX idx_historico_precificacao_orcamento ON public.historico_precificacao(orcamento_id);

-- RLS Policies
ALTER TABLE public.historico_precificacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Histórico de precificação é visível para todos"
  ON public.historico_precificacao FOR SELECT
  USING (true);

CREATE POLICY "Qualquer um pode criar histórico de precificação"
  ON public.historico_precificacao FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Qualquer um pode atualizar histórico de precificação"
  ON public.historico_precificacao FOR UPDATE
  USING (true);

CREATE POLICY "Qualquer um pode deletar histórico de precificação"
  ON public.historico_precificacao FOR DELETE
  USING (true);

-- Comentários
COMMENT ON TABLE public.historico_precificacao IS 'Armazena o histórico de versões da precificação de cada orçamento';
COMMENT ON COLUMN public.historico_precificacao.numero_revisao IS 'Número sequencial da revisão (1, 2, 3...)';