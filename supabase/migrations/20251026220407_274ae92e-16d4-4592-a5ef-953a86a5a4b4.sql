-- Adicionar coluna modelo_gestao à tabela metas_gastos
ALTER TABLE metas_gastos 
ADD COLUMN modelo_gestao text NOT NULL DEFAULT 'realizado';

-- Adicionar comentário explicativo
COMMENT ON COLUMN metas_gastos.modelo_gestao IS 'Modelo de gestão: dre, esperado ou realizado';