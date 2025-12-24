
-- =====================================================
-- FASE 1: SISTEMA MULTI-EMPRESA (MULTI-TENANT)
-- =====================================================

-- 1. CRIAR TABELA DE EMPRESAS
CREATE TABLE public.empresas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  razao_social text,
  cnpj text UNIQUE,
  email text,
  telefone text,
  endereco text,
  cidade text,
  estado text,
  cep text,
  logo_url text,
  configuracoes jsonb DEFAULT '{}'::jsonb,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. CRIAR TABELA DE RELACIONAMENTO USUÁRIO-EMPRESA
CREATE TABLE public.user_empresas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  is_owner boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, empresa_id)
);

-- 3. CRIAR EMPRESA MECHIDRO E MIGRAR DADOS EXISTENTES
INSERT INTO public.empresas (id, nome, razao_social, cnpj)
VALUES ('00000000-0000-0000-0000-000000000001', 'MecHidro', 'MEC HIDRO Comércio e Serviços Ltda', NULL);

-- 4. VINCULAR TODOS OS USUÁRIOS EXISTENTES À MECHIDRO
INSERT INTO public.user_empresas (user_id, empresa_id, is_owner)
SELECT id, '00000000-0000-0000-0000-000000000001', false
FROM auth.users
ON CONFLICT (user_id, empresa_id) DO NOTHING;

-- 5. ADICIONAR COLUNA empresa_id EM TODAS AS TABELAS DE DADOS
-- Orçamentos
ALTER TABLE public.orcamentos ADD COLUMN IF NOT EXISTS empresa_id uuid REFERENCES public.empresas(id);
UPDATE public.orcamentos SET empresa_id = '00000000-0000-0000-0000-000000000001' WHERE empresa_id IS NULL;

-- Ordens de Serviço
ALTER TABLE public.ordens_servico ADD COLUMN IF NOT EXISTS empresa_id uuid REFERENCES public.empresas(id);
UPDATE public.ordens_servico SET empresa_id = '00000000-0000-0000-0000-000000000001' WHERE empresa_id IS NULL;

-- Recebimentos
ALTER TABLE public.recebimentos ADD COLUMN IF NOT EXISTS empresa_id uuid REFERENCES public.empresas(id);
UPDATE public.recebimentos SET empresa_id = '00000000-0000-0000-0000-000000000001' WHERE empresa_id IS NULL;

-- Lançamentos Financeiros
ALTER TABLE public.lancamentos_financeiros ADD COLUMN IF NOT EXISTS empresa_id uuid REFERENCES public.empresas(id);
UPDATE public.lancamentos_financeiros SET empresa_id = '00000000-0000-0000-0000-000000000001' WHERE empresa_id IS NULL;

-- Clientes
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS empresa_id uuid REFERENCES public.empresas(id);
UPDATE public.clientes SET empresa_id = '00000000-0000-0000-0000-000000000001' WHERE empresa_id IS NULL;

-- Fornecedores
ALTER TABLE public.fornecedores ADD COLUMN IF NOT EXISTS empresa_id uuid REFERENCES public.empresas(id);
UPDATE public.fornecedores SET empresa_id = '00000000-0000-0000-0000-000000000001' WHERE empresa_id IS NULL;

-- Contas Bancárias
ALTER TABLE public.contas_bancarias ADD COLUMN IF NOT EXISTS empresa_id uuid REFERENCES public.empresas(id);
UPDATE public.contas_bancarias SET empresa_id = '00000000-0000-0000-0000-000000000001' WHERE empresa_id IS NULL;

-- Categorias Financeiras
ALTER TABLE public.categorias_financeiras ADD COLUMN IF NOT EXISTS empresa_id uuid REFERENCES public.empresas(id);
UPDATE public.categorias_financeiras SET empresa_id = '00000000-0000-0000-0000-000000000001' WHERE empresa_id IS NULL;

-- Metas de Gastos
ALTER TABLE public.metas_gastos ADD COLUMN IF NOT EXISTS empresa_id uuid REFERENCES public.empresas(id);
UPDATE public.metas_gastos SET empresa_id = '00000000-0000-0000-0000-000000000001' WHERE empresa_id IS NULL;

-- Notas Fiscais
ALTER TABLE public.notas_fiscais ADD COLUMN IF NOT EXISTS empresa_id uuid REFERENCES public.empresas(id);
UPDATE public.notas_fiscais SET empresa_id = '00000000-0000-0000-0000-000000000001' WHERE empresa_id IS NULL;

-- Produtos NFe
ALTER TABLE public.produtos_nfe ADD COLUMN IF NOT EXISTS empresa_id uuid REFERENCES public.empresas(id);
UPDATE public.produtos_nfe SET empresa_id = '00000000-0000-0000-0000-000000000001' WHERE empresa_id IS NULL;

-- Contas a Receber
ALTER TABLE public.contas_receber ADD COLUMN IF NOT EXISTS empresa_id uuid REFERENCES public.empresas(id);
UPDATE public.contas_receber SET empresa_id = '00000000-0000-0000-0000-000000000001' WHERE empresa_id IS NULL;

-- Compras
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS empresa_id uuid REFERENCES public.empresas(id);
UPDATE public.compras SET empresa_id = '00000000-0000-0000-0000-000000000001' WHERE empresa_id IS NULL;

-- Configurações do Sistema
ALTER TABLE public.configuracoes_sistema ADD COLUMN IF NOT EXISTS empresa_id uuid REFERENCES public.empresas(id);
UPDATE public.configuracoes_sistema SET empresa_id = '00000000-0000-0000-0000-000000000001' WHERE empresa_id IS NULL;

-- Atividades do Sistema
ALTER TABLE public.atividades_sistema ADD COLUMN IF NOT EXISTS empresa_id uuid REFERENCES public.empresas(id);
UPDATE public.atividades_sistema SET empresa_id = '00000000-0000-0000-0000-000000000001' WHERE empresa_id IS NULL;

