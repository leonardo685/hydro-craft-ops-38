-- Corrigir números de ordens de serviço com formato incorreto (OS-[timestamp])
-- Atualizar para usar o número do recebimento associado (MH-XXX-YY)
UPDATE ordens_servico os
SET numero_ordem = r.numero_ordem
FROM recebimentos r
WHERE os.recebimento_id = r.id
  AND os.numero_ordem LIKE 'OS-%'
  AND os.numero_ordem ~ '^OS-[0-9]+$';