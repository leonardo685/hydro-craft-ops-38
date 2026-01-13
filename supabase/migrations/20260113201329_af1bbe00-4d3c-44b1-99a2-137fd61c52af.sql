-- Retornar orçamento 0053/25 para pendente (aguardando aprovação)
UPDATE orcamentos 
SET status = 'pendente', data_aprovacao = NULL, updated_at = now()
WHERE id = 'aeac34f8-4072-47c2-ae53-f39af7f4d3f4';