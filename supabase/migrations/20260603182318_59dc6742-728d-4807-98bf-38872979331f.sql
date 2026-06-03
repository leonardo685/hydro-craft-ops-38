ALTER TABLE public.fornecedores
  ADD COLUMN IF NOT EXISTS whatsapp text,
  ADD COLUMN IF NOT EXISTS email_cotacao text,
  ADD COLUMN IF NOT EXISTS prazo_pagamento_padrao_dias integer DEFAULT 28,
  ADD COLUMN IF NOT EXISTS rating smallint,
  ADD COLUMN IF NOT EXISTS categorias text[] DEFAULT '{}';