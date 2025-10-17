-- Criar ENUM para roles
CREATE TYPE public.app_role AS ENUM ('admin', 'gestor', 'operador');

-- Criar tabela de perfis
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Criar tabela de roles de usuário
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, role)
);

-- Habilitar RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Criar função SECURITY DEFINER para verificar roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Criar tabela de permissões de menu
CREATE TABLE public.menu_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  menu_item TEXT NOT NULL,
  can_access BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(role, menu_item)
);

-- Habilitar RLS
ALTER TABLE public.menu_permissions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para profiles
CREATE POLICY "Usuários podem ver seu próprio perfil"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Usuários podem atualizar seu próprio perfil"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Qualquer um autenticado pode inserir seu perfil"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Políticas RLS para user_roles
CREATE POLICY "Admins podem ver todas as roles"
  ON public.user_roles
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins podem inserir roles"
  ON public.user_roles
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins podem atualizar roles"
  ON public.user_roles
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins podem deletar roles"
  ON public.user_roles
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Políticas RLS para menu_permissions
CREATE POLICY "Todos podem ver permissões de menu"
  ON public.menu_permissions
  FOR SELECT
  USING (true);

CREATE POLICY "Admins podem gerenciar permissões"
  ON public.menu_permissions
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger para criar perfil automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email),
    NEW.email
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Trigger para atualizar updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir permissões padrão para cada role
-- Admin tem acesso a tudo
INSERT INTO public.menu_permissions (role, menu_item, can_access) VALUES
  ('admin', 'recebimentos', true),
  ('admin', 'analise', true),
  ('admin', 'orcamentos', true),
  ('admin', 'aprovados', true),
  ('admin', 'faturamento', true),
  ('admin', 'financeiro', true),
  ('admin', 'financeiro_dashboard', true),
  ('admin', 'financeiro_dre', true),
  ('admin', 'financeiro_dfc', true),
  ('admin', 'financeiro_metas', true),
  ('admin', 'cadastros', true),
  ('admin', 'admin_permissions', true);

-- Gestor tem acesso parcial
INSERT INTO public.menu_permissions (role, menu_item, can_access) VALUES
  ('gestor', 'recebimentos', true),
  ('gestor', 'analise', true),
  ('gestor', 'orcamentos', true),
  ('gestor', 'aprovados', true),
  ('gestor', 'faturamento', true),
  ('gestor', 'financeiro', true),
  ('gestor', 'financeiro_dashboard', true),
  ('gestor', 'financeiro_dre', true),
  ('gestor', 'financeiro_dfc', true),
  ('gestor', 'financeiro_metas', true),
  ('gestor', 'cadastros', false),
  ('gestor', 'admin_permissions', false);

-- Operador tem acesso limitado
INSERT INTO public.menu_permissions (role, menu_item, can_access) VALUES
  ('operador', 'recebimentos', true),
  ('operador', 'analise', true),
  ('operador', 'orcamentos', true),
  ('operador', 'aprovados', false),
  ('operador', 'faturamento', false),
  ('operador', 'financeiro', false),
  ('operador', 'financeiro_dashboard', false),
  ('operador', 'financeiro_dre', false),
  ('operador', 'financeiro_dfc', false),
  ('operador', 'financeiro_metas', false),
  ('operador', 'cadastros', false),
  ('operador', 'admin_permissions', false);