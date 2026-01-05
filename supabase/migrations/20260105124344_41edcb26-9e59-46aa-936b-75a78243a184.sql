-- Remover constraint UNIQUE global em numero_ordem
ALTER TABLE public.recebimentos DROP CONSTRAINT IF EXISTS recebimentos_numero_ordem_key;

-- Criar nova constraint UNIQUE composta por empresa
CREATE UNIQUE INDEX recebimentos_numero_ordem_empresa_key 
ON public.recebimentos (numero_ordem, empresa_id);