-- Passo 1: Criar função para sincronizar pago com data_realizada
CREATE OR REPLACE FUNCTION sync_pago_with_data_realizada()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Passo 2: Criar trigger para sincronização automática
CREATE TRIGGER trigger_sync_pago
BEFORE INSERT OR UPDATE ON lancamentos_financeiros
FOR EACH ROW
EXECUTE FUNCTION sync_pago_with_data_realizada();

-- Passo 3: Corrigir dados existentes inconsistentes
UPDATE lancamentos_financeiros
SET pago = true
WHERE data_realizada IS NOT NULL AND pago = false;