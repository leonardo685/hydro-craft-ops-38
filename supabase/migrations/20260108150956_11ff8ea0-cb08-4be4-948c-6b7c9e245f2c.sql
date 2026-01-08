-- Adicionar coluna nome_emitente na tabela notas_fiscais
ALTER TABLE notas_fiscais ADD COLUMN IF NOT EXISTS nome_emitente TEXT;

-- Limpar cache da NFe 943635 para que seja consultada novamente com os dados corretos
DELETE FROM itens_nfe WHERE nota_fiscal_id IN (
  SELECT id FROM notas_fiscais WHERE chave_acesso = '35250760561800004109550010009436351035908201'
);
DELETE FROM notas_fiscais WHERE chave_acesso = '35250760561800004109550010009436351035908201';