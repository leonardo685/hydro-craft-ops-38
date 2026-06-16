ALTER TABLE public.metas_gastos ADD COLUMN IF NOT EXISTS escopo text NOT NULL DEFAULT 'categoria';
ALTER TABLE public.metas_gastos ALTER COLUMN categoria_id DROP NOT NULL;
ALTER TABLE public.metas_gastos ADD CONSTRAINT metas_gastos_escopo_check CHECK (escopo IN ('categoria','total_entradas','total_saidas'));
ALTER TABLE public.metas_gastos ADD CONSTRAINT metas_gastos_categoria_required CHECK (escopo <> 'categoria' OR categoria_id IS NOT NULL);