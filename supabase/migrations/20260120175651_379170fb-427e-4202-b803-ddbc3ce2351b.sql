-- Adicionar colunas de dados técnicos à tabela ordens_servico
ALTER TABLE public.ordens_servico ADD COLUMN IF NOT EXISTS camisa TEXT;
ALTER TABLE public.ordens_servico ADD COLUMN IF NOT EXISTS haste_comprimento TEXT;
ALTER TABLE public.ordens_servico ADD COLUMN IF NOT EXISTS curso TEXT;
ALTER TABLE public.ordens_servico ADD COLUMN IF NOT EXISTS conexao_a TEXT;
ALTER TABLE public.ordens_servico ADD COLUMN IF NOT EXISTS conexao_b TEXT;
ALTER TABLE public.ordens_servico ADD COLUMN IF NOT EXISTS pressao_trabalho TEXT;
ALTER TABLE public.ordens_servico ADD COLUMN IF NOT EXISTS temperatura_trabalho TEXT;
ALTER TABLE public.ordens_servico ADD COLUMN IF NOT EXISTS fluido_trabalho TEXT;
ALTER TABLE public.ordens_servico ADD COLUMN IF NOT EXISTS local_instalacao TEXT;
ALTER TABLE public.ordens_servico ADD COLUMN IF NOT EXISTS potencia TEXT;
ALTER TABLE public.ordens_servico ADD COLUMN IF NOT EXISTS numero_serie TEXT;
ALTER TABLE public.ordens_servico ADD COLUMN IF NOT EXISTS ambiente_trabalho TEXT;
ALTER TABLE public.ordens_servico ADD COLUMN IF NOT EXISTS categoria_equipamento TEXT;