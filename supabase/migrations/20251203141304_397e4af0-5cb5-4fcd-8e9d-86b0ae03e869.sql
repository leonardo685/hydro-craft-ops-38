-- Corrigir ordem MH-063-25 que pulou a etapa de faturamento
UPDATE ordens_servico 
SET status = 'aguardando_retorno', updated_at = now()
WHERE id = 'c6a267d2-b89b-4580-9e03-309e4db2a65d';