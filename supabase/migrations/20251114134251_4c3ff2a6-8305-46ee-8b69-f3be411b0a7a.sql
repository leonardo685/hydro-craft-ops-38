-- Add garantia and validade_proposta columns to orcamentos table
ALTER TABLE public.orcamentos 
ADD COLUMN garantia TEXT,
ADD COLUMN validade_proposta TEXT;

-- Add garantia and validade_proposta columns to historico_orcamentos table
ALTER TABLE public.historico_orcamentos 
ADD COLUMN garantia TEXT,
ADD COLUMN validade_proposta TEXT;