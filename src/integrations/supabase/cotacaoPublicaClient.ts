import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://fmbfkufkxvyncadunlhh.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtYmZrdWZreHZ5bmNhZHVubGhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwOTM1NDYsImV4cCI6MjA3MjY2OTU0Nn0.A3-H5fOxRJMx_q4Vj3qvM0vxjZgSF-VXxZYBdZT-Tbs";

/**
 * Cliente anônimo dedicado ao formulário público de cotação.
 * Envia o token do fornecedor no header `x-cotacao-token`, que as políticas
 * de RLS usam para liberar apenas a cotação daquele fornecedor.
 */
export function createCotacaoPublicaClient(token: string) {
  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'x-cotacao-token': token } },
  });
}
