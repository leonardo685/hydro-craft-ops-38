-- Adicionar campos para NF de entrada e ordem de referência nos orçamentos
ALTER TABLE public.orcamentos 
ADD COLUMN IF NOT EXISTS numero_nota_entrada text,
ADD COLUMN IF NOT EXISTS ordem_referencia text;

-- Criar comentários para documentar os campos
COMMENT ON COLUMN public.orcamentos.numero_nota_entrada IS 'Número da Nota Fiscal de entrada vinculada ao orçamento';
COMMENT ON COLUMN public.orcamentos.ordem_referencia IS 'Ordem de referência no formato MH-000-00';