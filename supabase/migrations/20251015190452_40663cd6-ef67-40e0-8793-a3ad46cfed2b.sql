-- Adicionar coluna de classificação (entrada/saída) às categorias financeiras
ALTER TABLE categorias_financeiras 
ADD COLUMN classificacao text CHECK (classificacao IN ('entrada', 'saida'));

-- Atualizar categorias existentes com um valor padrão
UPDATE categorias_financeiras 
SET classificacao = 'entrada' 
WHERE classificacao IS NULL;