-- Recriar função com search_path seguro
CREATE OR REPLACE FUNCTION atualizar_status_nota_fiscal(nota_id uuid)
RETURNS void 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_recebimentos integer;
  recebimentos_na_empresa integer;
  novo_status text;
BEGIN
  -- Contar total de recebimentos da nota
  SELECT COUNT(*) INTO total_recebimentos
  FROM recebimentos
  WHERE nota_fiscal_id = nota_id;
  
  -- Contar recebimentos ainda na empresa
  SELECT COUNT(*) INTO recebimentos_na_empresa
  FROM recebimentos
  WHERE nota_fiscal_id = nota_id AND na_empresa = true;
  
  -- Determinar o status
  IF recebimentos_na_empresa = total_recebimentos THEN
    novo_status := 'processada';
  ELSIF recebimentos_na_empresa = 0 THEN
    novo_status := 'retornada';
  ELSE
    novo_status := 'parcialmente_retornada';
  END IF;
  
  -- Atualizar status da nota fiscal
  UPDATE notas_fiscais
  SET status = novo_status, updated_at = now()
  WHERE id = nota_id;
END;
$$;

-- Recriar trigger function com search_path seguro
CREATE OR REPLACE FUNCTION trigger_atualizar_status_nota()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.nota_fiscal_id IS NOT NULL THEN
    PERFORM atualizar_status_nota_fiscal(NEW.nota_fiscal_id);
  END IF;
  RETURN NEW;
END;
$$;