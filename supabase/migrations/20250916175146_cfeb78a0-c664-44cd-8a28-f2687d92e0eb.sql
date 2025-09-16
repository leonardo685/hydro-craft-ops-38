-- Limpar todos os dados das tabelas principais para teste
-- Manter estruturas e funcionalidades intactas

-- Limpar fotos de equipamentos primeiro (devido à dependência)
DELETE FROM fotos_equipamentos;

-- Limpar orçamentos
DELETE FROM orcamentos;

-- Limpar ordens de serviço  
DELETE FROM ordens_servico;

-- Limpar itens de NFe
DELETE FROM itens_nfe;

-- Limpar notas fiscais
DELETE FROM notas_fiscais;

-- Limpar recebimentos
DELETE FROM recebimentos;

-- Reset da sequência de recebimentos para começar do 1
ALTER SEQUENCE recebimentos_id_seq RESTART WITH 1;