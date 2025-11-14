-- Adicionar coluna legenda na tabela fotos_orcamento (se ainda não existir)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'fotos_orcamento' 
    AND column_name = 'legenda'
  ) THEN
    ALTER TABLE fotos_orcamento ADD COLUMN legenda TEXT;
  END IF;
END $$;