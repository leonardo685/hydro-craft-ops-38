import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

type Quote = { id: string; empresa_id: string | null; status: string };

export async function deleteRejectedQuote<T extends Quote>(
  client: Pick<SupabaseClient<Database>, 'rpc'>,
  quote: T,
  empresaId: string,
) {
  if (quote.empresa_id !== empresaId || quote.status !== 'rejeitado') {
    throw new Error('Orçamento rejeitado não encontrado ou sem permissão.');
  }
  const { data, error } = await client.rpc('excluir_orcamento_rejeitado', {
    p_orcamento_id: quote.id,
    p_empresa_id: empresaId,
  });
  if (error) throw error;
  if (data !== quote.id) throw new Error('Não foi possível confirmar a exclusão do orçamento.');
  return data;
}

export function withoutDeletedQuote<T extends Quote>(quotes: T[], id: string, empresaId: string): T[] {
  return quotes.filter(quote => quote.id !== id || quote.empresa_id !== empresaId);
}