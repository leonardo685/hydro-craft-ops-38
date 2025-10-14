-- Criar tabela de categorias financeiras
CREATE TABLE public.categorias_financeiras (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('mae', 'filha')),
  categoria_mae_id UUID REFERENCES public.categorias_financeiras(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de lançamentos financeiros
CREATE TABLE public.lancamentos_financeiros (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  descricao TEXT NOT NULL,
  categoria_id UUID REFERENCES public.categorias_financeiras(id),
  valor NUMERIC NOT NULL,
  conta_bancaria TEXT NOT NULL,
  fornecedor_cliente TEXT,
  data_esperada TIMESTAMP WITH TIME ZONE NOT NULL,
  data_realizada TIMESTAMP WITH TIME ZONE,
  pago BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de metas de gastos
CREATE TABLE public.metas_gastos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  categoria_id UUID NOT NULL REFERENCES public.categorias_financeiras(id) ON DELETE CASCADE,
  valor_meta NUMERIC NOT NULL,
  periodo TEXT NOT NULL CHECK (periodo IN ('mensal', 'trimestral', 'anual')),
  data_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
  data_fim TIMESTAMP WITH TIME ZONE NOT NULL,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.categorias_financeiras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lancamentos_financeiros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metas_gastos ENABLE ROW LEVEL SECURITY;

-- RLS Policies para categorias_financeiras
CREATE POLICY "Categorias são visíveis para todos"
  ON public.categorias_financeiras FOR SELECT
  USING (true);

CREATE POLICY "Qualquer um pode criar categorias"
  ON public.categorias_financeiras FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Qualquer um pode atualizar categorias"
  ON public.categorias_financeiras FOR UPDATE
  USING (true);

CREATE POLICY "Qualquer um pode deletar categorias"
  ON public.categorias_financeiras FOR DELETE
  USING (true);

-- RLS Policies para lancamentos_financeiros
CREATE POLICY "Lançamentos são visíveis para todos"
  ON public.lancamentos_financeiros FOR SELECT
  USING (true);

CREATE POLICY "Qualquer um pode criar lançamentos"
  ON public.lancamentos_financeiros FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Qualquer um pode atualizar lançamentos"
  ON public.lancamentos_financeiros FOR UPDATE
  USING (true);

CREATE POLICY "Qualquer um pode deletar lançamentos"
  ON public.lancamentos_financeiros FOR DELETE
  USING (true);

-- RLS Policies para metas_gastos
CREATE POLICY "Metas são visíveis para todos"
  ON public.metas_gastos FOR SELECT
  USING (true);

CREATE POLICY "Qualquer um pode criar metas"
  ON public.metas_gastos FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Qualquer um pode atualizar metas"
  ON public.metas_gastos FOR UPDATE
  USING (true);

CREATE POLICY "Qualquer um pode deletar metas"
  ON public.metas_gastos FOR DELETE
  USING (true);

-- Triggers para updated_at
CREATE TRIGGER update_categorias_financeiras_updated_at
  BEFORE UPDATE ON public.categorias_financeiras
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lancamentos_financeiros_updated_at
  BEFORE UPDATE ON public.lancamentos_financeiros
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_metas_gastos_updated_at
  BEFORE UPDATE ON public.metas_gastos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();