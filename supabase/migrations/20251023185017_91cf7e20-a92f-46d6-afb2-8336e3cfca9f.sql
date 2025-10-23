-- Adicionar coluna conta_destino para transferências entre contas
ALTER TABLE lancamentos_financeiros 
ADD COLUMN conta_destino TEXT;

-- Criar índice para melhorar performance nas buscas por tipo
CREATE INDEX IF NOT EXISTS idx_lancamentos_tipo ON lancamentos_financeiros(tipo);

-- Adicionar comentário explicativo
COMMENT ON COLUMN lancamentos_financeiros.conta_destino IS 'Conta bancária de destino para transferências entre contas da empresa';