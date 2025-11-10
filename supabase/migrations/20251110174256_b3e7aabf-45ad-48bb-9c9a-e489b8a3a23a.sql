-- Corrigir search_path da função sync_pago_with_data_realizada
CREATE OR REPLACE FUNCTION sync_pago_with_data_realizada()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Se data_realizada está preenchida, pago deve ser true
  IF NEW.data_realizada IS NOT NULL THEN
    NEW.pago := true;
  -- Se data_realizada é null, pago deve ser false
  ELSIF NEW.data_realizada IS NULL AND OLD.data_realizada IS NOT NULL THEN
    NEW.pago := false;
  END IF;
  RETURN NEW;
END;
$$;