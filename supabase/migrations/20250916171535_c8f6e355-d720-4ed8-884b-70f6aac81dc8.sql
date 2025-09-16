-- Inserir dados reais da empresa da NFe fornecida
INSERT INTO empresas_nfe (cnpj, razao_social) 
VALUES ('60.561.800/0041-09', 'MEC HIDRO INDUSTRIA E COMERCIO LTDA')
ON CONFLICT (cnpj) DO UPDATE SET razao_social = EXCLUDED.razao_social;

-- Inserir alguns produtos de exemplo da NFe
INSERT INTO produtos_nfe (codigo, descricao, ncm) 
VALUES 
  ('VALV001', 'VALVULA HIDRAULICA DE CONTROLE', '84811000'),
  ('SELO001', 'SELO MECANICO PARA BOMBA', '84849000'),
  ('REPA001', 'REPARO COMPLETO BOMBA HIDRAULICA', '84131100')
ON CONFLICT (codigo, descricao) DO UPDATE SET ncm = EXCLUDED.ncm;