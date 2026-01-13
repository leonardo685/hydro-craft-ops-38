
-- Atualizar ordem MH-046-25 para aguardando_retorno
UPDATE ordens_servico 
SET status = 'aguardando_retorno', updated_at = now()
WHERE id = '51d08b79-7a4e-42ef-800a-23d2e170d853';

-- Aprovar orçamento 0021/26 (status correto é 'aprovado')
UPDATE orcamentos 
SET status = 'aprovado', data_aprovacao = now(), updated_at = now()
WHERE id = 'b0f781a1-94c3-4fbd-90bd-31ceced21187';
