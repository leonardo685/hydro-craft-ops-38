CREATE TABLE public.acoes_reversiveis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE,
  user_id uuid,
  user_nome text,
  user_email text,
  tipo text NOT NULL,
  descricao text NOT NULL,
  entidade_principal_tipo text,
  entidade_principal_id text,
  estado_anterior jsonb NOT NULL DEFAULT '{}'::jsonb,
  estado_novo jsonb NOT NULL DEFAULT '{}'::jsonb,
  desfeita boolean NOT NULL DEFAULT false,
  desfeita_em timestamptz,
  desfeita_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.acoes_reversiveis TO authenticated;
GRANT ALL ON public.acoes_reversiveis TO service_role;

ALTER TABLE public.acoes_reversiveis ENABLE ROW LEVEL SECURITY;

-- Qualquer usuário autenticado da empresa pode registrar suas ações
CREATE POLICY "Usuarios podem inserir acoes da sua empresa"
ON public.acoes_reversiveis FOR INSERT TO authenticated
WITH CHECK (user_belongs_to_empresa(empresa_id) AND user_id = auth.uid());

-- Apenas admins podem ver
CREATE POLICY "Apenas admins podem ver acoes"
ON public.acoes_reversiveis FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) AND user_belongs_to_empresa(empresa_id));

-- Apenas admins podem atualizar (para marcar como desfeita)
CREATE POLICY "Apenas admins podem atualizar acoes"
ON public.acoes_reversiveis FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) AND user_belongs_to_empresa(empresa_id))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND user_belongs_to_empresa(empresa_id));

CREATE INDEX idx_acoes_reversiveis_empresa_data ON public.acoes_reversiveis(empresa_id, created_at DESC);
CREATE INDEX idx_acoes_reversiveis_tipo ON public.acoes_reversiveis(tipo);

CREATE TRIGGER update_acoes_reversiveis_updated_at
BEFORE UPDATE ON public.acoes_reversiveis
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();