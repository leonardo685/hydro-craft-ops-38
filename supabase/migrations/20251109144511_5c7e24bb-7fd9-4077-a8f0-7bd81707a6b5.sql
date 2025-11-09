-- Criar tabela para aprovadores de fluxo
CREATE TABLE public.aprovadores_fluxo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  fluxo_permissao TEXT NOT NULL CHECK (fluxo_permissao IN ('fiscal', 'ordem_servico', 'orcamento')),
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar índice para busca rápida por fluxo
CREATE INDEX idx_aprovadores_fluxo_permissao ON public.aprovadores_fluxo(fluxo_permissao, ativo);

-- Habilitar RLS
ALTER TABLE public.aprovadores_fluxo ENABLE ROW LEVEL SECURITY;

-- Política: Aprovadores são visíveis para todos autenticados
CREATE POLICY "Aprovadores são visíveis para todos autenticados"
  ON public.aprovadores_fluxo
  FOR SELECT
  TO authenticated
  USING (true);

-- Política: Admins podem gerenciar aprovadores
CREATE POLICY "Admins podem gerenciar aprovadores"
  ON public.aprovadores_fluxo
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_aprovadores_fluxo_updated_at
  BEFORE UPDATE ON public.aprovadores_fluxo
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();