-- Limpar itens duplicados do orçamento 0035/26, mantendo apenas um de cada
WITH duplicados AS (
  SELECT id, 
         ROW_NUMBER() OVER (PARTITION BY orcamento_id, tipo, descricao, quantidade ORDER BY created_at) as rn
  FROM itens_orcamento
  WHERE orcamento_id = '24610bb2-8ae5-4c9a-b41c-edbf9641fd63'
)
DELETE FROM itens_orcamento
WHERE id IN (
  SELECT id FROM duplicados WHERE rn > 1
);