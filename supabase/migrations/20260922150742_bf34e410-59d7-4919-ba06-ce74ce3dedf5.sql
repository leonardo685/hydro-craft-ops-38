ALTER TABLE public.ordens_servico
  ADD COLUMN IF NOT EXISTS laudo_tecnico text,
  ADD COLUMN IF NOT EXISTS laudo_tecnico_en text;