-- Deletar ordens de serviço vinculadas
DELETE FROM ordens_servico WHERE recebimento_id IN (133, 134, 137, 138);

-- Deletar itens da nota fiscal
DELETE FROM itens_nfe WHERE nota_fiscal_id = 'e3c8699c-72c0-41a2-b2f5-3087edb0f386';

-- Deletar recebimentos
DELETE FROM recebimentos WHERE id IN (133, 134, 137, 138);

-- Deletar a nota fiscal
DELETE FROM notas_fiscais WHERE id = 'e3c8699c-72c0-41a2-b2f5-3087edb0f386';