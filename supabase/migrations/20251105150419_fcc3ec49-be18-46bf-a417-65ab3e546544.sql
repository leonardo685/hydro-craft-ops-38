-- Adicionar coluna orcamento_id na tabela ordens_servico para vincular com orçamentos
ALTER TABLE ordens_servico 
ADD COLUMN orcamento_id UUID REFERENCES orcamentos(id);