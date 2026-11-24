CREATE POLICY "Usuários veem recebimentos da sua empresa" ON public.recebimentos FOR SELECT TO authenticated USING (public.user_belongs_to_empresa(empresa_id));
CREATE POLICY "Usuários veem testes da sua empresa" ON public.testes_equipamentos FOR SELECT TO authenticated USING (public.user_belongs_to_empresa(empresa_id));
CREATE POLICY "Usuários veem fotos da sua empresa" ON public.fotos_equipamentos FOR SELECT TO authenticated USING (public.user_belongs_to_empresa(empresa_id));

DROP POLICY "Leitura pública dos testes da ordem consultada" ON public.testes_equipamentos;
CREATE POLICY "Leitura pública dos testes da ordem consultada" ON public.testes_equipamentos FOR SELECT TO anon
USING (public.ordem_publica_numero() IS NOT NULL AND EXISTS (SELECT 1 FROM public.ordens_servico o WHERE o.id = ordem_servico_id AND (o.numero_ordem = public.ordem_publica_numero() OR o.equipamento = public.ordem_publica_equipamento())));
DROP POLICY "Leitura pública das fotos da ordem consultada" ON public.fotos_equipamentos;
CREATE POLICY "Leitura pública das fotos da ordem consultada" ON public.fotos_equipamentos FOR SELECT TO anon
USING (public.ordem_publica_numero() IS NOT NULL AND EXISTS (SELECT 1 FROM public.ordens_servico o WHERE o.id = ordem_servico_id AND (o.numero_ordem = public.ordem_publica_numero() OR o.equipamento = public.ordem_publica_equipamento())));