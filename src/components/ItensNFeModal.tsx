import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Package, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { type DadosNFe, type ItemNFe } from "@/lib/nfe-utils";

interface ItensNFeModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (dadosNFe: DadosNFe, itensSelecionados: ItemNFe[]) => void;
  dadosNFe: DadosNFe;
  salvando?: boolean;
}

export function ItensNFeModal({ open, onClose, onConfirm, dadosNFe, salvando = false }: ItensNFeModalProps) {
  const [itensSelecionados, setItensSelecionados] = useState<string[]>([]);

  const handleItemToggle = (codigoItem: string) => {
    setItensSelecionados(prev => 
      prev.includes(codigoItem)
        ? prev.filter(id => id !== codigoItem)
        : [...prev, codigoItem]
    );
  };

  const handleSelecionarTodos = () => {
    if (dadosNFe.itens) {
      if (itensSelecionados.length === dadosNFe.itens.length) {
        setItensSelecionados([]);
      } else {
        setItensSelecionados(dadosNFe.itens.map(item => item.codigo));
      }
    }
  };

  const handleConfirmar = () => {
    if (dadosNFe.itens) {
      const itensParaCriarOrdens = dadosNFe.itens.filter(item => 
        itensSelecionados.includes(item.codigo)
      );
      onConfirm(dadosNFe, itensParaCriarOrdens);
    }
    setItensSelecionados([]);
    onClose();
  };

  const handleFechar = () => {
    setItensSelecionados([]);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleFechar}>
      <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Itens da Nota Fiscal {dadosNFe.numero}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <p className="font-medium">Selecione os itens para criar ordens de serviço</p>
                <div className="text-sm space-y-1">
                  <p><strong>Cliente:</strong> {dadosNFe.cnpjEmitente}</p>
                  <p><strong>Nota Fiscal:</strong> {dadosNFe.numero} - Série {dadosNFe.serie}</p>
                  <p><strong>Total de itens:</strong> {dadosNFe.itens?.length || 0}</p>
                </div>
              </div>
            </AlertDescription>
          </Alert>

          <div className="flex items-center gap-2 mb-4">
            <Checkbox
              id="selecionar-todos"
              checked={itensSelecionados.length === dadosNFe.itens?.length && dadosNFe.itens?.length > 0}
              onCheckedChange={handleSelecionarTodos}
            />
            <label htmlFor="selecionar-todos" className="text-sm font-medium cursor-pointer">
              Selecionar todos os itens
            </label>
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead className="w-[120px]">Código</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="w-[100px]">NCM</TableHead>
                  <TableHead className="w-[80px]">Qtd</TableHead>
                  <TableHead className="w-[100px]">Valor Unit.</TableHead>
                  <TableHead className="w-[100px]">Valor Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dadosNFe.itens?.map((item) => (
                  <TableRow key={item.codigo}>
                    <TableCell>
                      <Checkbox
                        checked={itensSelecionados.includes(item.codigo)}
                        onCheckedChange={() => handleItemToggle(item.codigo)}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-sm">{item.codigo}</TableCell>
                    <TableCell className="max-w-md">
                      <div className="truncate" title={item.descricao}>
                        {item.descricao}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{item.ncm}</TableCell>
                    <TableCell className="text-right">
                      {item.quantidade.toFixed(2)} {item.unidade}
                    </TableCell>
                    <TableCell className="text-right">
                      R$ {item.valorUnitario.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      R$ {item.valorTotal.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={handleFechar} className="flex-1">
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirmar} 
              className="flex-1"
              disabled={itensSelecionados.length === 0 || salvando}
            >
              {salvando ? "Salvando..." : `Criar ${itensSelecionados.length} Ordem${itensSelecionados.length !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}