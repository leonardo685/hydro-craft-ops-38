-- Renomear coluna observacoes para problemas_apresentados na tabela recebimentos
ALTER TABLE public.recebimentos 
RENAME COLUMN observacoes TO problemas_apresentados;