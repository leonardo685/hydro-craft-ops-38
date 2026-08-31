CREATE OR REPLACE FUNCTION public.buscar_cliente_marketing_por_telefone(p_telefone text)
RETURNS TABLE(id uuid, nome text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, nome FROM public.clientes_marketing
  WHERE right(regexp_replace(telefone, '\D', '', 'g'), 10) = right(regexp_replace(p_telefone, '\D', '', 'g'), 10)
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.registrar_acesso_publico(
  p_numero_ordem text,
  p_telefone text,
  p_nome text DEFAULT NULL::text,
  p_empresa text DEFAULT NULL::text,
  p_ip text DEFAULT NULL::text,
  p_user_agent text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ordem_id uuid;
  v_cliente_id uuid;
  v_telefone_norm text;
BEGIN
  IF p_numero_ordem IS NULL OR length(p_numero_ordem) > 50 THEN
    RAISE EXCEPTION 'numero_ordem inválido';
  END IF;
  IF p_telefone IS NULL OR length(p_telefone) > 30 THEN
    RAISE EXCEPTION 'telefone inválido';
  END IF;
  IF p_nome IS NOT NULL AND length(p_nome) > 100 THEN
    RAISE EXCEPTION 'nome muito longo';
  END IF;
  IF p_empresa IS NOT NULL AND length(p_empresa) > 100 THEN
    RAISE EXCEPTION 'empresa muito longa';
  END IF;

  SELECT id INTO v_ordem_id FROM public.ordens_servico
  WHERE numero_ordem = p_numero_ordem
  LIMIT 1;

  v_telefone_norm := right(regexp_replace(p_telefone, '\D', '', 'g'), 10);

  SELECT id INTO v_cliente_id FROM public.clientes_marketing
  WHERE right(regexp_replace(telefone, '\D', '', 'g'), 10) = v_telefone_norm
  LIMIT 1;

  IF v_cliente_id IS NOT NULL THEN
    UPDATE public.clientes_marketing
    SET numero_ordem = p_numero_ordem,
        ordem_servico_id = COALESCE(v_ordem_id, ordem_servico_id),
        data_acesso = now(),
        ip_acesso = COALESCE(p_ip, ip_acesso),
        user_agent = COALESCE(p_user_agent, user_agent),
        nome = COALESCE(NULLIF(p_nome, ''), nome),
        empresa = COALESCE(NULLIF(p_empresa, ''), empresa)
    WHERE id = v_cliente_id;
  ELSE
    IF v_ordem_id IS NULL THEN
      RAISE EXCEPTION 'ordem não encontrada';
    END IF;
    INSERT INTO public.clientes_marketing (
      ordem_servico_id, numero_ordem, nome, empresa, telefone, ip_acesso, user_agent, data_acesso
    ) VALUES (
      v_ordem_id, p_numero_ordem, COALESCE(p_nome,''), COALESCE(p_empresa,''),
      p_telefone, p_ip, p_user_agent, now()
    )
    RETURNING id INTO v_cliente_id;
  END IF;

  RETURN v_cliente_id;
END;
$$;