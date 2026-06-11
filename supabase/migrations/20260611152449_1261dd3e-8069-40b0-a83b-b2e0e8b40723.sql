DO $$
DECLARE
  r record;
  new_qual text;
  new_check text;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        COALESCE(qual, '') LIKE '%empresa_id IS NULL%'
        OR COALESCE(with_check, '') LIKE '%empresa_id IS NULL%'
      )
  LOOP
    new_qual := replace(COALESCE(r.qual, ''), ' OR (empresa_id IS NULL)', '');
    new_check := replace(COALESCE(r.with_check, ''), ' OR (empresa_id IS NULL)', '');

    EXECUTE format('ALTER POLICY %I ON %I.%I TO authenticated',
                   r.policyname, r.schemaname, r.tablename);

    IF r.qual IS NOT NULL THEN
      EXECUTE format('ALTER POLICY %I ON %I.%I USING (%s)',
                     r.policyname, r.schemaname, r.tablename, new_qual);
    END IF;

    IF r.with_check IS NOT NULL THEN
      EXECUTE format('ALTER POLICY %I ON %I.%I WITH CHECK (%s)',
                     r.policyname, r.schemaname, r.tablename, new_check);
    END IF;
  END LOOP;
END$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='clientes_marketing'
      AND policyname='Usuários veem clientes marketing da sua empresa'
  ) THEN
    EXECUTE 'ALTER POLICY "Usuários veem clientes marketing da sua empresa" ON public.clientes_marketing TO authenticated USING (empresa_id = get_user_empresa_id())';
  END IF;
END$$;