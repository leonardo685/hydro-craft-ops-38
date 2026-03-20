
-- Deletar fotos vinculadas às ordens
DELETE FROM fotos_equipamentos WHERE ordem_servico_id IN (
  '91d499e6-c3bb-4475-a516-99a13f2c296d',
  'bea4d8a0-797c-4f1a-a708-fdbd5604d0c5',
  'c2dc3a35-ed9d-46cc-9522-3a8fab555d75',
  '71af178b-a3ed-46d2-b896-cc1282a22029'
);

-- Deletar documentos vinculados
DELETE FROM documentos_ordem WHERE ordem_servico_id IN (
  '91d499e6-c3bb-4475-a516-99a13f2c296d',
  'bea4d8a0-797c-4f1a-a708-fdbd5604d0c5',
  'c2dc3a35-ed9d-46cc-9522-3a8fab555d75',
  '71af178b-a3ed-46d2-b896-cc1282a22029'
);

-- Deletar compras vinculadas
DELETE FROM compras WHERE ordem_servico_id IN (
  '91d499e6-c3bb-4475-a516-99a13f2c296d',
  'bea4d8a0-797c-4f1a-a708-fdbd5604d0c5',
  'c2dc3a35-ed9d-46cc-9522-3a8fab555d75',
  '71af178b-a3ed-46d2-b896-cc1282a22029'
);

-- Deletar testes vinculados
DELETE FROM testes_equipamentos WHERE ordem_servico_id IN (
  '91d499e6-c3bb-4475-a516-99a13f2c296d',
  'bea4d8a0-797c-4f1a-a708-fdbd5604d0c5',
  'c2dc3a35-ed9d-46cc-9522-3a8fab555d75',
  '71af178b-a3ed-46d2-b896-cc1282a22029'
);

-- Deletar as ordens de serviço
DELETE FROM ordens_servico WHERE id IN (
  '91d499e6-c3bb-4475-a516-99a13f2c296d',
  'bea4d8a0-797c-4f1a-a708-fdbd5604d0c5',
  'c2dc3a35-ed9d-46cc-9522-3a8fab555d75',
  '71af178b-a3ed-46d2-b896-cc1282a22029'
);
