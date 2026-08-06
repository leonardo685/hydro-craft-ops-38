CREATE OR REPLACE FUNCTION public.preencher_empresa_historico_lancamento()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.empresa_id IS NULL THEN
    SELECT l.empresa_id INTO NEW.empresa_id
    FROM public.lancamentos_financeiros l
    WHERE l.id = NEW.lancamento_id;
  END IF;
  IF NEW.empresa_id IS NULL THEN
    NEW.empresa_id := public.get_user_empresa_id();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_preencher_empresa_historico_lancamento ON public.historico_lancamentos;
CREATE TRIGGER trg_preencher_empresa_historico_lancamento
BEFORE INSERT ON public.historico_lancamentos
FOR EACH ROW EXECUTE FUNCTION public.preencher_empresa_historico_lancamento();

UPDATE public.historico_lancamentos h
SET empresa_id = l.empresa_id
FROM public.lancamentos_financeiros l
WHERE h.lancamento_id = l.id
  AND h.empresa_id IS NULL
  AND l.empresa_id IS NOT NULL;

UPDATE public.historico_lancamentos
SET empresa_id = '00000000-0000-0000-0000-000000000001'
WHERE empresa_id IS NULL;