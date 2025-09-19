-- Adicionar campo para PDF da nota fiscal nas ordens de serviço
ALTER TABLE public.ordens_servico 
ADD COLUMN pdf_nota_fiscal TEXT;

-- Adicionar campo para URL do PDF nas tabelas de recebimentos para notas de retorno
ALTER TABLE public.recebimentos 
ADD COLUMN pdf_nota_retorno TEXT;