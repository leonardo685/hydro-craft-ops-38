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
        .select("*, lancamentos_financeiros(conta_bancaria, tipo, descricao)")
        .order("created_at", { ascending: false })
        .limit(2000);

      if (error) throw error;
      return data as unknown as HistoricoLancamento[];
    },
  });
}
