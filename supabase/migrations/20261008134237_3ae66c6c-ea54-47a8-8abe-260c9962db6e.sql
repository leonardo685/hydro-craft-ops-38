ALTER TABLE public.clientes
ADD COLUMN tax_exempt boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.clientes.tax_exempt IS 'Indica que o cliente dos EUA é isento de sales tax nos orçamentos.';