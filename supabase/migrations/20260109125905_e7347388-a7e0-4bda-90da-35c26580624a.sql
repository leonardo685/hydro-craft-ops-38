-- Política para acesso público às ordens de serviço (apenas SELECT)
-- Permite que qualquer pessoa consulte pelo numero_ordem (para QR code estático)
CREATE POLICY "Acesso público às ordens por numero_ordem" 
ON public.ordens_servico 
FOR SELECT 
USING (true);

-- Remover política antiga que restringe SELECT
DROP POLICY IF EXISTS "Usuários veem ordens da sua empresa" ON public.ordens_servico;

-- Política para acesso público aos testes de equipamentos (apenas SELECT)
CREATE POLICY "Acesso público aos testes de equipamentos" 
ON public.testes_equipamentos 
FOR SELECT 
USING (true);

-- Remover política antiga que restringe SELECT em testes
DROP POLICY IF EXISTS "Usuários veem testes da sua empresa" ON public.testes_equipamentos;

-- Política para acesso público às fotos de equipamentos (apenas SELECT)
CREATE POLICY "Acesso público às fotos de equipamentos" 
ON public.fotos_equipamentos 
FOR SELECT 
USING (true);

-- Remover política antiga que restringe SELECT em fotos
DROP POLICY IF EXISTS "Usuários veem fotos da sua empresa" ON public.fotos_equipamentos;

-- Política para acesso público aos recebimentos (apenas SELECT para nota de retorno)
CREATE POLICY "Acesso público aos recebimentos" 
ON public.recebimentos 
FOR SELECT 
USING (true);

-- Remover política antiga que restringe SELECT em recebimentos
DROP POLICY IF EXISTS "Usuários veem recebimentos da sua empresa" ON public.recebimentos;

-- Política para permitir INSERT público em clientes_marketing (formulário de captura)
CREATE POLICY "Permitir inserção pública em clientes_marketing" 
ON public.clientes_marketing 
FOR INSERT 
WITH CHECK (true);

-- Política para permitir SELECT público em clientes_marketing (verificar se já existe)
CREATE POLICY "Permitir select público em clientes_marketing" 
ON public.clientes_marketing 
FOR SELECT 
USING (true);

-- Política para permitir UPDATE público em clientes_marketing
CREATE POLICY "Permitir update público em clientes_marketing" 
ON public.clientes_marketing 
FOR UPDATE 
USING (true);

-- Acesso público às empresas para carregar logo
CREATE POLICY "Acesso público ao logo das empresas" 
ON public.empresas 
FOR SELECT 
USING (true);