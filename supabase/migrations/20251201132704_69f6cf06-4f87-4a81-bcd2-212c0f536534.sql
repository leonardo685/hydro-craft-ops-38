-- Migração única: Inserir ordens aprovadas existentes na tabela compras
INSERT INTO public.compras (ordem_servico_id, status, created_at)
SELECT 
  id, 
  'aprovado'::text,
  created_at
FROM public.ordens_servico
WHERE status = 'aprovada'
  AND pecas_necessarias IS NOT NULL
  AND jsonb_array_length(pecas_necessarias) > 0
  AND id NOT IN (SELECT ordem_servico_id FROM public.compras WHERE ordem_servico_id IS NOT NULL);