-- Remover política antiga de INSERT
DROP POLICY IF EXISTS "Usuários podem fazer upload de vídeos de teste" ON storage.objects;

-- Criar nova política de INSERT para usuários autenticados
CREATE POLICY "Usuários autenticados podem fazer upload de vídeos de teste"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'videos-teste');