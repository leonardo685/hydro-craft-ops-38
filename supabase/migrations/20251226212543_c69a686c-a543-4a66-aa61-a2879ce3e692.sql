-- Adicionar coluna tipo_identificacao nas tabelas clientes e fornecedores
ALTER TABLE public.clientes 
ADD COLUMN IF NOT EXISTS tipo_identificacao text DEFAULT 'cnpj';

ALTER TABLE public.fornecedores 
ADD COLUMN IF NOT EXISTS tipo_identificacao text DEFAULT 'cnpj';

-- Adicionar comentários
COMMENT ON COLUMN public.clientes.tipo_identificacao IS 'Tipo de identificação: cnpj (Brasil) ou ein (EUA)';
COMMENT ON COLUMN public.fornecedores.tipo_identificacao IS 'Tipo de identificação: cnpj (Brasil) ou ein (EUA)';