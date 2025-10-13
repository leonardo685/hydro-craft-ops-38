-- Criar tabela para itens do orçamento
CREATE TABLE public.itens_orcamento (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  orcamento_id UUID NOT NULL REFERENCES public.orcamentos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('peca', 'servico', 'usinagem')),
  descricao TEXT NOT NULL,
  quantidade NUMERIC NOT NULL DEFAULT 1,
  valor_unitario NUMERIC NOT NULL DEFAULT 0,
  valor_total NUMERIC NOT NULL DEFAULT 0,
  detalhes JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela para fotos do orçamento
CREATE TABLE public.fotos_orcamento (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  orcamento_id UUID NOT NULL REFERENCES public.orcamentos(id) ON DELETE CASCADE,
  arquivo_url TEXT NOT NULL,
  nome_arquivo TEXT NOT NULL,
  apresentar_orcamento BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS nas tabelas
ALTER TABLE public.itens_orcamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fotos_orcamento ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS para itens_orcamento
CREATE POLICY "Itens de orçamento são visíveis para todos" 
ON public.itens_orcamento 
FOR SELECT 
USING (true);

CREATE POLICY "Qualquer um pode criar itens de orçamento" 
ON public.itens_orcamento 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Qualquer um pode atualizar itens de orçamento" 
ON public.itens_orcamento 
FOR UPDATE 
USING (true);

CREATE POLICY "Qualquer um pode deletar itens de orçamento" 
ON public.itens_orcamento 
FOR DELETE 
USING (true);

-- Criar políticas RLS para fotos_orcamento
CREATE POLICY "Fotos de orçamento são visíveis para todos" 
ON public.fotos_orcamento 
FOR SELECT 
USING (true);

CREATE POLICY "Qualquer um pode criar fotos de orçamento" 
ON public.fotos_orcamento 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Qualquer um pode atualizar fotos de orçamento" 
ON public.fotos_orcamento 
FOR UPDATE 
USING (true);

CREATE POLICY "Qualquer um pode deletar fotos de orçamento" 
ON public.fotos_orcamento 
FOR DELETE 
USING (true);

-- Criar índices para melhor performance
CREATE INDEX idx_itens_orcamento_orcamento_id ON public.itens_orcamento(orcamento_id);
CREATE INDEX idx_fotos_orcamento_orcamento_id ON public.fotos_orcamento(orcamento_id);