-- Criar tabela para captura de leads via QR Code
CREATE TABLE IF NOT EXISTS public.clientes_marketing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ordem_servico_id uuid NOT NULL REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
  numero_ordem text NOT NULL,
  nome text NOT NULL,
  empresa text NOT NULL,
  telefone text NOT NULL,
  data_acesso timestamp with time zone NOT NULL DEFAULT now(),
  ip_acesso text,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_clientes_marketing_ordem_servico ON public.clientes_marketing(ordem_servico_id);
CREATE INDEX idx_clientes_marketing_numero_ordem ON public.clientes_marketing(numero_ordem);
CREATE INDEX idx_clientes_marketing_telefone ON public.clientes_marketing(telefone);
CREATE INDEX idx_clientes_marketing_data_acesso ON public.clientes_marketing(data_acesso DESC);

-- Trigger para updated_at
CREATE TRIGGER update_clientes_marketing_updated_at 
  BEFORE UPDATE ON public.clientes_marketing 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies (público pode inserir, apenas autenticados veem)
ALTER TABLE public.clientes_marketing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Qualquer um pode criar registro de marketing"
  ON public.clientes_marketing
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem ver registros"
  ON public.clientes_marketing
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Comentários
COMMENT ON TABLE public.clientes_marketing IS 'Armazena leads capturados via QR code para remarketing';
COMMENT ON COLUMN public.clientes_marketing.nome IS 'Nome completo do cliente';
COMMENT ON COLUMN public.clientes_marketing.empresa IS 'Empresa onde o cliente trabalha';
COMMENT ON COLUMN public.clientes_marketing.telefone IS 'Número de telefone válido (formato brasileiro)';
COMMENT ON COLUMN public.clientes_marketing.ip_acesso IS 'IP do acesso para auditoria';
COMMENT ON COLUMN public.clientes_marketing.user_agent IS 'User agent do navegador para analytics';