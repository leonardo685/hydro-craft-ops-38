-- Adicionar colunas para controle de formas de pagamento
ALTER TABLE lancamentos_financeiros 
ADD COLUMN forma_pagamento text DEFAULT 'a_vista' CHECK (forma_pagamento IN ('a_vista', 'parcelado', 'recorrente')),
ADD COLUMN numero_parcelas integer,
ADD COLUMN parcela_numero integer,
ADD COLUMN frequencia_repeticao text CHECK (frequencia_repeticao IN ('semanal', 'quinzenal', 'mensal', 'anual')),
ADD COLUMN lancamento_pai_id uuid REFERENCES lancamentos_financeiros(id) ON DELETE CASCADE,
ADD COLUMN meses_recorrencia integer;

-- Criar índices para melhor performance
CREATE INDEX idx_lancamento_pai ON lancamentos_financeiros(lancamento_pai_id);
CREATE INDEX idx_forma_pagamento ON lancamentos_financeiros(forma_pagamento);

-- Comentários para documentação
COMMENT ON COLUMN lancamentos_financeiros.forma_pagamento IS 'Tipo de pagamento: a_vista, parcelado ou recorrente';
COMMENT ON COLUMN lancamentos_financeiros.numero_parcelas IS 'Quantidade total de parcelas (para parcelado)';
COMMENT ON COLUMN lancamentos_financeiros.parcela_numero IS 'Número da parcela atual (1, 2, 3, etc)';
COMMENT ON COLUMN lancamentos_financeiros.frequencia_repeticao IS 'Frequência de repetição: semanal, quinzenal, mensal ou anual';
COMMENT ON COLUMN lancamentos_financeiros.lancamento_pai_id IS 'ID do lançamento pai (para agrupar parcelas)';
COMMENT ON COLUMN lancamentos_financeiros.meses_recorrencia IS 'Quantidade de meses de recorrência';