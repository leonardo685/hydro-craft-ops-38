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
}

export function useHistoricoLancamentos() {
  return useQuery({
    queryKey: ["historico-lancamentos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("historico_lancamentos")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as HistoricoLancamento[];
    },
  });
}
