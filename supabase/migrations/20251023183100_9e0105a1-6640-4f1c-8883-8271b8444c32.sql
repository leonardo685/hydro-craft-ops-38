-- Criar tabela de histórico de lançamentos financeiros
CREATE TABLE public.historico_lancamentos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lancamento_id uuid NOT NULL,
  tipo_acao text NOT NULL, -- 'criado', 'editado', 'excluido', 'pago', 'despago'
  campo_alterado text, -- campo que foi alterado (ex: 'valor', 'data_esperada', 'descricao')
  valor_anterior text, -- valor antes da alteração
  valor_novo text, -- valor depois da alteração
  usuario_id uuid REFERENCES auth.users(id),
  metadados jsonb DEFAULT '{}'::jsonb, -- informações adicionais
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Índices para melhor performance
CREATE INDEX idx_historico_lancamentos_lancamento_id ON public.historico_lancamentos(lancamento_id);
CREATE INDEX idx_historico_lancamentos_created_at ON public.historico_lancamentos(created_at DESC);
CREATE INDEX idx_historico_lancamentos_tipo_acao ON public.historico_lancamentos(tipo_acao);

-- RLS Policies
ALTER TABLE public.historico_lancamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Histórico é visível para todos autenticados"
  ON public.historico_lancamentos
  FOR SELECT
  USING (true);

CREATE POLICY "Sistema pode criar histórico"
  ON public.historico_lancamentos
  FOR INSERT
  WITH CHECK (true);

-- Função para registrar histórico de alterações
CREATE OR REPLACE FUNCTION public.registrar_historico_lancamento()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_campo text;
  v_valor_antigo text;
  v_valor_novo text;
