-- Primeiro criar a função para atualizar timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Criar tabela para clientes
CREATE TABLE public.clientes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  cnpj_cpf TEXT,
  inscricao_estadual TEXT,
  inscricao_municipal TEXT,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela para fornecedores
CREATE TABLE public.fornecedores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  cnpj_cpf TEXT,
  inscricao_estadual TEXT,
  inscricao_municipal TEXT,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar índices para melhor performance
CREATE INDEX idx_clientes_nome ON public.clientes(nome);
CREATE INDEX idx_clientes_cnpj_cpf ON public.clientes(cnpj_cpf);
CREATE INDEX idx_fornecedores_nome ON public.fornecedores(nome);
CREATE INDEX idx_fornecedores_cnpj_cpf ON public.fornecedores(cnpj_cpf);

-- Enable Row Level Security
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;

-- Policies para clientes
CREATE POLICY "Clientes são visíveis para todos" 
ON public.clientes 
FOR SELECT 
USING (true);

CREATE POLICY "Qualquer um pode criar clientes" 
ON public.clientes 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Qualquer um pode atualizar clientes" 
ON public.clientes 
FOR UPDATE 
USING (true);

CREATE POLICY "Qualquer um pode deletar clientes" 
ON public.clientes 
FOR DELETE 
USING (true);

-- Policies para fornecedores
CREATE POLICY "Fornecedores são visíveis para todos" 
ON public.fornecedores 
FOR SELECT 
USING (true);

CREATE POLICY "Qualquer um pode criar fornecedores" 
ON public.fornecedores 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Qualquer um pode atualizar fornecedores" 
ON public.fornecedores 
FOR UPDATE 
USING (true);

CREATE POLICY "Qualquer um pode deletar fornecedores" 
ON public.fornecedores 
FOR DELETE 
USING (true);

-- Triggers para atualizar updated_at automaticamente
CREATE TRIGGER update_clientes_updated_at
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fornecedores_updated_at
  BEFORE UPDATE ON public.fornecedores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();