-- Adicionar campo ordem_anterior na tabela recebimentos para rastreabilidade
ALTER TABLE recebimentos 
ADD COLUMN IF NOT EXISTS ordem_anterior TEXT;

-- Adicionar campo motivo_falha na tabela ordens_servico para diagnóstico
ALTER TABLE ordens_servico 
ADD COLUMN IF NOT EXISTS motivo_falha TEXT;

-- Adicionar campo data_finalizacao na tabela ordens_servico para calcular tempo de serviço
ALTER TABLE ordens_servico 
ADD COLUMN IF NOT EXISTS data_finalizacao TIMESTAMP WITH TIME ZONE;