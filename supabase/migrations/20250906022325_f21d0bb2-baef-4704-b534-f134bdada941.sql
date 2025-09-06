-- Criar tabela de recebimentos
CREATE TABLE public.recebimentos (
  id SERIAL PRIMARY KEY,
  numero_ordem TEXT NOT NULL UNIQUE,
  cliente_id UUID REFERENCES public.clientes(id),
  cliente_nome TEXT NOT NULL,
  cliente_cnpj TEXT,
  data_entrada TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  nota_fiscal TEXT,
  chave_acesso_nfe TEXT,
  tipo_equipamento TEXT NOT NULL,
  numero_serie TEXT,
  pressao_trabalho TEXT,
  temperatura_trabalho TEXT,
  fluido_trabalho TEXT,
  local_instalacao TEXT,
  potencia TEXT,
  observacoes TEXT,
  urgente BOOLEAN DEFAULT false,
  na_empresa BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'recebido',
  data_analise TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de notas fiscais
CREATE TABLE public.notas_fiscais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chave_acesso TEXT NOT NULL UNIQUE,
  cnpj_emitente TEXT NOT NULL,
  numero TEXT NOT NULL,
  serie TEXT NOT NULL,
  modelo TEXT DEFAULT '55',
  data_emissao TIMESTAMP WITH TIME ZONE NOT NULL,
  cliente_nome TEXT NOT NULL,
  cliente_cnpj TEXT,
  valor_total DECIMAL(12,2),
  status TEXT DEFAULT 'processada',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de itens NFe
CREATE TABLE public.itens_nfe (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nota_fiscal_id UUID REFERENCES public.notas_fiscais(id) ON DELETE CASCADE,
  codigo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  ncm TEXT,
  quantidade DECIMAL(12,3) NOT NULL,
  valor_unitario DECIMAL(12,2) NOT NULL,
  valor_total DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de fotos de equipamentos
CREATE TABLE public.fotos_equipamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recebimento_id INTEGER REFERENCES public.recebimentos(id) ON DELETE CASCADE,
  arquivo_url TEXT NOT NULL,
  nome_arquivo TEXT NOT NULL,
  apresentar_orcamento BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.recebimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notas_fiscais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_nfe ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fotos_equipamentos ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS para recebimentos
CREATE POLICY "Recebimentos são visíveis para todos" 
ON public.recebimentos 
FOR SELECT 
USING (true);

CREATE POLICY "Qualquer um pode criar recebimentos" 
ON public.recebimentos 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Qualquer um pode atualizar recebimentos" 
ON public.recebimentos 
FOR UPDATE 
USING (true);

CREATE POLICY "Qualquer um pode deletar recebimentos" 
ON public.recebimentos 
FOR DELETE 
USING (true);

-- Criar políticas RLS para notas fiscais
CREATE POLICY "Notas fiscais são visíveis para todos" 
ON public.notas_fiscais 
FOR SELECT 
USING (true);

CREATE POLICY "Qualquer um pode criar notas fiscais" 
ON public.notas_fiscais 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Qualquer um pode atualizar notas fiscais" 
ON public.notas_fiscais 
FOR UPDATE 
USING (true);

CREATE POLICY "Qualquer um pode deletar notas fiscais" 
ON public.notas_fiscais 
FOR DELETE 
USING (true);

-- Criar políticas RLS para itens NFe
CREATE POLICY "Itens NFe são visíveis para todos" 
ON public.itens_nfe 
FOR SELECT 
USING (true);

CREATE POLICY "Qualquer um pode criar itens NFe" 
ON public.itens_nfe 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Qualquer um pode atualizar itens NFe" 
ON public.itens_nfe 
FOR UPDATE 
USING (true);

CREATE POLICY "Qualquer um pode deletar itens NFe" 
ON public.itens_nfe 
FOR DELETE 
USING (true);

-- Criar políticas RLS para fotos
CREATE POLICY "Fotos são visíveis para todos" 
ON public.fotos_equipamentos 
FOR SELECT 
USING (true);

CREATE POLICY "Qualquer um pode criar fotos" 
ON public.fotos_equipamentos 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Qualquer um pode atualizar fotos" 
ON public.fotos_equipamentos 
FOR UPDATE 
USING (true);

CREATE POLICY "Qualquer um pode deletar fotos" 
ON public.fotos_equipamentos 
FOR DELETE 
USING (true);

-- Criar buckets de storage para fotos
INSERT INTO storage.buckets (id, name, public) VALUES ('equipamentos', 'equipamentos', true);

-- Criar políticas para o bucket de equipamentos
CREATE POLICY "Fotos de equipamentos são publicamente acessíveis" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'equipamentos');

CREATE POLICY "Qualquer um pode fazer upload de fotos de equipamentos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'equipamentos');

CREATE POLICY "Qualquer um pode atualizar fotos de equipamentos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'equipamentos');

CREATE POLICY "Qualquer um pode deletar fotos de equipamentos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'equipamentos');

-- Criar trigger para atualizar updated_at
CREATE TRIGGER update_recebimentos_updated_at
BEFORE UPDATE ON public.recebimentos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notas_fiscais_updated_at
BEFORE UPDATE ON public.notas_fiscais
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Criar índices para melhor performance
CREATE INDEX idx_recebimentos_cliente_id ON public.recebimentos(cliente_id);
CREATE INDEX idx_recebimentos_data_entrada ON public.recebimentos(data_entrada);
CREATE INDEX idx_recebimentos_numero_ordem ON public.recebimentos(numero_ordem);
CREATE INDEX idx_notas_fiscais_chave_acesso ON public.notas_fiscais(chave_acesso);
CREATE INDEX idx_itens_nfe_nota_fiscal_id ON public.itens_nfe(nota_fiscal_id);
CREATE INDEX idx_fotos_equipamentos_recebimento_id ON public.fotos_equipamentos(recebimento_id);