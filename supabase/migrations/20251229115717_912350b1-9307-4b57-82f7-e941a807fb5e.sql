-- Adicionar políticas RLS faltantes para o bucket videos-teste

-- Política para UPDATE (necessária para uploads grandes que usam multipart)
CREATE POLICY "Usuários podem atualizar vídeos de teste"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'videos-teste')
WITH CHECK (bucket_id = 'videos-teste');

-- Política para DELETE (permite remover vídeos antigos)
CREATE POLICY "Usuários podem deletar vídeos de teste"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'videos-teste');

-- Configurar limite de tamanho do arquivo para 500MB
UPDATE storage.buckets 
SET file_size_limit = 524288000,
    allowed_mime_types = ARRAY['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/mpeg']
WHERE id = 'videos-teste';