
-- 1. Lock down clientes_marketing direct INSERT (public RPC handles anon flow via SECURITY DEFINER)
DROP POLICY IF EXISTS "Usuários criam clientes marketing na sua empresa" ON public.clientes_marketing;
CREATE POLICY "Usuários criam clientes marketing na sua empresa"
ON public.clientes_marketing
FOR INSERT
TO authenticated
WITH CHECK (empresa_id = get_user_empresa_id());

-- 2. Restrict convites_empresa UPDATE to invites belonging to caller's empresa
DROP POLICY IF EXISTS "Usuários podem marcar convite como usado" ON public.convites_empresa;
CREATE POLICY "Owners marcam convites usados"
ON public.convites_empresa
FOR UPDATE
TO authenticated
USING (
  used = false
  AND expires_at > now()
  AND EXISTS (
    SELECT 1 FROM public.user_empresas
    WHERE user_empresas.empresa_id = convites_empresa.empresa_id
      AND user_empresas.user_id = auth.uid()
      AND user_empresas.is_owner = true
  )
)
WITH CHECK (used = true);

-- 3. Remove broad public exposure of empresas; expose only safe public fields via RPC
DROP POLICY IF EXISTS "Acesso público ao logo das empresas" ON public.empresas;

CREATE OR REPLACE FUNCTION public.get_empresa_public_info(p_empresa_id uuid)
RETURNS TABLE (
  logo_url text,
  razao_social text,
  nome text,
  cnpj text,
  telefone text,
  email text,
  tipo_identificacao text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT logo_url, razao_social, nome, cnpj, telefone, email, tipo_identificacao
  FROM public.empresas
  WHERE id = p_empresa_id
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.get_empresa_public_info(uuid) TO anon, authenticated;
