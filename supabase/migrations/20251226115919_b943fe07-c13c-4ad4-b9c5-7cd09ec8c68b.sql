-- Criar convite para novo owner da Mec Hydro Hydraulics
INSERT INTO convites_empresa (
  empresa_id,
  role,
  created_by,
  expires_at
)
VALUES (
  '75a36c77-793a-4f0f-b939-a2d79f5383b3', -- Mec Hydro Hydraulics
  'admin',
  'bbc36852-752f-49b7-ab6f-2b5d2ce60e7b', -- Leonardo (criador)
  now() + interval '30 days' -- Expira em 30 dias
);