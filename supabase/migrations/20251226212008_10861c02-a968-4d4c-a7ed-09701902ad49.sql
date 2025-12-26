-- Adicionar coluna tipo_identificacao na tabela empresas
ALTER TABLE public.empresas 
ADD COLUMN IF NOT EXISTS tipo_identificacao text DEFAULT 'cnpj';

-- Adicionar comentário explicativo
COMMENT ON COLUMN public.empresas.tipo_identificacao IS 'Tipo de identificação da empresa: cnpj (Brasil) ou ein (EUA)';