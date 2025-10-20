-- Adicionar novos campos na tabela orcamentos para informações comerciais
ALTER TABLE orcamentos 
ADD COLUMN IF NOT EXISTS frete text DEFAULT 'CIF',
ADD COLUMN IF NOT EXISTS assunto_proposta text,
ADD COLUMN IF NOT EXISTS prazo_entrega text,
ADD COLUMN IF NOT EXISTS condicao_pagamento text;

-- Adicionar comentários para documentação
COMMENT ON COLUMN orcamentos.frete IS 'Tipo de frete: CIF, FOB ou EXW';
COMMENT ON COLUMN orcamentos.assunto_proposta IS 'Assunto principal da proposta comercial';
COMMENT ON COLUMN orcamentos.prazo_entrega IS 'Prazo de entrega estimado';
COMMENT ON COLUMN orcamentos.condicao_pagamento IS 'Condições de pagamento acordadas';