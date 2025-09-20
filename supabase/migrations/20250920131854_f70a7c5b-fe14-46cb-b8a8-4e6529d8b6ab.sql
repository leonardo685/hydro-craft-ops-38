-- Adicionar colunas necessárias à tabela orcamentos para armazenar dados da nota fiscal
ALTER TABLE orcamentos 
ADD COLUMN IF NOT EXISTS numero_nf TEXT,
ADD COLUMN IF NOT EXISTS forma_pagamento TEXT,
ADD COLUMN IF NOT EXISTS data_vencimento DATE,
ADD COLUMN IF NOT EXISTS observacoes_nota TEXT,
ADD COLUMN IF NOT EXISTS pdf_nota_fiscal TEXT;