-- Aprovadores de Fluxo
ALTER TABLE public.aprovadores_fluxo ADD COLUMN IF NOT EXISTS empresa_id uuid REFERENCES public.empresas(id);
UPDATE public.aprovadores_fluxo SET empresa_id = '00000000-0000-0000-0000-000000000001' WHERE empresa_id IS NULL;

-- Testes de Equipamentos
ALTER TABLE public.testes_equipamentos ADD COLUMN IF NOT EXISTS empresa_id uuid REFERENCES public.empresas(id);
UPDATE public.testes_equipamentos SET empresa_id = '00000000-0000-0000-0000-000000000001' WHERE empresa_id IS NULL;

-- Fotos de Equipamentos
ALTER TABLE public.fotos_equipamentos ADD COLUMN IF NOT EXISTS empresa_id uuid REFERENCES public.empresas(id);
UPDATE public.fotos_equipamentos SET empresa_id = '00000000-0000-0000-0000-000000000001' WHERE empresa_id IS NULL;

-- Fotos de Orçamento
ALTER TABLE public.fotos_orcamento ADD COLUMN IF NOT EXISTS empresa_id uuid REFERENCES public.empresas(id);
UPDATE public.fotos_orcamento SET empresa_id = '00000000-0000-0000-0000-000000000001' WHERE empresa_id IS NULL;

-- Documentos de Ordem
ALTER TABLE public.documentos_ordem ADD COLUMN IF NOT EXISTS empresa_id uuid REFERENCES public.empresas(id);
UPDATE public.documentos_ordem SET empresa_id = '00000000-0000-0000-0000-000000000001' WHERE empresa_id IS NULL;

-- Itens de Orçamento
ALTER TABLE public.itens_orcamento ADD COLUMN IF NOT EXISTS empresa_id uuid REFERENCES public.empresas(id);
UPDATE public.itens_orcamento SET empresa_id = '00000000-0000-0000-0000-000000000001' WHERE empresa_id IS NULL;

-- Itens NFe
ALTER TABLE public.itens_nfe ADD COLUMN IF NOT EXISTS empresa_id uuid REFERENCES public.empresas(id);
UPDATE public.itens_nfe SET empresa_id = '00000000-0000-0000-0000-000000000001' WHERE empresa_id IS NULL;

-- Histórico de Orçamentos
ALTER TABLE public.historico_orcamentos ADD COLUMN IF NOT EXISTS empresa_id uuid REFERENCES public.empresas(id);
UPDATE public.historico_orcamentos SET empresa_id = '00000000-0000-0000-0000-000000000001' WHERE empresa_id IS NULL;

-- Histórico de Itens de Orçamento
ALTER TABLE public.historico_itens_orcamento ADD COLUMN IF NOT EXISTS empresa_id uuid REFERENCES public.empresas(id);
UPDATE public.historico_itens_orcamento SET empresa_id = '00000000-0000-0000-0000-000000000001' WHERE empresa_id IS NULL;

-- Histórico de Precificação
ALTER TABLE public.historico_precificacao ADD COLUMN IF NOT EXISTS empresa_id uuid REFERENCES public.empresas(id);
UPDATE public.historico_precificacao SET empresa_id = '00000000-0000-0000-0000-000000000001' WHERE empresa_id IS NULL;

-- Histórico de Lançamentos
ALTER TABLE public.historico_lancamentos ADD COLUMN IF NOT EXISTS empresa_id uuid REFERENCES public.empresas(id);
UPDATE public.historico_lancamentos SET empresa_id = '00000000-0000-0000-0000-000000000001' WHERE empresa_id IS NULL;

-- Clientes Marketing
ALTER TABLE public.clientes_marketing ADD COLUMN IF NOT EXISTS empresa_id uuid REFERENCES public.empresas(id);
UPDATE public.clientes_marketing SET empresa_id = '00000000-0000-0000-0000-000000000001' WHERE empresa_id IS NULL;

-- 6. CRIAR ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_orcamentos_empresa_id ON public.orcamentos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_ordens_servico_empresa_id ON public.ordens_servico(empresa_id);
CREATE INDEX IF NOT EXISTS idx_recebimentos_empresa_id ON public.recebimentos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_lancamentos_financeiros_empresa_id ON public.lancamentos_financeiros(empresa_id);
CREATE INDEX IF NOT EXISTS idx_clientes_empresa_id ON public.clientes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_fornecedores_empresa_id ON public.fornecedores(empresa_id);
CREATE INDEX IF NOT EXISTS idx_contas_bancarias_empresa_id ON public.contas_bancarias(empresa_id);
CREATE INDEX IF NOT EXISTS idx_categorias_financeiras_empresa_id ON public.categorias_financeiras(empresa_id);
CREATE INDEX IF NOT EXISTS idx_user_empresas_user_id ON public.user_empresas(user_id);
CREATE INDEX IF NOT EXISTS idx_user_empresas_empresa_id ON public.user_empresas(empresa_id);

-- 7. CRIAR FUNÇÃO HELPER PARA OBTER EMPRESA DO USUÁRIO
CREATE OR REPLACE FUNCTION public.get_user_empresa_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT empresa_id FROM public.user_empresas 
  WHERE user_id = auth.uid() 
  LIMIT 1
$$;

-- 8. CRIAR FUNÇÃO PARA VERIFICAR SE USUÁRIO PERTENCE À EMPRESA
CREATE OR REPLACE FUNCTION public.user_belongs_to_empresa(_empresa_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_empresas 
    WHERE user_id = auth.uid() 
    AND empresa_id = _empresa_id
  )
$$;

-- 9. HABILITAR RLS NAS NOVAS TABELAS
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_empresas ENABLE ROW LEVEL SECURITY;

