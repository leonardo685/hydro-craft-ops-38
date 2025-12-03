-- Adicionar coluna data_nota_retorno na tabela recebimentos
ALTER TABLE recebimentos 
ADD COLUMN data_nota_retorno timestamp with time zone;

-- Atualizar registros existentes que já têm pdf_nota_retorno
UPDATE recebimentos 
SET data_nota_retorno = updated_at 
WHERE pdf_nota_retorno IS NOT NULL AND data_nota_retorno IS NULL;