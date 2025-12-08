-- Corrigir ordem de serviço que foi criada com número errado (usando ID do recebimento como fallback)
UPDATE ordens_servico 
SET numero_ordem = 'MH-065-25' 
WHERE numero_ordem = 'MH-092-25' AND recebimento_id = 92;

-- Corrigir recebimento que foi criado com número errado (MH-093-25 deveria ser MH-066-25)
UPDATE recebimentos 
SET numero_ordem = 'MH-066-25' 
WHERE numero_ordem = 'MH-093-25';