-- Limpar fotos duplicadas do recebimento 141, mantendo apenas a primeira de cada índice
-- Criar tabela temporária com IDs a manter
WITH fotos_a_manter AS (
  SELECT DISTINCT ON (
    substring(arquivo_url from '141_analise_(\d+)_')
  ) id
  FROM fotos_equipamentos 
  WHERE recebimento_id = 141
  ORDER BY substring(arquivo_url from '141_analise_(\d+)_'), created_at ASC
)
DELETE FROM fotos_equipamentos 
WHERE recebimento_id = 141 
AND id NOT IN (SELECT id FROM fotos_a_manter);