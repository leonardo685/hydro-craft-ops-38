ALTER TABLE public.orcamentos DROP CONSTRAINT orcamentos_numero_key;
ALTER TABLE public.orcamentos ADD CONSTRAINT orcamentos_numero_empresa_key UNIQUE (numero, empresa_id);