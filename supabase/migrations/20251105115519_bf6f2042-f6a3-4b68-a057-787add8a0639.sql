-- Criar bucket para documentos técnicos (PDF, Excel, etc)
INSERT INTO storage.buckets (id, name, public)
VALUES ('documentos-tecnicos', 'documentos-tecnicos', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas de acesso ao bucket documentos-tecnicos
-- Permitir upload de documentos
CREATE POLICY "Qualquer um pode fazer upload de documentos técnicos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'documentos-tecnicos');

-- Permitir leitura de documentos
CREATE POLICY "Qualquer um pode visualizar documentos técnicos"
ON storage.objects FOR SELECT
USING (bucket_id = 'documentos-tecnicos');

-- Permitir atualização de documentos
CREATE POLICY "Qualquer um pode atualizar documentos técnicos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'documentos-tecnicos');

-- Permitir deletar documentos
CREATE POLICY "Qualquer um pode deletar documentos técnicos"
ON storage.objects FOR DELETE
USING (bucket_id = 'documentos-tecnicos');

-- Criar tabela para registrar os documentos anexados às ordens
CREATE TABLE IF NOT EXISTS public.documentos_ordem (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ordem_servico_id UUID REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
  arquivo_url TEXT NOT NULL,
  nome_arquivo TEXT NOT NULL,
  tipo_arquivo TEXT NOT NULL,
  tamanho_bytes BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS para tabela documentos_ordem
ALTER TABLE public.documentos_ordem ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Documentos de ordem são visíveis para todos"
ON public.documentos_ordem FOR SELECT
USING (true);

CREATE POLICY "Qualquer um pode criar documentos de ordem"
ON public.documentos_ordem FOR INSERT
WITH CHECK (true);

CREATE POLICY "Qualquer um pode atualizar documentos de ordem"
ON public.documentos_ordem FOR UPDATE
USING (true);

CREATE POLICY "Qualquer um pode deletar documentos de ordem"
ON public.documentos_ordem FOR DELETE
USING (true);