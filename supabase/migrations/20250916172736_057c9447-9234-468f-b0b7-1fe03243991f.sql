-- Criar constraint única para CNPJ na tabela clientes
ALTER TABLE clientes ADD CONSTRAINT clientes_cnpj_cpf_unique UNIQUE (cnpj_cpf);

-- Inserir o cliente real da NFe no banco de dados clientes
INSERT INTO clientes (nome, cnpj_cpf, endereco, cidade, estado, cep) 
VALUES (
  'MEC-HIDRO MECANICA E HIDRAULICA LTDA', 
  '03.328.334/0001-87',
  'RUA PARINTINS, 994',
  'SANTA BARBARA D''OESTE',
  'SP',
  '13457-035'
)
ON CONFLICT (cnpj_cpf) DO UPDATE SET 
  nome = EXCLUDED.nome,
  endereco = EXCLUDED.endereco,
  cidade = EXCLUDED.cidade,
  estado = EXCLUDED.estado,
  cep = EXCLUDED.cep;

-- Inserir o produto real da NFe no banco de dados
INSERT INTO produtos_nfe (codigo, descricao, ncm) 
VALUES (
  '11042990',
  'CILINDRO MECANICO; TIPO CILINDRO: PNEUMATICO; ACAO CILINDRO: DUPLA; MATERIAL CORPO: ACO CARBONO; DIAMETRO HASTE: 5/8POL; DIAMETRO EMBOLO: 1.1/2POL; CURSO: 5POL; DIAMETRO CONEXAO: 3/8POL; ROSCA: NPT',
  '84123110'
)
ON CONFLICT (codigo, descricao) DO UPDATE SET ncm = EXCLUDED.ncm;