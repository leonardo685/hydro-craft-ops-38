-- Add 'finalizado' status to orcamentos status constraint
ALTER TABLE orcamentos DROP CONSTRAINT orcamentos_status_check;
ALTER TABLE orcamentos ADD CONSTRAINT orcamentos_status_check 
  CHECK (status = ANY (ARRAY['pendente'::text, 'aprovado'::text, 'rejeitado'::text, 'finalizado'::text]));