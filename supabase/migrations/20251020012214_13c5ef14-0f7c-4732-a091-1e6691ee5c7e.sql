-- Deletar na ordem correta respeitando foreign keys
DELETE FROM testes_equipamentos;
DELETE FROM fotos_orcamento;
DELETE FROM itens_orcamento;
DELETE FROM itens_nfe;
DELETE FROM contas_receber;
DELETE FROM fotos_equipamentos;

-- Deletar ordens de serviço antes de recebimentos
DELETE FROM ordens_servico;

-- Agora deletar recebimentos e notas
DELETE FROM recebimentos;
DELETE FROM notas_fiscais;

-- Deletar orçamentos e lançamentos
DELETE FROM orcamentos;
DELETE FROM lancamentos_financeiros;