-- Etapa 1: Atualizar Trigger de Recebimentos
CREATE OR REPLACE FUNCTION public.trigger_registrar_recebimento()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM registrar_atividade(
    'recebimento',
    CASE 
      WHEN NEW.tipo_equipamento IS NOT NULL AND NEW.tipo_equipamento != '' THEN
        NEW.tipo_equipamento || ' (' || NEW.numero_ordem || ') recebido'
      ELSE
        'Equipamento ' || NEW.numero_ordem || ' recebido'
    END,
    'recebimento',
    NEW.id::text,
    jsonb_build_object('cliente', NEW.cliente_nome, 'numero_ordem', NEW.numero_ordem)
  );
  RETURN NEW;
END;
$$;

-- Etapa 2: Atualizar Trigger de Ordens de Serviço
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
    IF NEW.status = 'finalizado' OR NEW.status = 'concluido' THEN
      PERFORM registrar_atividade(
        'ordem_finalizada',
        'Ordem ' || NEW.numero_ordem || ' finalizada',
        'ordem_servico',
        NEW.id::text,
        jsonb_build_object('cliente', NEW.cliente_nome, 'equipamento', NEW.equipamento)
      );
    ELSIF NEW.status = 'aguardando_retorno' THEN
      PERFORM registrar_atividade(
        'ordem_aguardando_retorno',
        'Ordem ' || NEW.numero_ordem || ' aguardando retorno',
        'ordem_servico',
        NEW.id::text,
        jsonb_build_object('cliente', NEW.cliente_nome, 'equipamento', NEW.equipamento)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Etapa 3: Atualizar Trigger de Orçamentos
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
      'Orçamento ' || REPLACE(NEW.numero, '/', '-') || ' criado',
      'orcamento',
      NEW.id::text,
      jsonb_build_object('cliente', NEW.cliente_nome, 'valor', NEW.valor)
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    IF NEW.status = 'aprovado' OR NEW.status = 'faturamento' THEN
      PERFORM registrar_atividade(
        'orcamento_aprovado',
        'Orçamento ' || REPLACE(NEW.numero, '/', '-') || ' aprovado',
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

-- Etapa 4: Corrigir descrições de orçamentos existentes (trocar / por -)
UPDATE atividades_sistema
SET descricao = REPLACE(descricao, '/', '-')
WHERE tipo = 'orcamento'
  AND descricao LIKE '%/%';

-- Etapa 5: Corrigir descrições de recebimentos vazias
UPDATE atividades_sistema a
SET descricao = 
  CASE 
    WHEN COALESCE((a.metadados->>'numero_ordem')::text, '') != '' THEN
      COALESCE((a.metadados->>'tipo_equipamento')::text || ' (', 'Equipamento ') || 
      (a.metadados->>'numero_ordem') || 
      CASE WHEN COALESCE((a.metadados->>'tipo_equipamento')::text, '') != '' THEN ')' ELSE '' END ||
      ' recebido'
    ELSE
      a.descricao
  END
WHERE a.tipo = 'recebimento'
  AND (a.descricao = ' recebido' OR a.descricao = 'recebido' OR TRIM(a.descricao) = '' OR a.descricao NOT LIKE '%(%');

-- Etapa 6: Corrigir descrições de ordens de serviço com formato antigo (OS-[timestamp])
UPDATE atividades_sistema a
SET descricao = 'Ordem de serviço ' || os.numero_ordem || ' criada'
FROM ordens_servico os
WHERE a.tipo = 'ordem_servico'
  AND a.entidade_id = os.id::text
  AND a.descricao LIKE '%OS-%';