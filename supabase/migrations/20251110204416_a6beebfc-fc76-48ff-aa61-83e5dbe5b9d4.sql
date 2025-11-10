-- Corrigir dados dos orçamentos 0020/25 e 0021/25

-- Corrigir orçamento 0020/25 - vincular à MH-031-25
UPDATE orcamentos
SET 
  ordem_servico_id = '4f4d9f25-d37c-46b3-8231-eddeb38286f8',
  numero_nota_entrada = '943635',
  ordem_referencia = 'MH-031-25'
WHERE numero = '0020/25';

-- Corrigir orçamento 0021/25 - vincular à MH-032-25
UPDATE orcamentos
SET 
  ordem_servico_id = 'bb15e792-1d7c-4cbe-80cc-e8b72a49f32e',
  numero_nota_entrada = '945974',
  ordem_referencia = 'MH-032-25'
WHERE numero = '0021/25';

-- Vincular ordens de serviço aos orçamentos
UPDATE ordens_servico
SET orcamento_id = '9b425c48-7774-46e4-b208-bc545065c8a6'
WHERE id = '4f4d9f25-d37c-46b3-8231-eddeb38286f8';

UPDATE ordens_servico
SET orcamento_id = '49886762-0ea4-4074-a8be-e7d3edf55604'
WHERE id = 'bb15e792-1d7c-4cbe-80cc-e8b72a49f32e';

-- Atualizar status dos recebimentos para aguardando_aprovacao
UPDATE recebimentos
SET status = 'aguardando_aprovacao'
WHERE numero_ordem IN ('MH-031-25', 'MH-032-25');