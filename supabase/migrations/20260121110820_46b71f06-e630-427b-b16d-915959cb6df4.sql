
-- Limpar fotos duplicadas do orçamento 0037/26 na tabela fotos_orcamento
-- Mantém apenas uma foto por URL única, priorizando as que têm legenda/apresentar_orcamento

WITH duplicatas AS (
  SELECT 
    id,
    arquivo_url,
    ROW_NUMBER() OVER (
      PARTITION BY arquivo_url 
      ORDER BY 
        CASE WHEN apresentar_orcamento = true THEN 0 ELSE 1 END,
        CASE WHEN legenda IS NOT NULL AND legenda != '' THEN 0 ELSE 1 END,
        created_at ASC
    ) as rn
  FROM fotos_orcamento
  WHERE orcamento_id = '88457a13-17ac-4c96-b89c-63c58fb329c7'
)
DELETE FROM fotos_orcamento
WHERE id IN (
  SELECT id FROM duplicatas WHERE rn > 1
);
