UPDATE public.testes_equipamentos t
SET empresa_id = o.empresa_id
FROM public.ordens_servico o
WHERE t.ordem_servico_id = o.id
  AND t.empresa_id IS NULL
  AND o.empresa_id IS NOT NULL;