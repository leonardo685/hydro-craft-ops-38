ALTER TABLE public.clientes DROP CONSTRAINT IF EXISTS clientes_cnpj_cpf_unique;

CREATE UNIQUE INDEX IF NOT EXISTS clientes_empresa_cnpj_cpf_unique
  ON public.clientes (empresa_id, cnpj_cpf)
  WHERE cnpj_cpf IS NOT NULL AND btrim(cnpj_cpf) <> '';