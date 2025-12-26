
-- Adicionar Leonardo como owner da MecHidro
INSERT INTO user_empresas (user_id, empresa_id, is_owner)
VALUES (
  'bbc36852-752f-49b7-ab6f-2b5d2ce60e7b', -- Leonardo
  '00000000-0000-0000-0000-000000000001', -- MecHidro
  true
)
ON CONFLICT (user_id, empresa_id) DO UPDATE SET is_owner = true;
