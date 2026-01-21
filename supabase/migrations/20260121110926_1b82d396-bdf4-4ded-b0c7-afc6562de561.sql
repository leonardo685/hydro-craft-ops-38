
-- Limpar fotos duplicadas do orçamento 0037/26 
-- Agrupa por recebimento_id + posição da foto (ex: analise_0, analise_1) e mantém apenas uma

WITH foto_base AS (
  SELECT 
    id,
    -- Extrair o padrão base: 140_analise_0, 140_analise_1, etc.
    REGEXP_REPLACE(nome_arquivo, '_[0-9]+\.[A-Za-z]+$', '') as foto_pattern,
    apresentar_orcamento,
    legenda,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY REGEXP_REPLACE(nome_arquivo, '_[0-9]+\.[A-Za-z]+$', '')
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
  SELECT id FROM foto_base WHERE rn > 1
);
