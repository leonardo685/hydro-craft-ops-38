-- 1) cotacoes (cria tabela + grants + RLS; policies que referenciam outras tabelas vêm depois)
CREATE TABLE public.cotacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  numero text NOT NULL,
  status text NOT NULL DEFAULT 'aberta',
  observacoes text,
  prazo_resposta date,
  criado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_cotacoes_empresa ON public.cotacoes(empresa_id);
GRANT SELECT ON public.cotacoes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cotacoes TO authenticated;
GRANT ALL ON public.cotacoes TO service_role;
ALTER TABLE public.cotacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cotacoes_select_empresa" ON public.cotacoes FOR SELECT TO authenticated
  USING (public.user_belongs_to_empresa(empresa_id));
CREATE POLICY "cotacoes_insert_empresa" ON public.cotacoes FOR INSERT TO authenticated
  WITH CHECK (public.user_belongs_to_empresa(empresa_id));
CREATE POLICY "cotacoes_update_empresa" ON public.cotacoes FOR UPDATE TO authenticated
  USING (public.user_belongs_to_empresa(empresa_id));
CREATE POLICY "cotacoes_delete_empresa" ON public.cotacoes FOR DELETE TO authenticated
  USING (public.user_belongs_to_empresa(empresa_id));
CREATE TRIGGER trg_cotacoes_updated BEFORE UPDATE ON public.cotacoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) cotacao_itens
CREATE TABLE public.cotacao_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cotacao_id uuid NOT NULL REFERENCES public.cotacoes(id) ON DELETE CASCADE,
  ordem_servico_id uuid REFERENCES public.ordens_servico(id) ON DELETE SET NULL,
  tipo text NOT NULL DEFAULT 'peca',
  descricao text NOT NULL,
  quantidade numeric NOT NULL DEFAULT 1,
  unidade text DEFAULT 'un',
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_cotacao_itens_cotacao ON public.cotacao_itens(cotacao_id);
GRANT SELECT ON public.cotacao_itens TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cotacao_itens TO authenticated;
GRANT ALL ON public.cotacao_itens TO service_role;
ALTER TABLE public.cotacao_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cotacao_itens_select_empresa" ON public.cotacao_itens FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cotacoes c WHERE c.id = cotacao_id AND public.user_belongs_to_empresa(c.empresa_id)));
CREATE POLICY "cotacao_itens_modify_empresa" ON public.cotacao_itens FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cotacoes c WHERE c.id = cotacao_id AND public.user_belongs_to_empresa(c.empresa_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.cotacoes c WHERE c.id = cotacao_id AND public.user_belongs_to_empresa(c.empresa_id)));
CREATE POLICY "cotacao_itens_select_publico" ON public.cotacao_itens FOR SELECT TO anon USING (true);

-- 3) cotacao_fornecedores
CREATE TABLE public.cotacao_fornecedores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cotacao_id uuid NOT NULL REFERENCES public.cotacoes(id) ON DELETE CASCADE,
  fornecedor_id uuid REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  fornecedor_nome text NOT NULL,
  fornecedor_email text,
  fornecedor_whatsapp text,
  token_publico text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  enviado_em timestamptz,
  respondido_em timestamptz,
  observacao_resposta text,
  prazo_pagamento_dias int,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_cotacao_forn_cotacao ON public.cotacao_fornecedores(cotacao_id);
CREATE INDEX idx_cotacao_forn_token ON public.cotacao_fornecedores(token_publico);
GRANT SELECT, UPDATE ON public.cotacao_fornecedores TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cotacao_fornecedores TO authenticated;
GRANT ALL ON public.cotacao_fornecedores TO service_role;
ALTER TABLE public.cotacao_fornecedores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cotacao_forn_select_empresa" ON public.cotacao_fornecedores FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cotacoes c WHERE c.id = cotacao_id AND public.user_belongs_to_empresa(c.empresa_id)));
CREATE POLICY "cotacao_forn_modify_empresa" ON public.cotacao_fornecedores FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cotacoes c WHERE c.id = cotacao_id AND public.user_belongs_to_empresa(c.empresa_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.cotacoes c WHERE c.id = cotacao_id AND public.user_belongs_to_empresa(c.empresa_id)));
CREATE POLICY "cotacao_forn_select_publico" ON public.cotacao_fornecedores FOR SELECT TO anon USING (true);
CREATE POLICY "cotacao_forn_update_publico" ON public.cotacao_fornecedores FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- 4) cotacao_propostas
CREATE TABLE public.cotacao_propostas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cotacao_fornecedor_id uuid NOT NULL REFERENCES public.cotacao_fornecedores(id) ON DELETE CASCADE,
  cotacao_item_id uuid NOT NULL REFERENCES public.cotacao_itens(id) ON DELETE CASCADE,
  preco_unitario numeric,
  prazo_entrega_dias int,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cotacao_fornecedor_id, cotacao_item_id)
);
CREATE INDEX idx_propostas_forn ON public.cotacao_propostas(cotacao_fornecedor_id);
GRANT SELECT, INSERT, UPDATE ON public.cotacao_propostas TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cotacao_propostas TO authenticated;
GRANT ALL ON public.cotacao_propostas TO service_role;
ALTER TABLE public.cotacao_propostas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "propostas_select_empresa" ON public.cotacao_propostas FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.cotacao_fornecedores cf
    JOIN public.cotacoes c ON c.id = cf.cotacao_id
    WHERE cf.id = cotacao_fornecedor_id AND public.user_belongs_to_empresa(c.empresa_id)
  ));
CREATE POLICY "propostas_modify_empresa" ON public.cotacao_propostas FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.cotacao_fornecedores cf
    JOIN public.cotacoes c ON c.id = cf.cotacao_id
    WHERE cf.id = cotacao_fornecedor_id AND public.user_belongs_to_empresa(c.empresa_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.cotacao_fornecedores cf
    JOIN public.cotacoes c ON c.id = cf.cotacao_id
    WHERE cf.id = cotacao_fornecedor_id AND public.user_belongs_to_empresa(c.empresa_id)
  ));
CREATE POLICY "propostas_select_publico" ON public.cotacao_propostas FOR SELECT TO anon USING (true);
CREATE POLICY "propostas_insert_publico" ON public.cotacao_propostas FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "propostas_update_publico" ON public.cotacao_propostas FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE TRIGGER trg_propostas_updated BEFORE UPDATE ON public.cotacao_propostas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) Policy pública para cotacoes (agora que cotacao_fornecedores existe)
CREATE POLICY "cotacoes_select_publico" ON public.cotacoes FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.cotacao_fornecedores cf WHERE cf.cotacao_id = cotacoes.id));

-- 6) Função para gerar próximo número de cotação por empresa (COT-XXX-YY)
CREATE OR REPLACE FUNCTION public.gerar_proximo_numero_cotacao(p_empresa_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ano_atual text;
  maior integer;
BEGIN
  ano_atual := to_char(now(), 'YY');
  SELECT COALESCE(MAX(
    CASE WHEN numero ~ ('^COT-\d+-' || ano_atual || '$')
      THEN (regexp_match(numero, 'COT-(\d+)-'))[1]::integer
      ELSE 0 END
  ), 0) INTO maior
  FROM public.cotacoes
  WHERE empresa_id = p_empresa_id AND numero LIKE 'COT-%-' || ano_atual;
  RETURN 'COT-' || lpad((maior + 1)::text, 3, '0') || '-' || ano_atual;
END;
$$;