-- Deletar itens órfãos vinculados à nota
DELETE FROM itens_nfe 
WHERE nota_fiscal_id = 'dd6dc3f2-e716-4569-afcc-39f16c1abee2';

-- Deletar a nota fiscal órfã
DELETE FROM notas_fiscais 
WHERE id = 'dd6dc3f2-e716-4569-afcc-39f16c1abee2';

-- Deletar qualquer outra nota ou item com empresa_id NULL para limpar
DELETE FROM itens_nfe WHERE empresa_id IS NULL;
DELETE FROM notas_fiscais WHERE empresa_id IS NULL;