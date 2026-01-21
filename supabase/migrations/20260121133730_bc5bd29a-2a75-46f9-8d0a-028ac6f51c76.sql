-- Deletar ordens duplicadas MH-013-26, mantendo a mais antiga
WITH ordens_para_manter AS (
  SELECT id FROM ordens_servico 
  WHERE numero_ordem = 'MH-013-26'
  ORDER BY created_at ASC
  LIMIT 1
)
DELETE FROM ordens_servico 
WHERE numero_ordem = 'MH-013-26' 
AND id NOT IN (SELECT id FROM ordens_para_manter);

-- Remover fotos duplicadas baseadas em arquivo_url
DELETE FROM fotos_equipamentos a
USING fotos_equipamentos b
WHERE a.id > b.id
AND a.arquivo_url = b.arquivo_url;

-- Criar índice único para prevenir duplicatas futuras de fotos
CREATE UNIQUE INDEX IF NOT EXISTS fotos_equipamentos_unique_url 
ON fotos_equipamentos (arquivo_url);