-- Passo 1: Deletar duplicatas mantendo apenas o registro mais antigo de cada ordem_servico_id
DELETE FROM compras
WHERE id NOT IN (
  SELECT DISTINCT ON (ordem_servico_id) id
  FROM compras
  ORDER BY ordem_servico_id, created_at ASC
);

-- Passo 2: Adicionar constraint UNIQUE para prevenir futuras duplicatas
ALTER TABLE compras ADD CONSTRAINT unique_ordem_servico_compra UNIQUE (ordem_servico_id);

-- Passo 3: Atualizar o trigger para usar a constraint corretamente
CREATE OR REPLACE FUNCTION public.criar_compra_automatica()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'aprovada' 
     AND NEW.pecas_necessarias IS NOT NULL 
     AND jsonb_array_length(NEW.pecas_necessarias) > 0 THEN
    
    INSERT INTO public.compras (ordem_servico_id, status)
    VALUES (NEW.id, 'aprovado')
    ON CONFLICT (ordem_servico_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;