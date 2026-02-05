-- Atualizar cliente_nome de JSW para MEC HYDRO LLC em todas as tabelas relevantes
UPDATE ordens_servico SET cliente_nome = 'MEC HYDRO LLC', updated_at = now() WHERE cliente_nome ILIKE '%jsw%';
UPDATE recebimentos SET cliente_nome = 'MEC HYDRO LLC', updated_at = now() WHERE cliente_nome ILIKE '%jsw%';
UPDATE orcamentos SET cliente_nome = 'MEC HYDRO LLC', updated_at = now() WHERE cliente_nome ILIKE '%jsw%';

-- Também atualizar na tabela de clientes se existir
UPDATE clientes SET nome = 'MEC HYDRO LLC', updated_at = now() WHERE nome ILIKE '%jsw%';