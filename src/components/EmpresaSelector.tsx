import { useEmpresa } from '@/contexts/EmpresaContext';
import { Building2, ChevronDown, Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

export function EmpresaSelector() {
  const { empresaAtual, empresas, loading, trocarEmpresa } = useEmpresa();

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

  // Se só tem uma empresa, mostra sem dropdown
  if (empresas.length <= 1) {
    return (
      <div className="flex items-center gap-2 px-3 py-2">
        <Building2 className="h-4 w-4 text-primary flex-shrink-0" />
        <span className="text-sm font-medium truncate">{empresaAtual.nome}</span>
      </div>
    );
  }

  // Se tem múltiplas empresas, mostra dropdown para trocar
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2 px-3 py-2 h-auto">
          <Building2 className="h-4 w-4 text-primary flex-shrink-0" />
          <span className="text-sm font-medium truncate max-w-[150px]">{empresaAtual.nome}</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[200px]">
        {empresas.map((empresa) => (
          <DropdownMenuItem
            key={empresa.id}
            onClick={() => trocarEmpresa(empresa.id)}
            className="flex items-center justify-between"
          >
            <span className="truncate">{empresa.nome}</span>
            {empresa.id === empresaAtual.id && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
