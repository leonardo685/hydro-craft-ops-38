-- Reverter status da ordem MH-007-26 para que apareça novamente na lista de produção
UPDATE ordens_servico 
SET status = 'em_teste', updated_at = now()
WHERE id = '49c6af2d-0024-4935-a129-afca65b7f858';