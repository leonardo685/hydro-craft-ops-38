import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";

type TableName = 
  | "ordens_servico"
  | "orcamentos"
  | "recebimentos"
  | "compras"
  | "itens_orcamento"
  | "fotos_orcamento"
  | "fotos_equipamentos"
  | "testes_equipamentos"
  | "notas_fiscais";

interface UseRealtimeSubscriptionOptions {
  tables: TableName[];
  empresaId: string | undefined;
  onDataChange: () => void;
  enabled?: boolean;
}

/**
 * Hook para subscrever a mudanças em tempo real em tabelas do Supabase.
 * Quando qualquer INSERT, UPDATE ou DELETE acontece nas tabelas especificadas,
 * a função onDataChange é chamada para recarregar os dados.
 */
export function useRealtimeSubscription({
  tables,
  empresaId,
  onDataChange,
  enabled = true,
}: UseRealtimeSubscriptionOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled || !empresaId || tables.length === 0) {
      return;
    }

    // Debounce para evitar múltiplas chamadas em sequência
    const debouncedOnChange = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        console.log("[Realtime] Data changed, reloading...");
        onDataChange();
      }, 300);
    };

    // Criar um canal único para esta subscription
    const channelName = `realtime-${tables.join("-")}-${empresaId}-${Date.now()}`;
    const channel = supabase.channel(channelName);

    // Adicionar listeners para cada tabela
    tables.forEach((table) => {
      channel.on(
        "postgres_changes",
        {
          event: "*", // INSERT, UPDATE, DELETE
          schema: "public",
          table: table,
          filter: `empresa_id=eq.${empresaId}`,
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          console.log(`[Realtime] Change detected in ${table}:`, payload.eventType);
          debouncedOnChange();
        }
      );
    });

    // Subscrever ao canal
    channel.subscribe((status) => {
      console.log(`[Realtime] Subscription status for ${channelName}:`, status);
    });

    channelRef.current = channel;

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (channelRef.current) {
        console.log(`[Realtime] Unsubscribing from ${channelName}`);
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [tables.join(","), empresaId, enabled]);

  return null;
}
