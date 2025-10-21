-- Permitir que usuários vejam sua própria role
CREATE POLICY "Usuários podem ver sua própria role"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Comentário: Esta política resolve o problema circular onde usuários não conseguiam
-- buscar sua própria role porque a RLS bloqueava o acesso