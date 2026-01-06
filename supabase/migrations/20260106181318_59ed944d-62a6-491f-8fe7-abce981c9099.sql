-- Atualizar recebimentos de 2026 que têm tipo_equipamento vazio
UPDATE recebimentos 
SET tipo_equipamento = 'Cilindro Hidráulico', updated_at = now()
WHERE created_at >= '2026-01-01' 
AND (tipo_equipamento IS NULL OR tipo_equipamento = '')
AND categoria_equipamento = 'cilindro';