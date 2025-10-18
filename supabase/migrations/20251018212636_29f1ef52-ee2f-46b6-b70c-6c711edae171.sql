-- Criar tabela para configurações do sistema
CREATE TABLE IF NOT EXISTS public.configuracoes_sistema (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chave text NOT NULL UNIQUE,
  valor text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.configuracoes_sistema ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Configurações são visíveis para todos autenticados"
  ON public.configuracoes_sistema
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Configurações podem ser atualizadas por autenticados"
  ON public.configuracoes_sistema
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Configurações podem ser criadas por autenticados"
  ON public.configuracoes_sistema
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_configuracoes_sistema_updated_at
  BEFORE UPDATE ON public.configuracoes_sistema
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir configuração padrão do webhook
INSERT INTO public.configuracoes_sistema (chave, valor)
VALUES ('webhook_n8n_url', '')
ON CONFLICT (chave) DO NOTHING;