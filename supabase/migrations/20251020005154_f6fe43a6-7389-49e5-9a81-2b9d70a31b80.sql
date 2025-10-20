-- Adicionar colunas de dados técnicos na tabela recebimentos
ALTER TABLE recebimentos 
ADD COLUMN IF NOT EXISTS camisa TEXT,
ADD COLUMN IF NOT EXISTS haste_comprimento TEXT,
ADD COLUMN IF NOT EXISTS curso TEXT,
ADD COLUMN IF NOT EXISTS conexao_a TEXT,
ADD COLUMN IF NOT EXISTS conexao_b TEXT;