
-- Limpar todas as tabelas de dados operacionais, mantendo apenas cadastros

-- 1. Limpar fotos de equipamentos
DELETE FROM public.fotos_equipamentos;

-- 2. Limpar fotos de orçamento
DELETE FROM public.fotos_orcamento;

-- 3. Limpar itens de orçamento
DELETE FROM public.itens_orcamento;

-- 4. Limpar testes de equipamentos
DELETE FROM public.testes_equipamentos;

-- 5. Limpar contas a receber
DELETE FROM public.contas_receber;

-- 6. Limpar lançamentos financeiros
DELETE FROM public.lancamentos_financeiros;

-- 7. Limpar metas de gastos
DELETE FROM public.metas_gastos;

-- 8. Limpar orçamentos
DELETE FROM public.orcamentos;

-- 9. Limpar ordens de serviço
DELETE FROM public.ordens_servico;

-- 10. Limpar recebimentos
DELETE FROM public.recebimentos;

-- 11. Limpar itens de NFe
DELETE FROM public.itens_nfe;

-- 12. Limpar notas fiscais
DELETE FROM public.notas_fiscais;

-- 13. Limpar empresas e produtos NFe
DELETE FROM public.produtos_nfe;
DELETE FROM public.empresas_nfe;
