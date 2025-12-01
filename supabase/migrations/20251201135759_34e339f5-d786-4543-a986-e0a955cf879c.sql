-- Corrigir ordens de serviço com formato antigo OS-XXXXX para usar numero_ordem correto do recebimento
UPDATE public.ordens_servico os
SET numero_ordem = r.numero_ordem
FROM public.recebimentos r
WHERE os.recebimento_id = r.id
  AND os.numero_ordem LIKE 'OS-%'
  AND r.numero_ordem IS NOT NULL
  AND r.numero_ordem != '';