import { useEmpresa } from '@/contexts/EmpresaContext';
import { Building2 } from 'lucide-react';

export function EmpresaSelector() {
  const { empresaAtual, loading } = useEmpresa();

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
        <Building2 className="h-4 w-4 animate-pulse" />
        <span>Carregando...</span>
      </div>
    );
  }

  if (!empresaAtual) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
        <Building2 className="h-4 w-4" />
        <span>Sem empresa</span>
      </div>
    );
  }

  // Mostrar apenas o nome da empresa atual (sem dropdown de troca)
  return (
    <div className="flex items-center gap-2 px-3 py-2">
      <Building2 className="h-4 w-4 text-primary flex-shrink-0" />
      <span className="text-sm font-medium truncate">{empresaAtual.nome}</span>
    </div>
  );
}
