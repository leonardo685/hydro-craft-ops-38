-- Adicionar nova coluna categoria_equipamento
ALTER TABLE recebimentos 
ADD COLUMN IF NOT EXISTS categoria_equipamento text DEFAULT 'cilindro';

-- Adicionar nova coluna ambiente_trabalho
ALTER TABLE recebimentos 
ADD COLUMN IF NOT EXISTS ambiente_trabalho text;

-- Atualizar registros existentes
UPDATE recebimentos 
SET categoria_equipamento = 'cilindro' 
WHERE categoria_equipamento IS NULL;

-- Adicionar comentários
COMMENT ON COLUMN recebimentos.categoria_equipamento IS 'Categoria do equipamento: cilindro ou outros';
COMMENT ON COLUMN recebimentos.ambiente_trabalho IS 'Ambiente de trabalho: comum ou quente';