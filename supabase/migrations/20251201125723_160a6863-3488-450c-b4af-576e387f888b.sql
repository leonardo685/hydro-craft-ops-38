-- Criar tabela de compras
CREATE TABLE IF NOT EXISTS public.compras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ordem_servico_id UUID NOT NULL REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'aprovado' CHECK (status IN ('aprovado', 'cotando', 'comprado')),
  observacoes TEXT,
  data_cotacao TIMESTAMPTZ,
  data_compra TIMESTAMPTZ,
  fornecedor TEXT,
  numero_pedido TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.compras ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Compras são visíveis para todos autenticados"
  ON public.compras
  FOR SELECT
  USING (true);

CREATE POLICY "Qualquer um pode criar compras"
  ON public.compras
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Qualquer um pode atualizar compras"
  ON public.compras
  FOR UPDATE
  USING (true);

CREATE POLICY "Qualquer um pode deletar compras"
  ON public.compras
  FOR DELETE
  USING (true);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_compras_updated_at
  BEFORE UPDATE ON public.compras
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Função para criar compra automaticamente quando ordem é aprovada
CREATE OR REPLACE FUNCTION public.criar_compra_automatica()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se ordem foi aprovada e tem peças
  IF NEW.status = 'aprovada' 
     AND NEW.pecas_necessarias IS NOT NULL 
     AND jsonb_array_length(NEW.pecas_necessarias) > 0 THEN
    
    -- Inserir na tabela compras se ainda não existe
    INSERT INTO public.compras (ordem_servico_id, status)
    VALUES (NEW.id, 'aprovado')
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger para executar função após update em ordens_servico
CREATE TRIGGER trigger_criar_compra_automatica
  AFTER UPDATE ON public.ordens_servico
  FOR EACH ROW
  WHEN (NEW.status = 'aprovada')
  EXECUTE FUNCTION public.criar_compra_automatica();