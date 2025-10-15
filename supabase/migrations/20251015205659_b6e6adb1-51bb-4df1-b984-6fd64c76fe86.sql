-- Adicionar coluna data_emissao na tabela lancamentos_financeiros
ALTER TABLE lancamentos_financeiros 
ADD COLUMN data_emissao timestamp with time zone NOT NULL DEFAULT now();