CREATE OR REPLACE FUNCTION public.excluir_ordem_servico(p_ordem_id uuid, p_empresa_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT public.user_belongs_to_empresa(p_empresa_id) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  UPDATE public.orcamentos SET ordem_servico_id = NULL
   WHERE ordem_servico_id = p_ordem_id AND empresa_id = p_empresa_id;
  DELETE FROM public.ordens_servico WHERE id = p_ordem_id AND empresa_id = p_empresa_id RETURNING id INTO v_id;
  IF v_id IS NULL THEN RAISE EXCEPTION 'Ordem não encontrada'; END IF;
  RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.excluir_ordem_servico(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.excluir_ordem_servico(uuid, uuid) TO authenticated;