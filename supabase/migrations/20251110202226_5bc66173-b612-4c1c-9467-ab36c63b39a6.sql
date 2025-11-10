-- Migração de dados: Popular ordem_referencia e numero_nota_entrada em orçamentos antigos

-- 1. Popular ordem_referencia baseado no número do orçamento
-- Formato: 0021/25 -> MH-021-25
UPDATE orcamentos
SET ordem_referencia = CONCAT(
  'MH-',
  LPAD(SPLIT_PART(numero, '/', 1), 3, '0'),
  '-',
  SPLIT_PART(numero, '/', 2)
)
WHERE ordem_referencia IS NULL AND numero IS NOT NULL;

-- 2. Popular numero_nota_entrada das ordens de serviço vinculadas
UPDATE orcamentos o
SET numero_nota_entrada = r.nota_fiscal
FROM ordens_servico os
LEFT JOIN recebimentos r ON r.id = os.recebimento_id
WHERE o.ordem_servico_id = os.id
  AND o.numero_nota_entrada IS NULL
  AND r.nota_fiscal IS NOT NULL;