-- 10. CRIAR POLÍTICAS RLS PARA EMPRESAS
CREATE POLICY "Usuários veem empresas às quais pertencem"
ON public.empresas FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_empresas 
    WHERE user_empresas.empresa_id = empresas.id 
    AND user_empresas.user_id = auth.uid()
  )
);

CREATE POLICY "Owners podem atualizar sua empresa"
ON public.empresas FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_empresas 
    WHERE user_empresas.empresa_id = empresas.id 
    AND user_empresas.user_id = auth.uid()
    AND user_empresas.is_owner = true
  )
);

CREATE POLICY "Admins podem criar empresas"
ON public.empresas FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 11. CRIAR POLÍTICAS RLS PARA USER_EMPRESAS
CREATE POLICY "Usuários veem seus próprios vínculos"
ON public.user_empresas FOR SELECT
USING (user_id = auth.uid() OR user_belongs_to_empresa(empresa_id));

CREATE POLICY "Owners podem adicionar usuários"
ON public.user_empresas FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_empresas ue
    WHERE ue.empresa_id = user_empresas.empresa_id
    AND ue.user_id = auth.uid()
    AND ue.is_owner = true
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Owners podem remover usuários"
ON public.user_empresas FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_empresas ue
    WHERE ue.empresa_id = user_empresas.empresa_id
    AND ue.user_id = auth.uid()
    AND ue.is_owner = true
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- 12. ATUALIZAR POLÍTICAS RLS DAS TABELAS DE DADOS (DROP E RECREATE)

-- ORÇAMENTOS
DROP POLICY IF EXISTS "Orçamentos são visíveis para todos" ON public.orcamentos;
DROP POLICY IF EXISTS "Qualquer um pode criar orçamentos" ON public.orcamentos;
DROP POLICY IF EXISTS "Qualquer um pode atualizar orçamentos" ON public.orcamentos;
DROP POLICY IF EXISTS "Qualquer um pode deletar orçamentos" ON public.orcamentos;

CREATE POLICY "Usuários veem orçamentos da sua empresa"
ON public.orcamentos FOR SELECT
USING (empresa_id = get_user_empresa_id() OR empresa_id IS NULL);

CREATE POLICY "Usuários criam orçamentos na sua empresa"
ON public.orcamentos FOR INSERT
WITH CHECK (empresa_id = get_user_empresa_id());

CREATE POLICY "Usuários atualizam orçamentos da sua empresa"
ON public.orcamentos FOR UPDATE
USING (empresa_id = get_user_empresa_id() OR empresa_id IS NULL);

CREATE POLICY "Usuários deletam orçamentos da sua empresa"
ON public.orcamentos FOR DELETE
USING (empresa_id = get_user_empresa_id() OR empresa_id IS NULL);

-- ORDENS DE SERVIÇO
DROP POLICY IF EXISTS "Ordens de serviço são visíveis para todos" ON public.ordens_servico;
DROP POLICY IF EXISTS "Qualquer um pode criar ordens de serviço" ON public.ordens_servico;
DROP POLICY IF EXISTS "Qualquer um pode atualizar ordens de serviço" ON public.ordens_servico;
DROP POLICY IF EXISTS "Qualquer um pode deletar ordens de serviço" ON public.ordens_servico;

CREATE POLICY "Usuários veem ordens da sua empresa"
ON public.ordens_servico FOR SELECT
USING (empresa_id = get_user_empresa_id() OR empresa_id IS NULL);

CREATE POLICY "Usuários criam ordens na sua empresa"
ON public.ordens_servico FOR INSERT
WITH CHECK (empresa_id = get_user_empresa_id());

CREATE POLICY "Usuários atualizam ordens da sua empresa"
ON public.ordens_servico FOR UPDATE
USING (empresa_id = get_user_empresa_id() OR empresa_id IS NULL);

CREATE POLICY "Usuários deletam ordens da sua empresa"
ON public.ordens_servico FOR DELETE
USING (empresa_id = get_user_empresa_id() OR empresa_id IS NULL);

-- RECEBIMENTOS
DROP POLICY IF EXISTS "Recebimentos são visíveis para todos" ON public.recebimentos;
DROP POLICY IF EXISTS "Qualquer um pode criar recebimentos" ON public.recebimentos;
DROP POLICY IF EXISTS "Qualquer um pode atualizar recebimentos" ON public.recebimentos;
DROP POLICY IF EXISTS "Qualquer um pode deletar recebimentos" ON public.recebimentos;

CREATE POLICY "Usuários veem recebimentos da sua empresa"
ON public.recebimentos FOR SELECT
USING (empresa_id = get_user_empresa_id() OR empresa_id IS NULL);

CREATE POLICY "Usuários criam recebimentos na sua empresa"
ON public.recebimentos FOR INSERT
WITH CHECK (empresa_id = get_user_empresa_id());

CREATE POLICY "Usuários atualizam recebimentos da sua empresa"
ON public.recebimentos FOR UPDATE
USING (empresa_id = get_user_empresa_id() OR empresa_id IS NULL);

CREATE POLICY "Usuários deletam recebimentos da sua empresa"
ON public.recebimentos FOR DELETE
USING (empresa_id = get_user_empresa_id() OR empresa_id IS NULL);

-- LANÇAMENTOS FINANCEIROS
DROP POLICY IF EXISTS "Lançamentos são visíveis para todos" ON public.lancamentos_financeiros;
DROP POLICY IF EXISTS "Qualquer um pode criar lançamentos" ON public.lancamentos_financeiros;
DROP POLICY IF EXISTS "Qualquer um pode atualizar lançamentos" ON public.lancamentos_financeiros;
DROP POLICY IF EXISTS "Qualquer um pode deletar lançamentos" ON public.lancamentos_financeiros;

CREATE POLICY "Usuários veem lançamentos da sua empresa"
ON public.lancamentos_financeiros FOR SELECT
USING (empresa_id = get_user_empresa_id() OR empresa_id IS NULL);

