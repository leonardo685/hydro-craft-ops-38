-- Deletar ordens de serviço vinculadas aos recebimentos
DELETE FROM ordens_servico WHERE recebimento_id IN (135, 136);

-- Deletar os recebimentos
DELETE FROM recebimentos WHERE id IN (135, 136);