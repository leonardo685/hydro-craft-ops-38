
-- Corrigir dados antigos do campo fornecedor_cliente: converter nomes para IDs
-- Usa o cliente mais recente (ou primeiro) quando há duplicados com mesmo nome

UPDATE lancamentos_financeiros lf
SET fornecedor_cliente = (
  SELECT c.id 
  FROM clientes c 
  WHERE c.nome = lf.fornecedor_cliente 
    AND c.empresa_id = lf.empresa_id
  ORDER BY c.created_at DESC
  LIMIT 1
)
WHERE lf.fornecedor_cliente IS NOT NULL
  AND lf.fornecedor_cliente !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND EXISTS (
    SELECT 1 FROM clientes c 
    WHERE c.nome = lf.fornecedor_cliente 
      AND c.empresa_id = lf.empresa_id
  );
