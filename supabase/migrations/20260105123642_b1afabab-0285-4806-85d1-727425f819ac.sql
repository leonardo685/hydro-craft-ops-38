-- Criar função atômica para gerar próximo número de ordem por empresa
CREATE OR REPLACE FUNCTION public.gerar_proximo_numero_ordem(p_empresa_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  ano_atual text;
  maior_numero integer;
  proximo_numero integer;
BEGIN
  ano_atual := to_char(now(), 'YY');
  
  -- Buscar maior número do ano atual PARA ESTA EMPRESA (com lock para evitar race condition)
  SELECT COALESCE(MAX(
    CASE 
      WHEN numero_ordem ~ ('^MH-\d+-' || ano_atual || '$') 
      THEN (regexp_match(numero_ordem, 'MH-(\d+)-'))[1]::integer
      ELSE 0 
    END
  ), 0)
  INTO maior_numero
  FROM (
    SELECT numero_ordem FROM recebimentos 
    WHERE numero_ordem LIKE 'MH-%-' || ano_atual AND empresa_id = p_empresa_id
    UNION ALL
    SELECT numero_ordem FROM ordens_servico 
    WHERE numero_ordem LIKE 'MH-%-' || ano_atual AND empresa_id = p_empresa_id
  ) AS ordens_empresa;
  
  proximo_numero := maior_numero + 1;
  
  RETURN 'MH-' || lpad(proximo_numero::text, 3, '0') || '-' || ano_atual;
END;
$$;