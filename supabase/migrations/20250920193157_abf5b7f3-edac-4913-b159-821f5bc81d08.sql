-- Verificar a constraint de status atual
SELECT conname, consrc 
FROM pg_constraint 
WHERE conrelid = 'ordens_servico'::regclass AND contype = 'c';

-- Remover a constraint atual se existir
ALTER TABLE ordens_servico DROP CONSTRAINT IF EXISTS ordens_servico_status_check;

-- Adicionar a nova constraint com todos os status necessários
ALTER TABLE ordens_servico 
ADD CONSTRAINT ordens_servico_status_check 
CHECK (status IN ('pendente', 'em_andamento', 'aprovada', 'em_producao', 'em_teste', 'aguardando_retorno', 'faturado', 'rejeitada', 'finalizada'));