CREATE POLICY "Usuários criam lançamentos na sua empresa"
ON public.lancamentos_financeiros FOR INSERT
WITH CHECK (empresa_id = get_user_empresa_id());

CREATE POLICY "Usuários atualizam lançamentos da sua empresa"
ON public.lancamentos_financeiros FOR UPDATE
USING (empresa_id = get_user_empresa_id() OR empresa_id IS NULL);

CREATE POLICY "Usuários deletam lançamentos da sua empresa"
ON public.lancamentos_financeiros FOR DELETE
USING (empresa_id = get_user_empresa_id() OR empresa_id IS NULL);

-- CLIENTES
DROP POLICY IF EXISTS "Clientes são visíveis para todos" ON public.clientes;
DROP POLICY IF EXISTS "Qualquer um pode criar clientes" ON public.clientes;
DROP POLICY IF EXISTS "Qualquer um pode atualizar clientes" ON public.clientes;
DROP POLICY IF EXISTS "Qualquer um pode deletar clientes" ON public.clientes;

CREATE POLICY "Usuários veem clientes da sua empresa"
ON public.clientes FOR SELECT
USING (empresa_id = get_user_empresa_id() OR empresa_id IS NULL);

CREATE POLICY "Usuários criam clientes na sua empresa"
ON public.clientes FOR INSERT
WITH CHECK (empresa_id = get_user_empresa_id());

CREATE POLICY "Usuários atualizam clientes da sua empresa"
ON public.clientes FOR UPDATE
USING (empresa_id = get_user_empresa_id() OR empresa_id IS NULL);

CREATE POLICY "Usuários deletam clientes da sua empresa"
ON public.clientes FOR DELETE
USING (empresa_id = get_user_empresa_id() OR empresa_id IS NULL);

-- FORNECEDORES
DROP POLICY IF EXISTS "Fornecedores são visíveis para todos" ON public.fornecedores;
DROP POLICY IF EXISTS "Qualquer um pode criar fornecedores" ON public.fornecedores;
DROP POLICY IF EXISTS "Qualquer un pode atualizar fornecedores" ON public.fornecedores;
DROP POLICY IF EXISTS "Qualquer um pode atualizar fornecedores" ON public.fornecedores;
DROP POLICY IF EXISTS "Qualquer um pode deletar fornecedores" ON public.fornecedores;

CREATE POLICY "Usuários veem fornecedores da sua empresa"
ON public.fornecedores FOR SELECT
USING (empresa_id = get_user_empresa_id() OR empresa_id IS NULL);

CREATE POLICY "Usuários criam fornecedores na sua empresa"
ON public.fornecedores FOR INSERT
WITH CHECK (empresa_id = get_user_empresa_id());

CREATE POLICY "Usuários atualizam fornecedores da sua empresa"
ON public.fornecedores FOR UPDATE
USING (empresa_id = get_user_empresa_id() OR empresa_id IS NULL);

CREATE POLICY "Usuários deletam fornecedores da sua empresa"
ON public.fornecedores FOR DELETE
USING (empresa_id = get_user_empresa_id() OR empresa_id IS NULL);

-- CONTAS BANCÁRIAS
DROP POLICY IF EXISTS "Contas bancárias são visíveis para todos" ON public.contas_bancarias;
DROP POLICY IF EXISTS "Qualquer um pode criar contas bancárias" ON public.contas_bancarias;
DROP POLICY IF EXISTS "Qualquer um pode atualizar contas bancárias" ON public.contas_bancarias;
DROP POLICY IF EXISTS "Qualquer um pode deletar contas bancárias" ON public.contas_bancarias;

CREATE POLICY "Usuários veem contas da sua empresa"
ON public.contas_bancarias FOR SELECT
USING (empresa_id = get_user_empresa_id() OR empresa_id IS NULL);

CREATE POLICY "Usuários criam contas na sua empresa"
ON public.contas_bancarias FOR INSERT
WITH CHECK (empresa_id = get_user_empresa_id());

CREATE POLICY "Usuários atualizam contas da sua empresa"
ON public.contas_bancarias FOR UPDATE
USING (empresa_id = get_user_empresa_id() OR empresa_id IS NULL);

CREATE POLICY "Usuários deletam contas da sua empresa"
ON public.contas_bancarias FOR DELETE
USING (empresa_id = get_user_empresa_id() OR empresa_id IS NULL);

-- CATEGORIAS FINANCEIRAS
DROP POLICY IF EXISTS "Categorias são visíveis para todos" ON public.categorias_financeiras;
DROP POLICY IF EXISTS "Qualquer um pode criar categorias" ON public.categorias_financeiras;
DROP POLICY IF EXISTS "Qualquer um pode atualizar categorias" ON public.categorias_financeiras;
DROP POLICY IF EXISTS "Qualquer um pode deletar categorias" ON public.categorias_financeiras;

CREATE POLICY "Usuários veem categorias da sua empresa"
ON public.categorias_financeiras FOR SELECT
USING (empresa_id = get_user_empresa_id() OR empresa_id IS NULL);

CREATE POLICY "Usuários criam categorias na sua empresa"
ON public.categorias_financeiras FOR INSERT
WITH CHECK (empresa_id = get_user_empresa_id());

CREATE POLICY "Usuários atualizam categorias da sua empresa"
ON public.categorias_financeiras FOR UPDATE
USING (empresa_id = get_user_empresa_id() OR empresa_id IS NULL);

CREATE POLICY "Usuários deletam categorias da sua empresa"
ON public.categorias_financeiras FOR DELETE
USING (empresa_id = get_user_empresa_id() OR empresa_id IS NULL);

