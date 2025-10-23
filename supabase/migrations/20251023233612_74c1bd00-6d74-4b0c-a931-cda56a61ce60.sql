-- Criação da tabela de contas bancárias
CREATE TABLE public.contas_bancarias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  banco TEXT,
  agencia TEXT,
  conta TEXT,
  saldo_inicial NUMERIC NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.contas_bancarias ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Contas bancárias são visíveis para todos"
ON public.contas_bancarias
FOR SELECT
USING (true);

CREATE POLICY "Qualquer um pode criar contas bancárias"
ON public.contas_bancarias
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Qualquer um pode atualizar contas bancárias"
ON public.contas_bancarias
FOR UPDATE
USING (true);

CREATE POLICY "Qualquer um pode deletar contas bancárias"
ON public.contas_bancarias
FOR DELETE
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_contas_bancarias_updated_at
BEFORE UPDATE ON public.contas_bancarias
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();