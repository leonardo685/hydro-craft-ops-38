-- Remover a constraint única global do código
ALTER TABLE public.categorias_financeiras DROP CONSTRAINT IF EXISTS categorias_financeiras_codigo_key;

-- Criar uma constraint única composta por empresa_id e codigo
CREATE UNIQUE INDEX IF NOT EXISTS categorias_financeiras_empresa_codigo_unique 
ON public.categorias_financeiras (empresa_id, codigo);