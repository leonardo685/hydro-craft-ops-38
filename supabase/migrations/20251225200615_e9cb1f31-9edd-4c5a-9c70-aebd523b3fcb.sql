-- Remover vínculo do Leonardo (bbc36852-752f-49b7-ab6f-2b5d2ce60e7b) 
-- com a empresa antiga MecHidro (00000000-0000-0000-0000-000000000001)
-- Mantendo apenas o vínculo com Mec Hydro Hydraulics onde ele é owner
DELETE FROM user_empresas 
WHERE user_id = 'bbc36852-752f-49b7-ab6f-2b5d2ce60e7b' 
AND empresa_id = '00000000-0000-0000-0000-000000000001';