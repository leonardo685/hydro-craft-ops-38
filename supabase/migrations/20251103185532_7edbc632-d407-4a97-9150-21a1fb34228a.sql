-- Adicionar coluna cliente_id na tabela orcamentos
ALTER TABLE orcamentos 
ADD COLUMN IF NOT EXISTS cliente_id UUID REFERENCES clientes(id);

-- Criar índice para melhorar performance
CREATE INDEX IF NOT EXISTS idx_orcamentos_cliente_id ON orcamentos(cliente_id);

-- Atualizar orçamentos existentes com cliente_id baseado no nome do cliente
UPDATE orcamentos o
SET cliente_id = c.id
FROM clientes c
WHERE o.cliente_nome = c.nome
AND o.cliente_id IS NULL;