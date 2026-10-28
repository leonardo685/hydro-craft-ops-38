CREATE OR REPLACE FUNCTION public.excluir_orcamento_rejeitado(p_orcamento_id uuid, p_empresa_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_status text;
  v_deleted uuid;
BEGIN
  SELECT status INTO v_status FROM public.orcamentos
  WHERE id = p_orcamento_id AND empresa_id = p_empresa_id FOR UPDATE;
  IF NOT FOUND OR v_status <> 'rejeitado' THEN
    RAISE EXCEPTION 'Orçamento rejeitado não encontrado ou sem permissão.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.contas_receber WHERE orcamento_id = p_orcamento_id AND empresa_id = p_empresa_id)
    OR EXISTS (SELECT 1 FROM public.pagamentos_stripe WHERE orcamento_id = p_orcamento_id AND empresa_id = p_empresa_id) THEN
    RAISE EXCEPTION 'Este orçamento possui registros financeiros vinculados e não pode ser apagado.';
  END IF;
  UPDATE public.ordens_servico SET orcamento_id = NULL
  WHERE orcamento_id = p_orcamento_id AND empresa_id = p_empresa_id;
  DELETE FROM public.orcamentos
  WHERE id = p_orcamento_id AND empresa_id = p_empresa_id AND status = 'rejeitado'
  RETURNING id INTO v_deleted;
  IF v_deleted IS NULL THEN
    RAISE EXCEPTION 'Não foi possível apagar o orçamento.';
  END IF;
  RETURN v_deleted;
END;
$$;
REVOKE ALL ON FUNCTION public.excluir_orcamento_rejeitado(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.excluir_orcamento_rejeitado(uuid, uuid) TO authenticated;