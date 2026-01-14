-- Adicionar campo descricao_nfe na tabela recebimentos
-- Este campo armazena a descrição do equipamento que vem da nota fiscal (imutável)
ALTER TABLE public.recebimentos ADD COLUMN IF NOT EXISTS descricao_nfe TEXT;