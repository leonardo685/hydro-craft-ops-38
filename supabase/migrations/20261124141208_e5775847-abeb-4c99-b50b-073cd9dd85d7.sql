DROP POLICY IF EXISTS "Acesso público aos recebimentos" ON public.recebimentos;
CREATE POLICY "Leitura pública do recebimento da ordem consultada" ON public.recebimentos FOR SELECT TO anon
USING (public.ordem_publica_numero() IS NOT NULL AND numero_ordem = public.ordem_publica_numero());

DROP POLICY IF EXISTS "Acesso público aos testes de equipamentos" ON public.testes_equipamentos;
CREATE POLICY "Leitura pública dos testes da ordem consultada" ON public.testes_equipamentos FOR SELECT TO anon
USING (public.ordem_publica_numero() IS NOT NULL AND EXISTS (SELECT 1 FROM public.ordens_servico o WHERE o.id = ordem_servico_id AND o.numero_ordem = public.ordem_publica_numero()));

DROP POLICY IF EXISTS "Acesso público às fotos de equipamentos" ON public.fotos_equipamentos;
CREATE POLICY "Leitura pública das fotos da ordem consultada" ON public.fotos_equipamentos FOR SELECT TO anon
USING (public.ordem_publica_numero() IS NOT NULL AND EXISTS (SELECT 1 FROM public.ordens_servico o WHERE o.id = ordem_servico_id AND o.numero_ordem = public.ordem_publica_numero()));

DROP POLICY IF EXISTS "Todos podem ver permissões de menu" ON public.menu_permissions;
CREATE POLICY "Usuários autenticados veem permissões de menu" ON public.menu_permissions FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

-- Storage writes bound to uploader (or admin/gestor)
DROP POLICY IF EXISTS "Auth update equipamentos" ON storage.objects;
DROP POLICY IF EXISTS "Auth delete equipamentos" ON storage.objects;
DROP POLICY IF EXISTS "Auth upload equipamentos" ON storage.objects;
DROP POLICY IF EXISTS "Usuários podem deletar vídeos de teste" ON storage.objects;
DROP POLICY IF EXISTS "Usuários autenticados podem fazer upload de vídeos de teste" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete from documentos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update in documentos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to documentos" ON storage.objects;
DROP POLICY IF EXISTS "Auth update documentos" ON storage.objects;
DROP POLICY IF EXISTS "Auth delete documentos" ON storage.objects;
DROP POLICY IF EXISTS "Auth upload documentos" ON storage.objects;
DROP POLICY IF EXISTS "Auth delete documentos-tecnicos" ON storage.objects;
DROP POLICY IF EXISTS "Auth update documentos-tecnicos" ON storage.objects;
DROP POLICY IF EXISTS "Auth upload documentos-tecnicos" ON storage.objects;

CREATE POLICY "Owner upload app files" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id IN ('equipamentos','documentos','documentos-tecnicos','videos-teste') AND owner_id = (select auth.uid()::text));
CREATE POLICY "Owner update app files" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id IN ('equipamentos','documentos','documentos-tecnicos') AND (owner_id = (select auth.uid()::text) OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gestor')))
WITH CHECK (bucket_id IN ('equipamentos','documentos','documentos-tecnicos'));
CREATE POLICY "Owner delete app files" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id IN ('equipamentos','documentos','documentos-tecnicos','videos-teste') AND (owner_id = (select auth.uid()::text) OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gestor')));