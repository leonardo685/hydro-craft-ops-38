-- Criar tabela para dados reais de NFe/empresas
CREATE TABLE public.empresas_nfe (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cnpj TEXT NOT NULL UNIQUE,
  razao_social TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.empresas_nfe ENABLE ROW LEVEL SECURITY;

-- Criar políticas para acesso público
CREATE POLICY "Empresas NFe são visíveis para todos" 
ON public.empresas_nfe 
FOR SELECT 
USING (true);

CREATE POLICY "Qualquer um pode criar empresas NFe" 
ON public.empresas_nfe 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Qualquer um pode atualizar empresas NFe" 
ON public.empresas_nfe 
FOR UPDATE 
USING (true);

-- Criar tabela para produtos/equipamentos reais de NFe
CREATE TABLE public.produtos_nfe (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  ncm TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(codigo, descricao)
);

-- Habilitar RLS
ALTER TABLE public.produtos_nfe ENABLE ROW LEVEL SECURITY;

-- Criar políticas para acesso público
CREATE POLICY "Produtos NFe são visíveis para todos" 
ON public.produtos_nfe 
FOR SELECT 
USING (true);

CREATE POLICY "Qualquer um pode criar produtos NFe" 
ON public.produtos_nfe 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Qualquer um pode atualizar produtos NFe" 
ON public.produtos_nfe 
FOR UPDATE 
USING (true);

-- Inserir dados do exemplo da nota fiscal
INSERT INTO public.empresas_nfe (cnpj, razao_social) VALUES 
('60.561.800/0041-09', 'SISTEMAS ALPHA LTDA');

INSERT INTO public.produtos_nfe (codigo, descricao, ncm) VALUES 
('11008498', 'ELDRO FREIO - PONTE ROLANTE 60/15T - ED6-H1-EDN203-EMH', '84314910');

-- Criar função para atualizar updated_at automaticamente
CREATE TRIGGER update_empresas_nfe_updated_at
BEFORE UPDATE ON public.empresas_nfe
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_produtos_nfe_updated_at
BEFORE UPDATE ON public.produtos_nfe
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();