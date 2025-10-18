-- Adicionar coluna nota_fiscal_id na tabela recebimentos
ALTER TABLE recebimentos 
ADD COLUMN nota_fiscal_id uuid REFERENCES notas_fiscais(id);

-- Criar índice para melhorar performance das consultas
CREATE INDEX idx_recebimentos_nota_fiscal_id ON recebimentos(nota_fiscal_id);

-- Função para atualizar status da nota fiscal baseado nos recebimentos
CREATE OR REPLACE FUNCTION atualizar_status_nota_fiscal(nota_id uuid)
RETURNS void AS $$
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
$$ LANGUAGE plpgsql;

-- Trigger para atualizar status quando um recebimento é modificado
CREATE OR REPLACE FUNCTION trigger_atualizar_status_nota()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.nota_fiscal_id IS NOT NULL THEN
    PERFORM atualizar_status_nota_fiscal(NEW.nota_fiscal_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER recebimentos_atualizar_status_nota
AFTER INSERT OR UPDATE OF na_empresa ON recebimentos
FOR EACH ROW
EXECUTE FUNCTION trigger_atualizar_status_nota();