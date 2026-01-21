-- Limpar TODAS as fotos duplicadas de orçamentos
-- Agrupa por orcamento_id + padrão base do nome do arquivo e mantém apenas uma

WITH foto_base AS (
  SELECT 
    id,
    orcamento_id,
    REGEXP_REPLACE(nome_arquivo, '_[0-9]+\.[A-Za-z]+$', '') as foto_pattern,
    apresentar_orcamento,
    legenda,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY orcamento_id, REGEXP_REPLACE(nome_arquivo, '_[0-9]+\.[A-Za-z]+$', '')
      ORDER BY 
        CASE WHEN apresentar_orcamento = true THEN 0 ELSE 1 END,
        CASE WHEN legenda IS NOT NULL AND legenda != '' THEN 0 ELSE 1 END,
        created_at ASC
    ) as rn
  FROM fotos_orcamento
)
DELETE FROM fotos_orcamento
WHERE id IN (
  SELECT id FROM foto_base WHERE rn > 1
);

-- Limpar fotos duplicadas de ordens de serviço (fotos_equipamentos)
WITH foto_os_base AS (
  SELECT 
    id,
    ordem_servico_id,
    REGEXP_REPLACE(nome_arquivo, '_[0-9]+\.[A-Za-z]+$', '') as foto_pattern,
    apresentar_orcamento,
    legenda,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY ordem_servico_id, REGEXP_REPLACE(nome_arquivo, '_[0-9]+\.[A-Za-z]+$', '')
      ORDER BY 
        CASE WHEN apresentar_orcamento = true THEN 0 ELSE 1 END,
        CASE WHEN legenda IS NOT NULL AND legenda != '' THEN 0 ELSE 1 END,
        created_at ASC
    ) as rn
  FROM fotos_equipamentos
  WHERE ordem_servico_id IS NOT NULL
)
DELETE FROM fotos_equipamentos
WHERE id IN (
  SELECT id FROM foto_os_base WHERE rn > 1
);