-- Reverter ordem MH-064-25 para aguardando_retorno
UPDATE ordens_servico 
SET status = 'aguardando_retorno', updated_at = now()
WHERE numero_ordem = 'MH-064-25';