-- Limpar fotos duplicadas do MH-012-26 (recebimento_id = 140)
-- Manter apenas uma foto por padrão de nome base (ex: 140_analise_0, 140_analise_1, etc.)
DELETE FROM fotos_equipamentos 
WHERE id NOT IN (
  SELECT DISTINCT ON (
    REGEXP_REPLACE(nome_arquivo, '_[0-9]+\.[^.]+$', '')
  ) id 
  FROM fotos_equipamentos 
  WHERE recebimento_id = 140 AND apresentar_orcamento = false
  ORDER BY REGEXP_REPLACE(nome_arquivo, '_[0-9]+\.[^.]+$', ''), created_at ASC
)
AND recebimento_id = 140 
AND apresentar_orcamento = false;

-- Limpar fotos duplicadas do MH-011-26 (recebimento_id = 139)
DELETE FROM fotos_equipamentos 
WHERE id NOT IN (
  SELECT DISTINCT ON (
    REGEXP_REPLACE(nome_arquivo, '_[0-9]+\.[^.]+$', '')
  ) id 
  FROM fotos_equipamentos 
  WHERE recebimento_id = 139 AND apresentar_orcamento = false
  ORDER BY REGEXP_REPLACE(nome_arquivo, '_[0-9]+\.[^.]+$', ''), created_at ASC
)
AND recebimento_id = 139 
AND apresentar_orcamento = false;