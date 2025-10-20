-- Criar tabela de atividades do sistema
CREATE TABLE IF NOT EXISTS public.atividades_sistema (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo text NOT NULL,
  descricao text NOT NULL,
  entidade_tipo text,
  entidade_id text,
  metadados jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.atividades_sistema ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Atividades são visíveis para todos"
ON public.atividades_sistema
FOR SELECT
USING (true);

CREATE POLICY "Qualquer um pode criar atividades"
ON public.atividades_sistema
FOR INSERT
WITH CHECK (true);

-- Índice para performance
CREATE INDEX idx_atividades_created_at ON public.atividades_sistema(created_at DESC);
CREATE INDEX idx_atividades_tipo ON public.atividades_sistema(tipo);

-- Função para registrar atividade
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
BEGIN
  INSERT INTO public.atividades_sistema (tipo, descricao, entidade_tipo, entidade_id, metadados)
  VALUES (p_tipo, p_descricao, p_entidade_tipo, p_entidade_id, p_metadados)
  RETURNING id INTO v_atividade_id;
  
  RETURN v_atividade_id;
END;
$$;

-- Trigger para registrar recebimentos
CREATE OR REPLACE FUNCTION public.trigger_registrar_recebimento()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM registrar_atividade(
    'recebimento',
    NEW.tipo_equipamento || ' recebido',
    'recebimento',
    NEW.id::text,
    jsonb_build_object('cliente', NEW.cliente_nome, 'numero_ordem', NEW.numero_ordem)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER after_insert_recebimento
AFTER INSERT ON public.recebimentos
FOR EACH ROW
EXECUTE FUNCTION public.trigger_registrar_recebimento();

-- Trigger para registrar ordens de serviço
CREATE OR REPLACE FUNCTION public.trigger_registrar_ordem_servico()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM registrar_atividade(
      'ordem_servico',
      'Ordem de serviço ' || NEW.numero_ordem || ' criada',
      'ordem_servico',
      NEW.id::text,
      jsonb_build_object('cliente', NEW.cliente_nome, 'equipamento', NEW.equipamento)
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    IF NEW.status = 'finalizado' THEN
      PERFORM registrar_atividade(
        'ordem_finalizada',
        'Análise de ' || NEW.equipamento || ' finalizada',
        'ordem_servico',
        NEW.id::text,
        jsonb_build_object('cliente', NEW.cliente_nome, 'numero_ordem', NEW.numero_ordem)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER after_insert_update_ordem_servico
AFTER INSERT OR UPDATE ON public.ordens_servico
FOR EACH ROW
EXECUTE FUNCTION public.trigger_registrar_ordem_servico();

-- Trigger para registrar orçamentos
CREATE OR REPLACE FUNCTION public.trigger_registrar_orcamento()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM registrar_atividade(
      'orcamento',
      'Orçamento ' || NEW.numero || ' criado',
      'orcamento',
      NEW.id::text,
      jsonb_build_object('cliente', NEW.cliente_nome, 'valor', NEW.valor)
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    IF NEW.status = 'aprovado' OR NEW.status = 'faturamento' THEN
      PERFORM registrar_atividade(
        'orcamento_aprovado',
        'Orçamento ' || NEW.numero || ' aprovado',
        'orcamento',
        NEW.id::text,
        jsonb_build_object('cliente', NEW.cliente_nome, 'valor', NEW.valor)
      );
    ELSIF NEW.status = 'finalizado' AND NEW.numero_nf IS NOT NULL THEN
      PERFORM registrar_atividade(
        'faturamento',
        'Nota Fiscal ' || NEW.numero_nf || ' emitida',
        'orcamento',
        NEW.id::text,
        jsonb_build_object('cliente', NEW.cliente_nome, 'valor', NEW.valor)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER after_insert_update_orcamento
AFTER INSERT OR UPDATE ON public.orcamentos
FOR EACH ROW
EXECUTE FUNCTION public.trigger_registrar_orcamento();

-- Limpar dados existentes (usando DELETE direto nas tabelas)
TRUNCATE TABLE public.testes_equipamentos CASCADE;
TRUNCATE TABLE public.itens_orcamento CASCADE;
TRUNCATE TABLE public.fotos_orcamento CASCADE;
TRUNCATE TABLE public.contas_receber CASCADE;
TRUNCATE TABLE public.orcamentos CASCADE;
TRUNCATE TABLE public.ordens_servico CASCADE;
TRUNCATE TABLE public.fotos_equipamentos CASCADE;
TRUNCATE TABLE public.itens_nfe CASCADE;
TRUNCATE TABLE public.recebimentos CASCADE;
TRUNCATE TABLE public.notas_fiscais CASCADE;