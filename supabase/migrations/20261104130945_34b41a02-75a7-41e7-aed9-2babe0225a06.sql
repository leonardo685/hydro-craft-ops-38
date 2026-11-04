CREATE TABLE public.precificacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL,
  cliente_nome TEXT NOT NULL,
  produto TEXT,
  descricao TEXT,
  preco_desejado NUMERIC NOT NULL DEFAULT 0,
  desconto_percentual NUMERIC NOT NULL DEFAULT 0,
  impostos_percentual NUMERIC NOT NULL DEFAULT 16,
  impostos_valor NUMERIC NOT NULL DEFAULT 0,
  comissao_percentual NUMERIC NOT NULL DEFAULT 0,
  comissao_valor NUMERIC NOT NULL DEFAULT 0,
  percentuais_customizados JSONB NOT NULL DEFAULT '[]'::jsonb,
  custos_variaveis JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_custos_variaveis NUMERIC NOT NULL DEFAULT 0,
  custos_cilindros JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_custos_cilindros NUMERIC NOT NULL DEFAULT 0,
  margem_contribuicao NUMERIC NOT NULL DEFAULT 0,
  percentual_margem NUMERIC NOT NULL DEFAULT 0,
  precificacao_lucro_real JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.precificacoes TO authenticated;
GRANT ALL ON public.precificacoes TO service_role;

ALTER TABLE public.precificacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem precificações da sua empresa" ON public.precificacoes FOR SELECT TO authenticated USING (empresa_id = get_user_empresa_id());
CREATE POLICY "Usuários criam precificações na sua empresa" ON public.precificacoes FOR INSERT TO authenticated WITH CHECK (empresa_id = get_user_empresa_id());
CREATE POLICY "Usuários atualizam precificações da sua empresa" ON public.precificacoes FOR UPDATE TO authenticated USING (empresa_id = get_user_empresa_id());
CREATE POLICY "Usuários deletam precificações da sua empresa" ON public.precificacoes FOR DELETE TO authenticated USING (empresa_id = get_user_empresa_id());

CREATE OR REPLACE FUNCTION public.update_precificacoes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_precificacoes_updated_at BEFORE UPDATE ON public.precificacoes FOR EACH ROW EXECUTE FUNCTION public.update_precificacoes_updated_at();