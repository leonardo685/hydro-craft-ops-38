ALTER TABLE public.orcamentos ADD COLUMN IF NOT EXISTS custos_cilindros jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.orcamentos ADD COLUMN IF NOT EXISTS total_custos_cilindros numeric NOT NULL DEFAULT 0;
ALTER TABLE public.historico_precificacao ADD COLUMN IF NOT EXISTS custos_cilindros jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.historico_precificacao ADD COLUMN IF NOT EXISTS total_custos_cilindros numeric NOT NULL DEFAULT 0;