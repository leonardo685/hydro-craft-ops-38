ALTER TABLE public.cotacao_propostas
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'peca',
  ADD COLUMN IF NOT EXISTS descricao_alternativa text;

ALTER TABLE public.cotacao_propostas
  DROP CONSTRAINT IF EXISTS cotacao_propostas_tipo_check;
ALTER TABLE public.cotacao_propostas
  ADD CONSTRAINT cotacao_propostas_tipo_check CHECK (tipo IN ('peca','usinagem'));