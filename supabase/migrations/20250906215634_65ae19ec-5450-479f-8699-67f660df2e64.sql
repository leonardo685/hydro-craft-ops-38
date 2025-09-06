-- Create table for service orders (ordens de serviço)
CREATE TABLE public.ordens_servico (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recebimento_id integer REFERENCES public.recebimentos(id),
  numero_ordem text NOT NULL,
  cliente_nome text NOT NULL,
  equipamento text NOT NULL,
  tecnico text,
  data_entrada timestamp with time zone NOT NULL,
  data_analise timestamp with time zone,
  status text NOT NULL DEFAULT 'em_andamento',
  prioridade text NOT NULL DEFAULT 'media',
  -- Dados técnicos
  tipo_problema text,
  descricao_problema text,
  solucao_proposta text,
  pecas_necessarias jsonb,
  tempo_estimado text,
  valor_estimado numeric,
  observacoes_tecnicas text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ordens_servico ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Ordens de serviço são visíveis para todos" 
ON public.ordens_servico 
FOR SELECT 
USING (true);

CREATE POLICY "Qualquer um pode criar ordens de serviço" 
ON public.ordens_servico 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Qualquer um pode atualizar ordens de serviço" 
ON public.ordens_servico 
FOR UPDATE 
USING (true);

CREATE POLICY "Qualquer um pode deletar ordens de serviço" 
ON public.ordens_servico 
FOR DELETE 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_ordens_servico_updated_at
BEFORE UPDATE ON public.ordens_servico
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();