import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface LancamentoDetalhe {
  id: string;
  descricao: string;
  valor: number;
  data: string;
  fornecedorCliente: string | null;
  contaBancaria: string;
  pago: boolean;
}

interface DetalhesCategoriaDREModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoria: {
    codigo?: string;
    nome: string;
    valor: number;
  } | null;
  lancamentos: LancamentoDetalhe[];
}

export function DetalhesCategoriaDREModal({
  open,
  onOpenChange,
  categoria,
  lancamentos
}: DetalhesCategoriaDREModalProps) {
  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    });
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  if (!categoria) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {categoria.codigo && (
              <span className="font-mono text-muted-foreground">{categoria.codigo}</span>
            )}
            <span>{categoria.nome}</span>
            <Badge variant="secondary" className="ml-2">
              {formatCurrency(categoria.valor)}
            </Badge>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto">
          {lancamentos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum lançamento encontrado para esta categoria no período selecionado.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Fornecedor/Cliente</TableHead>
                  <TableHead>Conta</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lancamentos.map((lancamento) => (
                  <TableRow key={lancamento.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(lancamento.data)}
                    </TableCell>
                    <TableCell>
                      <span className="block max-w-[200px] truncate" title={lancamento.descricao}>
                        {lancamento.descricao}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="block max-w-[150px] truncate" title={lancamento.fornecedorCliente || '-'}>
                        {lancamento.fornecedorCliente || '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="block max-w-[120px] truncate" title={lancamento.contaBancaria}>
                        {lancamento.contaBancaria}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={lancamento.pago ? "default" : "secondary"}>
                        {lancamento.pago ? "Pago" : "Pendente"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium whitespace-nowrap">
                      {formatCurrency(lancamento.valor)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <div className="border-t pt-4 mt-4">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">
              {lancamentos.length} lançamento(s)
            </span>
            <span className="font-semibold">
              Total: {formatCurrency(lancamentos.reduce((acc, l) => acc + l.valor, 0))}
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
