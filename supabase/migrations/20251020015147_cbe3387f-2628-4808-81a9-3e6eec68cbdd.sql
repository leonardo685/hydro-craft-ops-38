-- Atualizar as fotos do recebimento 27 (MH-2025-002) que são fotos de chegada
-- Todas as 4 fotos deste recebimento deveriam ser fotos de chegada (apresentar_orcamento = true)
UPDATE fotos_equipamentos 
SET apresentar_orcamento = true
WHERE recebimento_id = 27 
AND apresentar_orcamento = false;