-- Adicionar coluna observacoes à tabela recebimentos
ALTER TABLE recebimentos 
ADD COLUMN IF NOT EXISTS observacoes TEXT;

COMMENT ON COLUMN recebimentos.observacoes IS 'Observações gerais do recebimento, incluindo referência ao item da NFe';