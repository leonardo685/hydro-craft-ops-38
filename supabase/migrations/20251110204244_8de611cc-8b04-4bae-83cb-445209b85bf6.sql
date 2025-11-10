-- Corrigir formato da ordem_referencia removendo zeros à esquerda antes do LPAD
-- Exemplo: "0021/25" deve virar "MH-021-25" e não "MH-002-25"
UPDATE orcamentos
SET ordem_referencia = CONCAT(
  'MH-',
  LPAD(LTRIM(SPLIT_PART(numero, '/', 1), '0'), 3, '0'),
  '-',
  SPLIT_PART(numero, '/', 2)
)
WHERE ordem_referencia IS NOT NULL AND numero IS NOT NULL;