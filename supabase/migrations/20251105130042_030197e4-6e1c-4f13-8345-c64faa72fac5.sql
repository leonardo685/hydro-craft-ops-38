-- Tornar o bucket documentos-tecnicos público
UPDATE storage.buckets 
SET public = true 
WHERE id = 'documentos-tecnicos';

-- Adicionar política RLS para permitir leitura pública dos documentos técnicos
CREATE POLICY "Allow public read access to documentos-tecnicos"
ON storage.objects FOR SELECT
USING (bucket_id = 'documentos-tecnicos');