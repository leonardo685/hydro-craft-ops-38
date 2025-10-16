-- Adicionar colunas de precificação à tabela orcamentos
ALTER TABLE orcamentos
ADD COLUMN IF NOT EXISTS desconto_percentual numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS percentuais_customizados jsonb DEFAULT '[]'::jsonb;

-- Comentários para documentação
COMMENT ON COLUMN orcamentos.desconto_percentual IS 'Percentual de desconto aplicado sobre o preço desejado';
COMMENT ON COLUMN orcamentos.percentuais_customizados IS 'Lista de percentuais customizados adicionais (como taxas, royalties, etc.)';