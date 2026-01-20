-- Normalizar chaves de acesso: remover espaços de todas as chaves existentes
UPDATE recebimentos 
SET chave_acesso_nfe = REPLACE(chave_acesso_nfe, ' ', '')
WHERE chave_acesso_nfe IS NOT NULL 
  AND chave_acesso_nfe LIKE '% %';

UPDATE notas_fiscais 
SET chave_acesso = REPLACE(chave_acesso, ' ', '')
WHERE chave_acesso IS NOT NULL 
  AND chave_acesso LIKE '% %';