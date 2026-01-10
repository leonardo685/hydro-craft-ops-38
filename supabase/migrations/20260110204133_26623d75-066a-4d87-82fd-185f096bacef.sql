-- Atualizar nota fiscal órfã específica para empresa correta
UPDATE notas_fiscais 
SET empresa_id = '00000000-0000-0000-0000-000000000001'
WHERE id = 'c85c10bf-50f6-428f-ae18-2a0da7294348' AND empresa_id IS NULL;

-- Atualizar item órfão da nota
UPDATE itens_nfe 
SET empresa_id = '00000000-0000-0000-0000-000000000001'
WHERE id = '5256e257-9261-4745-8b54-020cfbb02b39' AND empresa_id IS NULL;

-- Corrigir qualquer outro registro órfão restante
UPDATE notas_fiscais 
SET empresa_id = '00000000-0000-0000-0000-000000000001'
WHERE empresa_id IS NULL;

UPDATE itens_nfe 
SET empresa_id = '00000000-0000-0000-0000-000000000001'
WHERE empresa_id IS NULL;

-- Adicionar constraint NOT NULL para prevenir futuros órfãos
ALTER TABLE notas_fiscais 
ALTER COLUMN empresa_id SET NOT NULL;

ALTER TABLE itens_nfe 
ALTER COLUMN empresa_id SET NOT NULL;