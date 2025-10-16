-- Adicionar campos de precificação ao orçamento
ALTER TABLE orcamentos 
ADD COLUMN IF NOT EXISTS preco_desejado numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS margem_contribuicao numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS percentual_margem numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS impostos_percentual numeric DEFAULT 16,
ADD COLUMN IF NOT EXISTS impostos_valor numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS comissao_percentual numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS comissao_valor numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS custos_variaveis jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS total_custos_variaveis numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS status_negociacao text DEFAULT 'pendente',
ADD COLUMN IF NOT EXISTS data_negociacao timestamp with time zone,
ADD COLUMN IF NOT EXISTS aprovado_por_gestor boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS data_aprovacao_gestor timestamp with time zone;