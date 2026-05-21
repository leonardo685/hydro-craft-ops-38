
-- 1) Deterministic empresa selection
CREATE OR REPLACE FUNCTION public.get_user_empresa_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT empresa_id FROM public.user_empresas
  WHERE user_id = auth.uid()
  ORDER BY created_at ASC NULLS LAST, empresa_id ASC
  LIMIT 1
$$;

-- 2) Restrict convites_empresa SELECT (remove public listing)
DROP POLICY IF EXISTS "Convites válidos são públicos para cadastro" ON public.convites_empresa;

-- Remove the public empresas visibility tied to open invites
DROP POLICY IF EXISTS "Empresas com convites válidos são visíveis publicamente" ON public.empresas;

-- RPC to fetch a single invite by token (anon-safe)
CREATE OR REPLACE FUNCTION public.get_convite_by_token(p_token text)
RETURNS TABLE (
  id uuid,
  empresa_id uuid,
  role text,
  email text,
  expires_at timestamptz,
  empresa_nome text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT c.id, c.empresa_id, c.role::text, c.email, c.expires_at, e.nome AS empresa_nome
  FROM public.convites_empresa c
  JOIN public.empresas e ON e.id = c.empresa_id
  WHERE c.token = p_token
    AND c.used = false
    AND c.expires_at > now()
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.get_convite_by_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_convite_by_token(text) TO anon, authenticated;

-- 3) clientes_marketing: drop unrestricted public INSERT/UPDATE, route through RPC
DROP POLICY IF EXISTS "Permitir inserção pública em clientes_marketing" ON public.clientes_marketing;
DROP POLICY IF EXISTS "Permitir update público em clientes_marketing" ON public.clientes_marketing;
DROP POLICY IF EXISTS "Permitir select público em clientes_marketing" ON public.clientes_marketing;

-- RPC to register or update a public visitor entry tied to a real ordem_servico
CREATE OR REPLACE FUNCTION public.registrar_acesso_publico(
  p_numero_ordem text,
  p_telefone text,
  p_nome text DEFAULT NULL,
  p_empresa text DEFAULT NULL,
  p_ip text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_ordem_id uuid;
  v_cliente_id uuid;
  v_telefone_norm text;
BEGIN
  -- basic validation
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

  -- find the ordem (any matching one is enough; client picks correct ordem separately)
  SELECT id INTO v_ordem_id FROM public.ordens_servico
  WHERE numero_ordem = p_numero_ordem
  LIMIT 1;

  IF v_ordem_id IS NULL THEN
    RAISE EXCEPTION 'ordem não encontrada';
  END IF;

  v_telefone_norm := regexp_replace(p_telefone, '\D', '', 'g');
  v_telefone_norm := right(v_telefone_norm, 11);

  -- try to find existing client by normalized phone (last 11 digits)
  SELECT id INTO v_cliente_id FROM public.clientes_marketing
  WHERE right(regexp_replace(telefone, '\D', '', 'g'), 11) = v_telefone_norm
  LIMIT 1;

  IF v_cliente_id IS NOT NULL THEN
    UPDATE public.clientes_marketing
    SET numero_ordem = p_numero_ordem,
        ordem_servico_id = v_ordem_id,
        data_acesso = now(),
        ip_acesso = COALESCE(p_ip, ip_acesso),
        user_agent = COALESCE(p_user_agent, user_agent),
        nome = COALESCE(p_nome, nome),
        empresa = COALESCE(p_empresa, empresa)
    WHERE id = v_cliente_id;
  ELSE
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

REVOKE ALL ON FUNCTION public.registrar_acesso_publico(text,text,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.registrar_acesso_publico(text,text,text,text,text,text) TO anon, authenticated;

-- Check if visitor exists (returns minimal info: was found or not, name)
CREATE OR REPLACE FUNCTION public.buscar_cliente_marketing_por_telefone(p_telefone text)
RETURNS TABLE (id uuid, nome text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id, nome FROM public.clientes_marketing
  WHERE right(regexp_replace(telefone, '\D', '', 'g'), 11) = right(regexp_replace(p_telefone, '\D', '', 'g'), 11)
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.buscar_cliente_marketing_por_telefone(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.buscar_cliente_marketing_por_telefone(text) TO anon, authenticated;

-- 4) Lock down SECURITY DEFINER functions: revoke from anon where not needed
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_empresa_id() FROM anon;
REVOKE EXECUTE ON FUNCTION public.user_belongs_to_empresa(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.gerar_proximo_numero_ordem(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.limpar_itens_duplicados() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.registrar_atividade(text, text, text, text, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.atualizar_status_nota_fiscal(uuid) FROM anon, authenticated;
