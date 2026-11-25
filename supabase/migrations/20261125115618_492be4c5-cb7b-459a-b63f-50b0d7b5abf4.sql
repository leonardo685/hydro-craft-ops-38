CREATE OR REPLACE FUNCTION public.excluir_orcamento_sem_financeiro(p_orcamento_id uuid, p_empresa_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_deleted uuid;
BEGIN
  SELECT id INTO v_deleted
  FROM public.orcamentos
  WHERE id = p_orcamento_id AND empresa_id = p_empresa_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quote not found or you do not have permission to delete it.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.contas_receber
    WHERE orcamento_id = p_orcamento_id AND empresa_id = p_empresa_id
  ) OR EXISTS (
    SELECT 1 FROM public.pagamentos_stripe
    WHERE orcamento_id = p_orcamento_id AND empresa_id = p_empresa_id
  ) THEN
    RAISE EXCEPTION 'This quote has linked financial records and cannot be deleted.';
  END IF;

  UPDATE public.ordens_servico
  SET orcamento_id = NULL
  WHERE orcamento_id = p_orcamento_id AND empresa_id = p_empresa_id;

  DELETE FROM public.orcamentos
  WHERE id = p_orcamento_id AND empresa_id = p_empresa_id
  RETURNING id INTO v_deleted;

  IF v_deleted IS NULL THEN
    RAISE EXCEPTION 'The quote could not be deleted.';
  END IF;

  RETURN v_deleted;
END;
$$;

REVOKE ALL ON FUNCTION public.excluir_orcamento_sem_financeiro(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.excluir_orcamento_sem_financeiro(uuid, uuid) TO authenticated;