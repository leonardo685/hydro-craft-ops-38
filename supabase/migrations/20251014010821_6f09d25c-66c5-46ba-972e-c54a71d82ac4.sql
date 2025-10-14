-- Criar tabela de contas a receber
CREATE TABLE IF NOT EXISTS public.contas_receber (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  orcamento_id UUID REFERENCES public.orcamentos(id),
  numero_nf TEXT NOT NULL,
  cliente_nome TEXT NOT NULL,
  valor NUMERIC NOT NULL,
  data_emissao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  data_vencimento DATE NOT NULL,
  forma_pagamento TEXT NOT NULL,
  observacoes TEXT,
  status TEXT NOT NULL DEFAULT 'pendente', -- pendente, pago, vencido
  data_pagamento TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.contas_receber ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS
CREATE POLICY "Contas a receber são visíveis para todos"
  ON public.contas_receber
  FOR SELECT
  USING (true);

CREATE POLICY "Qualquer um pode criar contas a receber"
  ON public.contas_receber
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Qualquer um pode atualizar contas a receber"
  ON public.contas_receber
  FOR UPDATE
  USING (true);

CREATE POLICY "Qualquer um pode deletar contas a receber"
  ON public.contas_receber
  FOR DELETE
  USING (true);

-- Criar trigger para atualizar updated_at
CREATE TRIGGER update_contas_receber_updated_at
  BEFORE UPDATE ON public.contas_receber
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();