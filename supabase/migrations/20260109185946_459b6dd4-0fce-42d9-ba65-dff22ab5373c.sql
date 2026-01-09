-- Corrigir recebimentos que já foram retornados (têm pdf_nota_retorno)
-- mas na_empresa ainda está true
UPDATE recebimentos
SET na_empresa = false, updated_at = now()
WHERE pdf_nota_retorno IS NOT NULL
  AND na_empresa = true;