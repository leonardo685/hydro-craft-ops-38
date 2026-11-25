DROP POLICY IF EXISTS "Usuários autenticados veem permissões de menu" ON public.menu_permissions;
CREATE POLICY "Usuários veem permissões do próprio papel" ON public.menu_permissions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), role));

DROP POLICY IF EXISTS "Owner update app files" ON storage.objects;
CREATE POLICY "Owner update app files" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = ANY (ARRAY['equipamentos','documentos','documentos-tecnicos','videos-teste']) AND (owner_id = (SELECT auth.uid()::text) OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gestor')))
WITH CHECK (bucket_id = ANY (ARRAY['equipamentos','documentos','documentos-tecnicos','videos-teste']) AND (owner_id = (SELECT auth.uid()::text) OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gestor')));

DROP POLICY IF EXISTS "Usuários podem atualizar vídeos de teste" ON storage.objects;