import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface HistoricoLancamento {
  id: string;
  lancamento_id: string;
  tipo_acao: string;
  campo_alterado: string | null;
  valor_anterior: string | null;
  valor_novo: string | null;
  usuario_id: string | null;
  metadados: any;
  created_at: string;
  lancamentos_financeiros?: {
    conta_bancaria: string | null;
    tipo: string | null;
    descricao: string | null;
  } | null;
}

export function useHistoricoLancamentos() {
  return useQuery({
    queryKey: ["historico-lancamentos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("historico_lancamentos")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(2000);

      if (error) throw error;

      const registros = (data || []) as unknown as HistoricoLancamento[];
      const ids = Array.from(
        new Set(registros.map((r) => r.lancamento_id).filter(Boolean))
      );

      const lancamentosMap = new Map<
        string,
        { conta_bancaria: string | null; tipo: string | null; descricao: string | null }
      >();

      // Busca em lotes para evitar URLs muito longas
      for (let i = 0; i < ids.length; i += 200) {
        const lote = ids.slice(i, i + 200);
        const { data: lancamentos, error: erroLanc } = await supabase
          .from("lancamentos_financeiros")
          .select("id, conta_bancaria, tipo, descricao")
          .in("id", lote);

        if (erroLanc) continue;
        (lancamentos || []).forEach((l: any) => {
          lancamentosMap.set(l.id, {
            conta_bancaria: l.conta_bancaria ?? null,
            tipo: l.tipo ?? null,
            descricao: l.descricao ?? null,
          });
        });
      }

      return registros.map((r) => ({
        ...r,
        lancamentos_financeiros: lancamentosMap.get(r.lancamento_id) || null,
      }));
    },
  });
}
