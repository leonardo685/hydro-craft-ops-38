-- Número da ordem informado pela página pública (header x-ordem-numero)
CREATE OR REPLACE FUNCTION public.ordem_publica_numero()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT nullif(current_setting('request.headers', true)::json ->> 'x-ordem-numero', '')
$$;

-- Equipamento da ordem informada (para permitir o histórico do mesmo equipamento)
CREATE OR REPLACE FUNCTION public.ordem_publica_equipamento()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.equipamento
  FROM public.ordens_servico o
  WHERE public.ordem_publica_numero() IS NOT NULL
    AND o.numero_ordem = public.ordem_publica_numero()
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.ordem_publica_numero() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ordem_publica_equipamento() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ordem_publica_numero() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ordem_publica_equipamento() TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Acesso público às ordens por numero_ordem" ON public.ordens_servico;

CREATE POLICY "Acesso público às ordens por numero_ordem"
ON public.ordens_servico FOR SELECT TO anon
USING (
  public.ordem_publica_numero() IS NOT NULL
  AND (
    numero_ordem = public.ordem_publica_numero()
    OR equipamento = public.ordem_publica_equipamento()
  )
);

CREATE POLICY "Usuários veem ordens da sua empresa"
ON public.ordens_servico FOR SELECT TO authenticated
USING (public.user_belongs_to_empresa(empresa_id));