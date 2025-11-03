-- Adicionar coluna codigo na tabela itens_orcamento
ALTER TABLE itens_orcamento 
ADD COLUMN IF NOT EXISTS codigo TEXT;