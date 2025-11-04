-- Adicionar coluna ordem_servico_id na tabela fotos_equipamentos
ALTER TABLE fotos_equipamentos 
ADD COLUMN ordem_servico_id uuid REFERENCES ordens_servico(id) ON DELETE CASCADE;