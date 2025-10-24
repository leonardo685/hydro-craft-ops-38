-- Adicionar novos campos na tabela testes_equipamentos
ALTER TABLE testes_equipamentos
ADD COLUMN IF NOT EXISTS curso text,
ADD COLUMN IF NOT EXISTS qtd_ciclos text,
ADD COLUMN IF NOT EXISTS pressao_maxima_trabalho text,
ADD COLUMN IF NOT EXISTS tempo_minutos text,
ADD COLUMN IF NOT EXISTS pressao_avanco text,
ADD COLUMN IF NOT EXISTS pressao_retorno text,
ADD COLUMN IF NOT EXISTS check_vazamento_pistao boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS check_vazamento_vedacoes_estaticas boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS check_vazamento_haste boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS teste_performance_pr004 text,
ADD COLUMN IF NOT EXISTS espessura_camada text,
ADD COLUMN IF NOT EXISTS check_ok boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS observacao text;