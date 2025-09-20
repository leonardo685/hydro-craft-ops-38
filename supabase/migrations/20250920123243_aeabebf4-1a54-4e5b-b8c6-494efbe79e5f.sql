-- Add 'faturado' status to the check constraint for ordens_servico
ALTER TABLE public.ordens_servico DROP CONSTRAINT IF EXISTS ordens_servico_status_check;

ALTER TABLE public.ordens_servico ADD CONSTRAINT ordens_servico_status_check 
CHECK (status IN ('em_andamento', 'concluida', 'cancelada', 'pendente', 'aprovada', 'aguardando_retorno', 'faturado'));