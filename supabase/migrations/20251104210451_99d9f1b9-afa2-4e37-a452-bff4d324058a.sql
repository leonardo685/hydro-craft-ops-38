-- Remover a constraint antiga que bloqueia transferências
ALTER TABLE lancamentos_financeiros 
DROP CONSTRAINT IF EXISTS lancamentos_financeiros_tipo_check;

-- Adicionar nova constraint que permite transferência
ALTER TABLE lancamentos_financeiros 
ADD CONSTRAINT lancamentos_financeiros_tipo_check 
CHECK (tipo IN ('entrada', 'saida', 'transferencia'));