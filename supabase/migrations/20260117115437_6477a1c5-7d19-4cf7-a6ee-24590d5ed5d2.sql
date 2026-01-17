-- Criar função para limpar itens duplicados de todos os orçamentos
CREATE OR REPLACE FUNCTION public.limpar_itens_duplicados()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  itens_removidos integer;
BEGIN
  WITH duplicados AS (
    SELECT id, 
           ROW_NUMBER() OVER (PARTITION BY orcamento_id, tipo, descricao, quantidade ORDER BY created_at) as rn
    FROM itens_orcamento
  )
  DELETE FROM itens_orcamento
  WHERE id IN (
    SELECT id FROM duplicados WHERE rn > 1
  );
  
  GET DIAGNOSTICS itens_removidos = ROW_COUNT;
  RETURN itens_removidos;
END;
$$;