BEGIN
  -- Inserção de novo lançamento
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.historico_lancamentos (
      lancamento_id,
      tipo_acao,
      usuario_id,
      metadados
    ) VALUES (
      NEW.id,
      'criado',
      auth.uid(),
      jsonb_build_object(
        'descricao', NEW.descricao,
        'valor', NEW.valor,
        'tipo', NEW.tipo,
        'data_esperada', NEW.data_esperada
      )
    );
    RETURN NEW;
  END IF;

  -- Exclusão de lançamento
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.historico_lancamentos (
      lancamento_id,
      tipo_acao,
      usuario_id,
      metadados
    ) VALUES (
      OLD.id,
      'excluido',
      auth.uid(),
      jsonb_build_object(
        'descricao', OLD.descricao,
        'valor', OLD.valor,
        'tipo', OLD.tipo,
        'data_esperada', OLD.data_esperada
      )
    );
    RETURN OLD;
  END IF;

  -- Atualização - verifica cada campo alterado
  IF TG_OP = 'UPDATE' THEN
    -- Mudança de status de pagamento
    IF OLD.pago != NEW.pago THEN
      INSERT INTO public.historico_lancamentos (
        lancamento_id,
        tipo_acao,
        campo_alterado,
        valor_anterior,
        valor_novo,
        usuario_id,
        metadados
      ) VALUES (
        NEW.id,
        CASE WHEN NEW.pago THEN 'pago' ELSE 'despago' END,
        'status_pagamento',
        OLD.pago::text,
        NEW.pago::text,
        auth.uid(),
        jsonb_build_object('descricao', NEW.descricao)
      );
    END IF;

    -- Mudança de valor
    IF OLD.valor != NEW.valor THEN
      INSERT INTO public.historico_lancamentos (
        lancamento_id,
        tipo_acao,
        campo_alterado,
        valor_anterior,
        valor_novo,
        usuario_id,
        metadados
      ) VALUES (
        NEW.id,
        'editado',
        'valor',
        OLD.valor::text,
        NEW.valor::text,
        auth.uid(),
        jsonb_build_object('descricao', NEW.descricao)
      );
    END IF;

    -- Mudança de data esperada
    IF OLD.data_esperada != NEW.data_esperada THEN
      INSERT INTO public.historico_lancamentos (
        lancamento_id,
        tipo_acao,
        campo_alterado,
        valor_anterior,
        valor_novo,
        usuario_id,
        metadados
      ) VALUES (
        NEW.id,
        'editado',
        'data_esperada',
        OLD.data_esperada::text,
        NEW.data_esperada::text,
        auth.uid(),
        jsonb_build_object('descricao', NEW.descricao)
      );
    END IF;

    -- Mudança de data realizada
    IF (OLD.data_realizada IS DISTINCT FROM NEW.data_realizada) THEN
      INSERT INTO public.historico_lancamentos (
        lancamento_id,
        tipo_acao,
        campo_alterado,
        valor_anterior,
        valor_novo,
        usuario_id,
        metadados
      ) VALUES (
        NEW.id,
        'editado',
        'data_realizada',
        COALESCE(OLD.data_realizada::text, 'null'),
        COALESCE(NEW.data_realizada::text, 'null'),
        auth.uid(),
        jsonb_build_object('descricao', NEW.descricao)
      );
    END IF;

    -- Mudança de descrição
    IF OLD.descricao != NEW.descricao THEN
      INSERT INTO public.historico_lancamentos (
        lancamento_id,
        tipo_acao,
        campo_alterado,
        valor_anterior,
        valor_novo,
        usuario_id,
        metadados
      ) VALUES (
        NEW.id,
        'editado',
        'descricao',
        OLD.descricao,
        NEW.descricao,
        auth.uid(),
        jsonb_build_object('tipo', NEW.tipo)
      );
    END IF;

    -- Mudança de tipo
    IF OLD.tipo != NEW.tipo THEN
      INSERT INTO public.historico_lancamentos (
        lancamento_id,
        tipo_acao,
        campo_alterado,
        valor_anterior,
        valor_novo,
        usuario_id,
        metadados
      ) VALUES (
        NEW.id,
        'editado',
        'tipo',
        OLD.tipo,
        NEW.tipo,
        auth.uid(),
        jsonb_build_object('descricao', NEW.descricao)
      );
    END IF;

    -- Mudança de categoria
    IF (OLD.categoria_id IS DISTINCT FROM NEW.categoria_id) THEN
      INSERT INTO public.historico_lancamentos (
        lancamento_id,
        tipo_acao,
        campo_alterado,
        valor_anterior,
        valor_novo,
        usuario_id,
        metadados
      ) VALUES (
        NEW.id,
        'editado',
        'categoria',
        COALESCE(OLD.categoria_id::text, 'null'),
        COALESCE(NEW.categoria_id::text, 'null'),
        auth.uid(),
        jsonb_build_object('descricao', NEW.descricao)
      );
    END IF;

    -- Mudança de conta bancária
    IF OLD.conta_bancaria != NEW.conta_bancaria THEN
      INSERT INTO public.historico_lancamentos (
        lancamento_id,
        tipo_acao,
        campo_alterado,
        valor_anterior,
        valor_novo,
        usuario_id,
        metadados
      ) VALUES (
        NEW.id,
        'editado',
        'conta_bancaria',
        OLD.conta_bancaria,
        NEW.conta_bancaria,
        auth.uid(),
        jsonb_build_object('descricao', NEW.descricao)
      );
    END IF;

    -- Mudança de fornecedor/cliente
    IF (OLD.fornecedor_cliente IS DISTINCT FROM NEW.fornecedor_cliente) THEN
      INSERT INTO public.historico_lancamentos (
        lancamento_id,
        tipo_acao,
        campo_alterado,
        valor_anterior,
        valor_novo,
        usuario_id,
        metadados
      ) VALUES (
        NEW.id,
        'editado',
        'fornecedor_cliente',
        COALESCE(OLD.fornecedor_cliente, 'null'),
        COALESCE(NEW.fornecedor_cliente, 'null'),
        auth.uid(),
        jsonb_build_object('descricao', NEW.descricao)
      );
    END IF;

    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$function$;

-- Criar trigger para rastrear mudanças
CREATE TRIGGER trigger_historico_lancamentos
  AFTER INSERT OR UPDATE OR DELETE ON public.lancamentos_financeiros
  FOR EACH ROW
  EXECUTE FUNCTION public.registrar_historico_lancamento();