-- METAS DE GASTOS
DROP POLICY IF EXISTS "Metas são visíveis para todos" ON public.metas_gastos;
DROP POLICY IF EXISTS "Qualquer um pode criar metas" ON public.metas_gastos;
DROP POLICY IF EXISTS "Qualquer um pode atualizar metas" ON public.metas_gastos;
DROP POLICY IF EXISTS "Qualquer um pode deletar metas" ON public.metas_gastos;

CREATE POLICY "Usuários veem metas da sua empresa"
ON public.metas_gastos FOR SELECT
USING (empresa_id = get_user_empresa_id() OR empresa_id IS NULL);

CREATE POLICY "Usuários criam metas na sua empresa"
ON public.metas_gastos FOR INSERT
WITH CHECK (empresa_id = get_user_empresa_id());

CREATE POLICY "Usuários atualizam metas da sua empresa"
ON public.metas_gastos FOR UPDATE
USING (empresa_id = get_user_empresa_id() OR empresa_id IS NULL);

CREATE POLICY "Usuários deletam metas da sua empresa"
ON public.metas_gastos FOR DELETE
USING (empresa_id = get_user_empresa_id() OR empresa_id IS NULL);

-- NOTAS FISCAIS
DROP POLICY IF EXISTS "Notas fiscais são visíveis para todos" ON public.notas_fiscais;
DROP POLICY IF EXISTS "Qualquer um pode criar notas fiscais" ON public.notas_fiscais;
DROP POLICY IF EXISTS "Qualquer um pode atualizar notas fiscais" ON public.notas_fiscais;
DROP POLICY IF EXISTS "Qualquer um pode deletar notas fiscais" ON public.notas_fiscais;

CREATE POLICY "Usuários veem notas fiscais da sua empresa"
ON public.notas_fiscais FOR SELECT
USING (empresa_id = get_user_empresa_id() OR empresa_id IS NULL);

CREATE POLICY "Usuários criam notas fiscais na sua empresa"
ON public.notas_fiscais FOR INSERT
WITH CHECK (empresa_id = get_user_empresa_id());

CREATE POLICY "Usuários atualizam notas fiscais da sua empresa"
ON public.notas_fiscais FOR UPDATE
USING (empresa_id = get_user_empresa_id() OR empresa_id IS NULL);

CREATE POLICY "Usuários deletam notas fiscais da sua empresa"
ON public.notas_fiscais FOR DELETE
USING (empresa_id = get_user_empresa_id() OR empresa_id IS NULL);

-- CONTAS A RECEBER
DROP POLICY IF EXISTS "Contas a receber são visíveis para todos" ON public.contas_receber;
DROP POLICY IF EXISTS "Qualquer um pode criar contas a receber" ON public.contas_receber;
DROP POLICY IF EXISTS "Qualquer um pode atualizar contas a receber" ON public.contas_receber;
DROP POLICY IF EXISTS "Qualquer um pode deletar contas a receber" ON public.contas_receber;

CREATE POLICY "Usuários veem contas a receber da sua empresa"
ON public.contas_receber FOR SELECT
USING (empresa_id = get_user_empresa_id() OR empresa_id IS NULL);

CREATE POLICY "Usuários criam contas a receber na sua empresa"
ON public.contas_receber FOR INSERT
WITH CHECK (empresa_id = get_user_empresa_id());

CREATE POLICY "Usuários atualizam contas a receber da sua empresa"
ON public.contas_receber FOR UPDATE
USING (empresa_id = get_user_empresa_id() OR empresa_id IS NULL);

CREATE POLICY "Usuários deletam contas a receber da sua empresa"
ON public.contas_receber FOR DELETE
USING (empresa_id = get_user_empresa_id() OR empresa_id IS NULL);

-- COMPRAS
DROP POLICY IF EXISTS "Compras são visíveis para todos autenticados" ON public.compras;
DROP POLICY IF EXISTS "Qualquer um pode criar compras" ON public.compras;
DROP POLICY IF EXISTS "Qualquer um pode atualizar compras" ON public.compras;
DROP POLICY IF EXISTS "Qualquer um pode deletar compras" ON public.compras;

CREATE POLICY "Usuários veem compras da sua empresa"
ON public.compras FOR SELECT
USING (empresa_id = get_user_empresa_id() OR empresa_id IS NULL);

CREATE POLICY "Usuários criam compras na sua empresa"
ON public.compras FOR INSERT
WITH CHECK (empresa_id = get_user_empresa_id());

CREATE POLICY "Usuários atualizam compras da sua empresa"
ON public.compras FOR UPDATE
USING (empresa_id = get_user_empresa_id() OR empresa_id IS NULL);

CREATE POLICY "Usuários deletam compras da sua empresa"
ON public.compras FOR DELETE
USING (empresa_id = get_user_empresa_id() OR empresa_id IS NULL);

-- CONFIGURAÇÕES DO SISTEMA
DROP POLICY IF EXISTS "Configurações são visíveis para todos autenticados" ON public.configuracoes_sistema;
DROP POLICY IF EXISTS "Configurações podem ser criadas por autenticados" ON public.configuracoes_sistema;
DROP POLICY IF EXISTS "Configurações podem ser atualizadas por autenticados" ON public.configuracoes_sistema;

CREATE POLICY "Usuários veem configurações da sua empresa"
ON public.configuracoes_sistema FOR SELECT
USING (empresa_id = get_user_empresa_id() OR empresa_id IS NULL);

CREATE POLICY "Usuários criam configurações na sua empresa"
ON public.configuracoes_sistema FOR INSERT
WITH CHECK (empresa_id = get_user_empresa_id());

CREATE POLICY "Usuários atualizam configurações da sua empresa"
ON public.configuracoes_sistema FOR UPDATE
USING (empresa_id = get_user_empresa_id() OR empresa_id IS NULL);

-- ATIVIDADES DO SISTEMA
DROP POLICY IF EXISTS "Atividades são visíveis para todos" ON public.atividades_sistema;
DROP POLICY IF EXISTS "Qualquer um pode criar atividades" ON public.atividades_sistema;

