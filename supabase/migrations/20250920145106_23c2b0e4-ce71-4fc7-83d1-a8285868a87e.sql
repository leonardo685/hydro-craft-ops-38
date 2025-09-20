-- Criar bucket para documentos (notas fiscais, anexos, etc.)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('documentos', 'documentos', false)
ON CONFLICT (id) DO NOTHING;

-- Criar políticas para o bucket documentos
CREATE POLICY "Documentos são visíveis para todos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'documentos');

CREATE POLICY "Qualquer um pode fazer upload de documentos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'documentos');

CREATE POLICY "Qualquer um pode atualizar documentos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'documentos');

CREATE POLICY "Qualquer um pode deletar documentos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'documentos');