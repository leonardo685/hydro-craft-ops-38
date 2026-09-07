CREATE TABLE public.pagamentos_stripe (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  orcamento_id uuid NOT NULL REFERENCES public.orcamentos(id) ON DELETE CASCADE,
  stripe_session_id text NOT NULL UNIQUE,
  stripe_payment_intent_id text,
  checkout_url text,
  valor numeric NOT NULL,
  moeda text NOT NULL DEFAULT 'usd',
  status text NOT NULL DEFAULT 'pendente',
  metodo text,
  cliente_email text,
  paid_at timestamp with time zone,
  lancamento_id uuid REFERENCES public.lancamentos_financeiros(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pagamentos_stripe TO authenticated;
GRANT ALL ON public.pagamentos_stripe TO service_role;

ALTER TABLE public.pagamentos_stripe ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pagamentos_stripe_select" ON public.pagamentos_stripe
  FOR SELECT TO authenticated
  USING (public.user_belongs_to_empresa(empresa_id));

CREATE POLICY "pagamentos_stripe_insert" ON public.pagamentos_stripe
  FOR INSERT TO authenticated
  WITH CHECK (public.user_belongs_to_empresa(empresa_id));

CREATE POLICY "pagamentos_stripe_update" ON public.pagamentos_stripe
  FOR UPDATE TO authenticated
  USING (public.user_belongs_to_empresa(empresa_id));

CREATE POLICY "pagamentos_stripe_delete" ON public.pagamentos_stripe
  FOR DELETE TO authenticated
  USING (public.user_belongs_to_empresa(empresa_id));

CREATE INDEX idx_pagamentos_stripe_orcamento ON public.pagamentos_stripe(orcamento_id);
CREATE INDEX idx_pagamentos_stripe_empresa ON public.pagamentos_stripe(empresa_id);

CREATE TRIGGER update_pagamentos_stripe_updated_at
  BEFORE UPDATE ON public.pagamentos_stripe
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.orcamentos
  ADD COLUMN IF NOT EXISTS data_pagamento timestamp with time zone,
  ADD COLUMN IF NOT EXISTS link_pagamento text;