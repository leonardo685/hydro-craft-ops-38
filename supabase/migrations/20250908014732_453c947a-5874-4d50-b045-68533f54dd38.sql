-- Criar tabela de orçamentos
CREATE TABLE public.orcamentos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero text NOT NULL UNIQUE,
  ordem_servico_id uuid REFERENCES public.ordens_servico(id),
  cliente_nome text NOT NULL,
  equipamento text NOT NULL,
  valor numeric NOT NULL DEFAULT 0,
  descricao text,
  observacoes text,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado')),
  data_criacao timestamp with time zone NOT NULL DEFAULT now(),
  data_aprovacao timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.orcamentos ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS
CREATE POLICY "Orçamentos são visíveis para todos" 
ON public.orcamentos 
FOR SELECT 
USING (true);

CREATE POLICY "Qualquer um pode criar orçamentos" 
ON public.orcamentos 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Qualquer um pode atualizar orçamentos" 
ON public.orcamentos 
FOR UPDATE 
USING (true);

CREATE POLICY "Qualquer um pode deletar orçamentos" 
ON public.orcamentos 
FOR DELETE 
USING (true);

-- Criar trigger para atualizar updated_at
CREATE TRIGGER update_orcamentos_updated_at
BEFORE UPDATE ON public.orcamentos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();