-- Corrigir a função criar_compra_automatica para incluir empresa_id
CREATE OR REPLACE FUNCTION public.criar_compra_automatica()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'aprovada' 
     AND NEW.pecas_necessarias IS NOT NULL 
     AND jsonb_array_length(NEW.pecas_necessarias) > 0 THEN
    
    INSERT INTO public.compras (ordem_servico_id, status, empresa_id)
    VALUES (NEW.id, 'aprovado', NEW.empresa_id)
    ON CONFLICT (ordem_servico_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Atualizar registros existentes que têm empresa_id = NULL
UPDATE compras c
SET empresa_id = os.empresa_id
FROM ordens_servico os
WHERE c.ordem_servico_id = os.id
AND c.empresa_id IS NULL;