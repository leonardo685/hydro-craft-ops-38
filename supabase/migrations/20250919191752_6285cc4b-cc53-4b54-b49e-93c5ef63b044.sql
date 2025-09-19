-- Verificar e atualizar status existentes que podem não estar conformes
UPDATE public.ordens_servico 
SET status = 'pendente' 
WHERE status NOT IN ('pendente', 'aprovada', 'em_producao', 'finalizada', 'entregue', 'rejeitada');

-- Agora adicionar a constraint com os novos status
ALTER TABLE public.ordens_servico DROP CONSTRAINT IF EXISTS ordens_servico_status_check;
ALTER TABLE public.ordens_servico ADD CONSTRAINT ordens_servico_status_check 
CHECK (status IN ('pendente', 'aprovada', 'em_producao', 'em_teste', 'finalizada', 'entregue', 'rejeitada'));

-- Criar tabela para testes de equipamentos
CREATE TABLE public.testes_equipamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ordem_servico_id UUID NOT NULL REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
  tipo_teste TEXT NOT NULL,
  pressao_teste TEXT,
  temperatura_operacao TEXT,
  observacoes_teste TEXT,
  resultado_teste TEXT NOT NULL,
  data_hora_teste TIMESTAMP WITH TIME ZONE NOT NULL,
  video_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.testes_equipamentos ENABLE ROW LEVEL SECURITY;

-- Criar políticas para testes_equipamentos
CREATE POLICY "Testes são visíveis para todos os usuários autenticados" 
ON public.testes_equipamentos 
FOR SELECT 
USING (true);

CREATE POLICY "Usuários podem criar testes" 
ON public.testes_equipamentos 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Usuários podem atualizar testes" 
ON public.testes_equipamentos 
FOR UPDATE 
USING (true);

-- Criar bucket para vídeos de teste
INSERT INTO storage.buckets (id, name, public) 
VALUES ('videos-teste', 'videos-teste', true)
ON CONFLICT (id) DO NOTHING;

-- Criar políticas para o bucket de vídeos
CREATE POLICY "Vídeos de teste são visíveis para todos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'videos-teste');

CREATE POLICY "Usuários podem fazer upload de vídeos de teste" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'videos-teste');

-- Criar trigger para updated_at
CREATE TRIGGER update_testes_equipamentos_updated_at
    BEFORE UPDATE ON public.testes_equipamentos
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();