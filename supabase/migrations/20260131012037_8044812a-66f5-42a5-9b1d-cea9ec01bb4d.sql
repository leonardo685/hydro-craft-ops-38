-- Preencher data_finalizacao para ordens já finalizadas que estão com o campo nulo
UPDATE ordens_servico 
SET data_finalizacao = updated_at 
WHERE status IN ('aguardando_retorno', 'faturado', 'finalizada') 
AND data_finalizacao IS NULL;