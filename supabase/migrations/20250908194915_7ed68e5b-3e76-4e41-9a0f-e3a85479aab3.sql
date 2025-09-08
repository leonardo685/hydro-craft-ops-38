-- Adicionar campos para serviços e usinagens na tabela ordens_servico
ALTER TABLE public.ordens_servico 
ADD COLUMN servicos_necessarios JSONB DEFAULT '[]'::jsonb,
ADD COLUMN usinagem_necessaria JSONB DEFAULT '[]'::jsonb;