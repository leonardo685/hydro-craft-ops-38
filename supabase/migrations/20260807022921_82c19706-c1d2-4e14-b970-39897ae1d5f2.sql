-- Helper: token público enviado pelo cliente no header x-cotacao-token
CREATE OR REPLACE FUNCTION public.cotacao_token_atual()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT nullif(current_setting('request.headers', true)::json ->> 'x-cotacao-token', '')
$$;

-- Helper (security definer): id da cotação vinculada ao token
CREATE OR REPLACE FUNCTION public.cotacao_id_por_token()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cf.cotacao_id
  FROM public.cotacao_fornecedores cf
  WHERE cf.token_publico = public.cotacao_token_atual()
  LIMIT 1
$$;

-- Helper (security definer): id do cotacao_fornecedores vinculado ao token
CREATE OR REPLACE FUNCTION public.cotacao_fornecedor_id_por_token()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cf.id
  FROM public.cotacao_fornecedores cf
  WHERE cf.token_publico = public.cotacao_token_atual()
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.cotacao_token_atual() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cotacao_id_por_token() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cotacao_fornecedor_id_por_token() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cotacao_token_atual() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cotacao_id_por_token() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cotacao_fornecedor_id_por_token() TO anon, authenticated, service_role;

-- cotacao_fornecedores: só a própria linha do token
DROP POLICY IF EXISTS cotacao_forn_select_publico ON public.cotacao_fornecedores;
CREATE POLICY cotacao_forn_select_publico
ON public.cotacao_fornecedores FOR SELECT TO anon
USING (token_publico = public.cotacao_token_atual());

DROP POLICY IF EXISTS cotacao_forn_update_publico ON public.cotacao_fornecedores;
CREATE POLICY cotacao_forn_update_publico
ON public.cotacao_fornecedores FOR UPDATE TO anon
USING (token_publico = public.cotacao_token_atual())
WITH CHECK (token_publico = public.cotacao_token_atual());

-- cotacoes: só a cotação do token
DROP POLICY IF EXISTS cotacoes_select_publico ON public.cotacoes;
CREATE POLICY cotacoes_select_publico
ON public.cotacoes FOR SELECT TO anon
USING (id = public.cotacao_id_por_token());

-- cotacao_itens: só itens da cotação do token
DROP POLICY IF EXISTS cotacao_itens_select_publico ON public.cotacao_itens;
CREATE POLICY cotacao_itens_select_publico
ON public.cotacao_itens FOR SELECT TO anon
USING (cotacao_id = public.cotacao_id_por_token());

-- cotacao_propostas: só propostas do fornecedor do token
DROP POLICY IF EXISTS propostas_select_publico ON public.cotacao_propostas;
CREATE POLICY propostas_select_publico
ON public.cotacao_propostas FOR SELECT TO anon
USING (cotacao_fornecedor_id = public.cotacao_fornecedor_id_por_token());

DROP POLICY IF EXISTS propostas_insert_publico ON public.cotacao_propostas;
CREATE POLICY propostas_insert_publico
ON public.cotacao_propostas FOR INSERT TO anon
WITH CHECK (cotacao_fornecedor_id = public.cotacao_fornecedor_id_por_token());

DROP POLICY IF EXISTS propostas_update_publico ON public.cotacao_propostas;
CREATE POLICY propostas_update_publico
ON public.cotacao_propostas FOR UPDATE TO anon
USING (cotacao_fornecedor_id = public.cotacao_fornecedor_id_por_token())
WITH CHECK (cotacao_fornecedor_id = public.cotacao_fornecedor_id_por_token());