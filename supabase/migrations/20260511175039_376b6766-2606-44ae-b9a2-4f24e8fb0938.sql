
-- Drop overly permissive public write/delete policies on storage.objects
DROP POLICY IF EXISTS "Qualquer um pode atualizar documentos" ON storage.objects;
DROP POLICY IF EXISTS "Qualquer um pode atualizar documentos técnicos" ON storage.objects;
DROP POLICY IF EXISTS "Qualquer um pode atualizar fotos de equipamentos" ON storage.objects;
DROP POLICY IF EXISTS "Qualquer um pode deletar documentos" ON storage.objects;
DROP POLICY IF EXISTS "Qualquer um pode deletar documentos técnicos" ON storage.objects;
DROP POLICY IF EXISTS "Qualquer um pode deletar fotos de equipamentos" ON storage.objects;
DROP POLICY IF EXISTS "Qualquer um pode fazer upload de documentos" ON storage.objects;
DROP POLICY IF EXISTS "Qualquer um pode fazer upload de documentos técnicos" ON storage.objects;
DROP POLICY IF EXISTS "Qualquer um pode fazer upload de fotos de equipamentos" ON storage.objects;

-- Recreate as authenticated-only
CREATE POLICY "Auth upload equipamentos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'equipamentos');
CREATE POLICY "Auth update equipamentos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'equipamentos');
CREATE POLICY "Auth delete equipamentos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'equipamentos');

CREATE POLICY "Auth upload documentos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documentos');
CREATE POLICY "Auth update documentos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'documentos');
CREATE POLICY "Auth delete documentos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'documentos');

CREATE POLICY "Auth upload documentos-tecnicos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documentos-tecnicos');
CREATE POLICY "Auth update documentos-tecnicos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'documentos-tecnicos');
CREATE POLICY "Auth delete documentos-tecnicos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'documentos-tecnicos');
