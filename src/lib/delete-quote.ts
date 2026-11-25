import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { deleteRejectedQuote } from './delete-rejected-quote';

type Quote = { id: string; empresa_id: string | null; status: string };
type QuoteRpcClient = Pick<SupabaseClient<Database>, 'rpc'>;

export async function deleteQuote<T extends Quote>(
  client: QuoteRpcClient,
  quote: T,
  empresaId: string,
) {
  if (quote.status === 'rejeitado') {
    return deleteRejectedQuote(client, quote, empresaId);
  }

  if (quote.empresa_id !== empresaId) {
    throw new Error('Quote not found or you do not have permission to delete it.');
  }

  const { data, error } = await client.rpc('excluir_orcamento_sem_financeiro', {
    p_orcamento_id: quote.id,
    p_empresa_id: empresaId,
  });
  if (error) throw error;
  if (data !== quote.id) throw new Error('The quote deletion could not be confirmed.');
  return data;
}
