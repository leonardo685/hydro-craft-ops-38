-- Adicionar coluna tipo na tabela fotos_orcamento para diferenciar fotos de orçamento e precificação
ALTER TABLE public.fotos_orcamento 
ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'orcamento'
CHECK (tipo IN ('orcamento', 'precificacao'));

-- Criar índice para melhor performance nas consultas
CREATE INDEX IF NOT EXISTS idx_fotos_orcamento_tipo 
ON public.fotos_orcamento(orcamento_id, tipo);

-- Atualizar fotos existentes para serem do tipo 'orcamento'
UPDATE public.fotos_orcamento 
SET tipo = 'orcamento' 
WHERE tipo IS NULL;