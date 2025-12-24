import { useEmpresa } from '@/contexts/EmpresaContext';

/**
 * Hook utilitário para obter o ID da empresa atual.
 * Usado principalmente nos hooks de dados para filtrar por empresa.
 */
export function useEmpresaId() {
  const { empresaAtual, loading } = useEmpresa();
  
  return {
    empresaId: empresaAtual?.id || null,
    loading,
    hasEmpresa: !!empresaAtual,
  };
}
