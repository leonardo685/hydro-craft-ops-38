import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://fmbfkufkxvyncadunlhh.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtYmZrdWZreHZ5bmNhZHVubGhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwOTM1NDYsImV4cCI6MjA3MjY2OTU0Nn0.A3-H5fOxRJMx_q4Vj3qvM0vxjZgSF-VXxZYBdZT-Tbs";

let numeroOrdemAtual = "";

/** Define o número da ordem que autoriza as consultas públicas (páginas do QR code). */
export function setOrdemPublica(numeroOrdem: string | undefined | null) {
  numeroOrdemAtual = numeroOrdem || "";
}

/**
 * Cliente anônimo das páginas públicas de ordem (QR code).
 * Envia `x-ordem-numero` em toda requisição — as políticas de RLS liberam
 * apenas a ordem daquele número e o histórico do mesmo equipamento.
 */
export const supabasePublico = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: {
    fetch: (input, init = {}) => {
      const headers = new Headers(init.headers);
      if (numeroOrdemAtual) headers.set('x-ordem-numero', numeroOrdemAtual);
      return fetch(input as any, { ...init, headers });
    },
  },
});
