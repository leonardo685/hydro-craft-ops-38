-- Update the status check constraint to include 'aguardando_retorno'
ALTER TABLE public.ordens_servico 
DROP CONSTRAINT ordens_servico_status_check;

ALTER TABLE public.ordens_servico 
ADD CONSTRAINT ordens_servico_status_check 
CHECK (status = ANY (ARRAY['pendente'::text, 'aprovada'::text, 'em_producao'::text, 'em_teste'::text, 'aguardando_retorno'::text, 'finalizada'::text, 'entregue'::text, 'rejeitada'::text]));