ALTER TABLE ordens_servico ADD COLUMN IF NOT EXISTS xml_nota_fiscal text;
ALTER TABLE recebimentos ADD COLUMN IF NOT EXISTS xml_nota_retorno text;