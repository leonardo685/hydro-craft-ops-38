import { useEmpresa } from '@/contexts/EmpresaContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2 } from 'lucide-react';

export function EmpresaSelector() {
  const { empresaAtual, empresas, trocarEmpresa, loading } = useEmpresa();

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
        <Building2 className="h-4 w-4 animate-pulse" />
        <span>Carregando...</span>
      </div>
    );
  }

  if (empresas.length === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
        <Building2 className="h-4 w-4" />
        <span>Sem empresa</span>
      </div>
    );
  }

  // Se só tem uma empresa, mostra apenas o nome
  if (empresas.length === 1) {
    return (
      <div className="flex items-center gap-2 px-3 py-2">
        <Building2 className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium truncate">{empresaAtual?.nome}</span>
      </div>
    );
  }

  // Se tem mais de uma empresa, mostra o seletor
  return (
    <div className="px-2 py-1">
      <Select
        value={empresaAtual?.id || ''}
        onValueChange={(value) => trocarEmpresa(value)}
      >
        <SelectTrigger className="w-full h-9 text-sm">
          <div className="flex items-center gap-2 truncate">
            <Building2 className="h-4 w-4 text-primary flex-shrink-0" />
            <SelectValue placeholder="Selecione uma empresa" />
          </div>
        </SelectTrigger>
        <SelectContent>
          {empresas.map((empresa) => (
            <SelectItem key={empresa.id} value={empresa.id}>
              <div className="flex flex-col">
                <span className="font-medium">{empresa.nome}</span>
                {empresa.cnpj && (
                  <span className="text-xs text-muted-foreground">
                    {empresa.cnpj}
                  </span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
