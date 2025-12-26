-- Permitir que qualquer pessoa veja empresas com convites válidos (não usados e não expirados)
CREATE POLICY "Empresas com convites válidos são visíveis publicamente"
ON empresas
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM convites_empresa
    WHERE convites_empresa.empresa_id = empresas.id
      AND convites_empresa.used = false
      AND convites_empresa.expires_at > now()
  )
);