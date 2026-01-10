-- Deletar todas as notas com empresa_id NULL
DELETE FROM itens_nfe WHERE empresa_id IS NULL;
DELETE FROM notas_fiscais WHERE empresa_id IS NULL;