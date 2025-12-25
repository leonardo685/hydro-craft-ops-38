-- Criar tabela para convites de empresa por link
CREATE TABLE public.convites_empresa (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
    email text,
    role app_role NOT NULL DEFAULT 'operador',
    expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '7 days'),
    used boolean NOT NULL DEFAULT false,
    used_at timestamp with time zone,
    used_by uuid,
    created_by uuid NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_convites_empresa_token ON public.convites_empresa(token);
CREATE INDEX idx_convites_empresa_empresa_id ON public.convites_empresa(empresa_id);

-- Habilitar RLS
ALTER TABLE public.convites_empresa ENABLE ROW LEVEL SECURITY;

-- Policy: Owners podem criar convites na sua empresa
CREATE POLICY "Owners podem criar convites" 
ON public.convites_empresa 
FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_empresas 
        WHERE user_empresas.empresa_id = convites_empresa.empresa_id 
        AND user_empresas.user_id = auth.uid() 
        AND user_empresas.is_owner = true
    )
);

-- Policy: Owners podem ver convites da sua empresa
CREATE POLICY "Owners podem ver convites da sua empresa" 
ON public.convites_empresa 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM user_empresas 
        WHERE user_empresas.empresa_id = convites_empresa.empresa_id 
        AND user_empresas.user_id = auth.uid() 
        AND user_empresas.is_owner = true
    )
);

-- Policy: Owners podem deletar convites da sua empresa
CREATE POLICY "Owners podem deletar convites da sua empresa" 
ON public.convites_empresa 
FOR DELETE 
USING (
    EXISTS (
        SELECT 1 FROM user_empresas 
        WHERE user_empresas.empresa_id = convites_empresa.empresa_id 
        AND user_empresas.user_id = auth.uid() 
        AND user_empresas.is_owner = true
    )
);

-- Policy: Qualquer pessoa pode ver convite válido por token (para página pública)
CREATE POLICY "Convites válidos são públicos para cadastro" 
ON public.convites_empresa 
FOR SELECT 
USING (
    used = false 
    AND expires_at > now()
);

-- Policy: Atualizar convite quando usado (via service role ou trigger)
CREATE POLICY "Usuários podem marcar convite como usado" 
ON public.convites_empresa 
FOR UPDATE 
USING (used = false AND expires_at > now())
WITH CHECK (used = true);