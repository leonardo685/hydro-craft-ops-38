-- Adicionar coluna prazo_pagamento à tabela orcamentos
ALTER TABLE orcamentos
ADD COLUMN IF NOT EXISTS prazo_pagamento integer DEFAULT 30;

COMMENT ON COLUMN orcamentos.prazo_pagamento IS 'Prazo de pagamento em dias corridos após aprovação';