CREATE POLICY "Usuários veem atividades da sua empresa"
ON public.atividades_sistema FOR SELECT
USING (empresa_id = get_user_empresa_id() OR empresa_id IS NULL);

CREATE POLICY "Usuários criam atividades na sua empresa"
ON public.atividades_sistema FOR INSERT
WITH CHECK (empresa_id = get_user_empresa_id() OR empresa_id IS NULL);

-- APROVADORES DE FLUXO
DROP POLICY IF EXISTS "Aprovadores são visíveis para todos autenticados" ON public.aprovadores_fluxo;
DROP POLICY IF EXISTS "Admins podem gerenciar aprovadores" ON public.aprovadores_fluxo;

CREATE POLICY "Usuários veem aprovadores da sua empresa"
ON public.aprovadores_fluxo FOR SELECT
USING (empresa_id = get_user_empresa_id() OR empresa_id IS NULL);

CREATE POLICY "Admins podem gerenciar aprovadores da empresa"
ON public.aprovadores_fluxo FOR ALL
USING (
  (empresa_id = get_user_empresa_id() OR empresa_id IS NULL)
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- TESTES DE EQUIPAMENTOS
DROP POLICY IF EXISTS "Testes são visíveis para todos os usuários autenticados" ON public.testes_equipamentos;
DROP POLICY IF EXISTS "Usuários podem criar testes" ON public.testes_equipamentos;
DROP POLICY IF EXISTS "Usuários podem atualizar testes" ON public.testes_equipamentos;

CREATE POLICY "Usuários veem testes da sua empresa"
ON public.testes_equipamentos FOR SELECT
USING (empresa_id = get_user_empresa_id() OR empresa_id IS NULL);

CREATE POLICY "Usuários criam testes na sua empresa"
ON public.testes_equipamentos FOR INSERT
WITH CHECK (empresa_id = get_user_empresa_id());

CREATE POLICY "Usuários atualizam testes da sua empresa"
ON public.testes_equipamentos FOR UPDATE
USING (empresa_id = get_user_empresa_id() OR empresa_id IS NULL);

-- FOTOS DE EQUIPAMENTOS
DROP POLICY IF EXISTS "Fotos são visíveis para todos" ON public.fotos_equipamentos;
DROP POLICY IF EXISTS "Qualquer um pode criar fotos" ON public.fotos_equipamentos;
DROP POLICY IF EXISTS "Qualquer um pode atualizar fotos" ON public.fotos_equipamentos;
DROP POLICY IF EXISTS "Qualquer um pode deletar fotos" ON public.fotos_equipamentos;

CREATE POLICY "Usuários veem fotos da sua empresa"
ON public.fotos_equipamentos FOR SELECT
USING (empresa_id = get_user_empresa_id() OR empresa_id IS NULL);

CREATE POLICY "Usuários criam fotos na sua empresa"
ON public.fotos_equipamentos FOR INSERT
WITH CHECK (empresa_id = get_user_empresa_id());

CREATE POLICY "Usuários atualizam fotos da sua empresa"
ON public.fotos_equipamentos FOR UPDATE
USING (empresa_id = get_user_empresa_id() OR empresa_id IS NULL);

CREATE POLICY "Usuários deletam fotos da sua empresa"
ON public.fotos_equipamentos FOR DELETE
USING (empresa_id = get_user_empresa_id() OR empresa_id IS NULL);

-- FOTOS DE ORÇAMENTO
DROP POLICY IF EXISTS "Fotos de orçamento são visíveis para todos" ON public.fotos_orcamento;
DROP POLICY IF EXISTS "Qualquer um pode criar fotos de orçamento" ON public.fotos_orcamento;
DROP POLICY IF EXISTS "Qualquer um pode atualizar fotos de orçamento" ON public.fotos_orcamento;
DROP POLICY IF EXISTS "Qualquer um pode deletar fotos de orçamento" ON public.fotos_orcamento;

CREATE POLICY "Usuários veem fotos de orçamento da sua empresa"
ON public.fotos_orcamento FOR SELECT
USING (empresa_id = get_user_empresa_id() OR empresa_id IS NULL);

CREATE POLICY "Usuários criam fotos de orçamento na sua empresa"
ON public.fotos_orcamento FOR INSERT
WITH CHECK (empresa_id = get_user_empresa_id());

CREATE POLICY "Usuários atualizam fotos de orçamento da sua empresa"
ON public.fotos_orcamento FOR UPDATE
USING (empresa_id = get_user_empresa_id() OR empresa_id IS NULL);

CREATE POLICY "Usuários deletam fotos de orçamento da sua empresa"
ON public.fotos_orcamento FOR DELETE
USING (empresa_id = get_user_empresa_id() OR empresa_id IS NULL);

-- DOCUMENTOS DE ORDEM
DROP POLICY IF EXISTS "Documentos de ordem são visíveis para todos" ON public.documentos_ordem;
DROP POLICY IF EXISTS "Qualquer um pode criar documentos de ordem" ON public.documentos_ordem;
DROP POLICY IF EXISTS "Qualquer um pode atualizar documentos de ordem" ON public.documentos_ordem;
DROP POLICY IF EXISTS "Qualquer um pode deletar documentos de ordem" ON public.documentos_ordem;

CREATE POLICY "Usuários veem documentos da sua empresa"
ON public.documentos_ordem FOR SELECT
USING (empresa_id = get_user_empresa_id() OR empresa_id IS NULL);

CREATE POLICY "Usuários criam documentos na sua empresa"
ON public.documentos_ordem FOR INSERT
WITH CHECK (empresa_id = get_user_empresa_id());

CREATE POLICY "Usuários atualizam documentos da sua empresa"
ON public.documentos_ordem FOR UPDATE
USING (empresa_id = get_user_empresa_id() OR empresa_id IS NULL);

CREATE POLICY "Usuários deletam documentos da sua empresa"
ON public.documentos_ordem FOR DELETE
USING (empresa_id = get_user_empresa_id() OR empresa_id IS NULL);

-- ITENS DE ORÇAMENTO
DROP POLICY IF EXISTS "Itens de orçamento são visíveis para todos" ON public.itens_orcamento;
DROP POLICY IF EXISTS "Qualquer um pode criar itens de orçamento" ON public.itens_orcamento;
DROP POLICY IF EXISTS "Qualquer um pode atualizar itens de orçamento" ON public.itens_orcamento;
DROP POLICY IF EXISTS "Qualquer um pode deletar itens de orçamento" ON public.itens_orcamento;

CREATE POLICY "Usuários veem itens de orçamento da sua empresa"
ON public.itens_orcamento FOR SELECT
USING (empresa_id = get_user_empresa_id() OR empresa_id IS NULL);

CREATE POLICY "Usuários criam itens na sua empresa"
ON public.itens_orcamento FOR INSERT
WITH CHECK (empresa_id = get_user_empresa_id());

CREATE POLICY "Usuários atualizam itens da sua empresa"
ON public.itens_orcamento FOR UPDATE
USING (empresa_id = get_user_empresa_id() OR empresa_id IS NULL);

CREATE POLICY "Usuários deletam itens da sua empresa"
ON public.itens_orcamento FOR DELETE
USING (empresa_id = get_user_empresa_id() OR empresa_id IS NULL);

-- ITENS NFE
DROP POLICY IF EXISTS "Itens NFe são visíveis para todos" ON public.itens_nfe;
DROP POLICY IF EXISTS "Qualquer um pode criar itens NFe" ON public.itens_nfe;
DROP POLICY IF EXISTS "Qualquer um pode atualizar itens NFe" ON public.itens_nfe;
DROP POLICY IF EXISTS "Qualquer um pode deletar itens NFe" ON public.itens_nfe;

CREATE POLICY "Usuários veem itens NFe da sua empresa"
ON public.itens_nfe FOR SELECT
USING (empresa_id = get_user_empresa_id() OR empresa_id IS NULL);

CREATE POLICY "Usuários criam itens NFe na sua empresa"
ON public.itens_nfe FOR INSERT
WITH CHECK (empresa_id = get_user_empresa_id());

CREATE POLICY "Usuários atualizam itens NFe da sua empresa"
ON public.itens_nfe FOR UPDATE
USING (empresa_id = get_user_empresa_id() OR empresa_id IS NULL);

CREATE POLICY "Usuários deletam itens NFe da sua empresa"
ON public.itens_nfe FOR DELETE
USING (empresa_id = get_user_empresa_id() OR empresa_id IS NULL);

-- PRODUTOS NFE
DROP POLICY IF EXISTS "Produtos NFe são visíveis para todos" ON public.produtos_nfe;
DROP POLICY IF EXISTS "Qualquer um pode criar produtos NFe" ON public.produtos_nfe;
DROP POLICY IF EXISTS "Qualquer um pode atualizar produtos NFe" ON public.produtos_nfe;

CREATE POLICY "Usuários veem produtos NFe da sua empresa"
ON public.produtos_nfe FOR SELECT
USING (empresa_id = get_user_empresa_id() OR empresa_id IS NULL);

CREATE POLICY "Usuários criam produtos NFe na sua empresa"
ON public.produtos_nfe FOR INSERT
WITH CHECK (empresa_id = get_user_empresa_id());

CREATE POLICY "Usuários atualizam produtos NFe da sua empresa"
ON public.produtos_nfe FOR UPDATE
USING (empresa_id = get_user_empresa_id() OR empresa_id IS NULL);

-- HISTÓRICO DE ORÇAMENTOS
DROP POLICY IF EXISTS "Histórico de orçamentos é visível para todos" ON public.historico_orcamentos;
DROP POLICY IF EXISTS "Qualquer um pode criar histórico de orçamentos" ON public.historico_orcamentos;
DROP POLICY IF EXISTS "Qualquer um pode atualizar histórico de orçamentos" ON public.historico_orcamentos;
DROP POLICY IF EXISTS "Qualquer um pode deletar histórico de orçamentos" ON public.historico_orcamentos;

CREATE POLICY "Usuários veem histórico de orçamentos da sua empresa"
ON public.historico_orcamentos FOR SELECT
USING (empresa_id = get_user_empresa_id() OR empresa_id IS NULL);

CREATE POLICY "Usuários criam histórico na sua empresa"
ON public.historico_orcamentos FOR INSERT
WITH CHECK (empresa_id = get_user_empresa_id());

CREATE POLICY "Usuários atualizam histórico da sua empresa"
ON public.historico_orcamentos FOR UPDATE
USING (empresa_id = get_user_empresa_id() OR empresa_id IS NULL);

CREATE POLICY "Usuários deletam histórico da sua empresa"
ON public.historico_orcamentos FOR DELETE
USING (empresa_id = get_user_empresa_id() OR empresa_id IS NULL);

-- HISTÓRICO DE ITENS DE ORÇAMENTO
DROP POLICY IF EXISTS "Histórico de itens é visível para todos" ON public.historico_itens_orcamento;
DROP POLICY IF EXISTS "Qualquer um pode criar histórico de itens" ON public.historico_itens_orcamento;
DROP POLICY IF EXISTS "Qualquer um pode atualizar histórico de itens" ON public.historico_itens_orcamento;
DROP POLICY IF EXISTS "Qualquer um pode deletar histórico de itens" ON public.historico_itens_orcamento;

CREATE POLICY "Usuários veem histórico de itens da sua empresa"
ON public.historico_itens_orcamento FOR SELECT
USING (empresa_id = get_user_empresa_id() OR empresa_id IS NULL);

CREATE POLICY "Usuários criam histórico de itens na sua empresa"
ON public.historico_itens_orcamento FOR INSERT
WITH CHECK (empresa_id = get_user_empresa_id());

CREATE POLICY "Usuários atualizam histórico de itens da sua empresa"
ON public.historico_itens_orcamento FOR UPDATE
USING (empresa_id = get_user_empresa_id() OR empresa_id IS NULL);

CREATE POLICY "Usuários deletam histórico de itens da sua empresa"
ON public.historico_itens_orcamento FOR DELETE
USING (empresa_id = get_user_empresa_id() OR empresa_id IS NULL);

-- HISTÓRICO DE PRECIFICAÇÃO
DROP POLICY IF EXISTS "Histórico de precificação é visível para todos" ON public.historico_precificacao;
DROP POLICY IF EXISTS "Qualquer um pode criar histórico de precificação" ON public.historico_precificacao;
DROP POLICY IF EXISTS "Qualquer um pode atualizar histórico de precificação" ON public.historico_precificacao;
DROP POLICY IF EXISTS "Qualquer um pode deletar histórico de precificação" ON public.historico_precificacao;

CREATE POLICY "Usuários veem histórico de precificação da sua empresa"
ON public.historico_precificacao FOR SELECT
USING (empresa_id = get_user_empresa_id() OR empresa_id IS NULL);

CREATE POLICY "Usuários criam histórico de precificação na sua empresa"
ON public.historico_precificacao FOR INSERT
WITH CHECK (empresa_id = get_user_empresa_id());

CREATE POLICY "Usuários atualizam histórico de precificação da sua empresa"
ON public.historico_precificacao FOR UPDATE
USING (empresa_id = get_user_empresa_id() OR empresa_id IS NULL);

CREATE POLICY "Usuários deletam histórico de precificação da sua empresa"
ON public.historico_precificacao FOR DELETE
USING (empresa_id = get_user_empresa_id() OR empresa_id IS NULL);

-- HISTÓRICO DE LANÇAMENTOS
DROP POLICY IF EXISTS "Histórico é visível para todos autenticados" ON public.historico_lancamentos;
DROP POLICY IF EXISTS "Sistema pode criar histórico" ON public.historico_lancamentos;

CREATE POLICY "Usuários veem histórico de lançamentos da sua empresa"
ON public.historico_lancamentos FOR SELECT
USING (empresa_id = get_user_empresa_id() OR empresa_id IS NULL);

CREATE POLICY "Usuários criam histórico de lançamentos na sua empresa"
ON public.historico_lancamentos FOR INSERT
WITH CHECK (empresa_id = get_user_empresa_id() OR empresa_id IS NULL);

-- CLIENTES MARKETING
DROP POLICY IF EXISTS "Qualquer um pode criar registro de marketing" ON public.clientes_marketing;
DROP POLICY IF EXISTS "Usuários autenticados podem ver registros" ON public.clientes_marketing;

CREATE POLICY "Usuários veem clientes marketing da sua empresa"
ON public.clientes_marketing FOR SELECT
USING (empresa_id = get_user_empresa_id() OR empresa_id IS NULL);

CREATE POLICY "Usuários criam clientes marketing na sua empresa"
ON public.clientes_marketing FOR INSERT
WITH CHECK (true);

-- EMPRESAS NFE (tabela antiga - mantém políticas existentes mas adiciona empresa_id)
ALTER TABLE public.empresas_nfe ADD COLUMN IF NOT EXISTS empresa_id uuid REFERENCES public.empresas(id);
UPDATE public.empresas_nfe SET empresa_id = '00000000-0000-0000-0000-000000000001' WHERE empresa_id IS NULL;

DROP POLICY IF EXISTS "Empresas NFe são visíveis para todos" ON public.empresas_nfe;
DROP POLICY IF EXISTS "Qualquer um pode criar empresas NFe" ON public.empresas_nfe;
DROP POLICY IF EXISTS "Qualquer um pode atualizar empresas NFe" ON public.empresas_nfe;

CREATE POLICY "Usuários veem empresas NFe da sua empresa"
ON public.empresas_nfe FOR SELECT
USING (empresa_id = get_user_empresa_id() OR empresa_id IS NULL);

CREATE POLICY "Usuários criam empresas NFe na sua empresa"
ON public.empresas_nfe FOR INSERT
WITH CHECK (empresa_id = get_user_empresa_id());

CREATE POLICY "Usuários atualizam empresas NFe da sua empresa"
ON public.empresas_nfe FOR UPDATE
USING (empresa_id = get_user_empresa_id() OR empresa_id IS NULL);

-- 13. ATUALIZAR TRIGGER DE ATIVIDADES PARA INCLUIR empresa_id
CREATE OR REPLACE FUNCTION public.registrar_atividade(
  p_tipo text, 
  p_descricao text, 
  p_entidade_tipo text DEFAULT NULL, 
  p_entidade_id text DEFAULT NULL, 
  p_metadados jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_atividade_id uuid;
  v_empresa_id uuid;
BEGIN
  -- Obter empresa do usuário atual
  SELECT get_user_empresa_id() INTO v_empresa_id;
  
  INSERT INTO public.atividades_sistema (tipo, descricao, entidade_tipo, entidade_id, metadados, empresa_id)
  VALUES (p_tipo, p_descricao, p_entidade_tipo, p_entidade_id, p_metadados, v_empresa_id)
  RETURNING id INTO v_atividade_id;
  
  RETURN v_atividade_id;
END;
$$;

-- 14. DEFINIR PRIMEIRO USUÁRIO COMO OWNER DA MECHIDRO
UPDATE public.user_empresas 
SET is_owner = true 
WHERE empresa_id = '00000000-0000-0000-0000-000000000001'
AND user_id = (
  SELECT user_id FROM public.user_empresas 
  WHERE empresa_id = '00000000-0000-0000-0000-000000000001' 
  ORDER BY created_at 
  LIMIT 1
);
