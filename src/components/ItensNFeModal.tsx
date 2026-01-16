import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Package, CheckCircle2, AlertTriangle } from "lucide-react";
import { useState, useEffect } from "react";
import { type DadosNFe, type ItemNFe } from "@/lib/nfe-utils";

interface ItensNFeModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (dadosNFe: DadosNFe, itensSelecionados: ItemNFe[]) => void;
  dadosNFe: DadosNFe;
  salvando?: boolean;
  ordensExistentes?: number;
}

export function ItensNFeModal({ 
  open, 
  onClose, 
  onConfirm, 
  dadosNFe, 
  salvando = false,
  ordensExistentes = 0 
}: ItensNFeModalProps) {
  // Usa índices como identificador único para permitir itens com códigos duplicados
  const [itensSelecionados, setItensSelecionados] = useState<number[]>([]);

  const totalItens = dadosNFe.itens?.length || 0;
  const ordensDisponiveis = Math.max(0, totalItens - ordensExistentes);

  // Reset seleção quando modal abre
  useEffect(() => {
    if (open) {
      setItensSelecionados([]);
    }
  }, [open]);

  const handleItemToggle = (index: number) => {
    setItensSelecionados(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      } else {
        // Verificar se ainda pode selecionar mais
        if (prev.length >= ordensDisponiveis) {
          return prev; // Não permite selecionar mais
        }
        return [...prev, index];
      }
    });
  };

  const handleSelecionarTodos = () => {
    if (dadosNFe.itens) {
      if (itensSelecionados.length > 0) {
        setItensSelecionados([]);
      } else {
        // Seleciona índices até o limite disponível
        const indices = dadosNFe.itens.slice(0, ordensDisponiveis).map((_, i) => i);
        setItensSelecionados(indices);
      }
    }
  };

  const handleConfirmar = () => {
    if (dadosNFe.itens) {
      // Filtra por índice em vez de código
      const itensParaCriarOrdens = dadosNFe.itens.filter((_, index) => 
        itensSelecionados.includes(index)
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
          {ordensExistentes > 0 && (
            <Alert variant="destructive" className="bg-amber-50 border-amber-200 text-amber-800">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium">
                  Esta nota já possui {ordensExistentes} ordem{ordensExistentes !== 1 ? 's' : ''} de serviço criada{ordensExistentes !== 1 ? 's' : ''}.
                </p>
                <p className="text-sm">
                  Você pode criar no máximo mais {ordensDisponiveis} ordem{ordensDisponiveis !== 1 ? 's' : ''} 
                  (total de itens: {totalItens}).
                </p>
              </AlertDescription>
            </Alert>
          )}

          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <p className="font-medium">Selecione os itens para criar ordens de serviço</p>
                <div className="text-sm space-y-1">
                  <p><strong>Cliente:</strong> {dadosNFe.cnpjEmitente}</p>
                  <p><strong>Nota Fiscal:</strong> {dadosNFe.numero} - Série {dadosNFe.serie}</p>
                  <p><strong>Total de itens:</strong> {totalItens}</p>
                  {ordensExistentes > 0 && (
                    <p className="text-amber-600">
                      <strong>Ordens disponíveis:</strong> {ordensDisponiveis} de {totalItens}
                    </p>
                  )}
                </div>
              </div>
            </AlertDescription>
          </Alert>

          {ordensDisponiveis > 0 && (
            <div className="flex items-center gap-2 mb-4">
              <Checkbox
                id="selecionar-todos"
                checked={itensSelecionados.length === ordensDisponiveis && ordensDisponiveis > 0}
                onCheckedChange={handleSelecionarTodos}
              />
              <label htmlFor="selecionar-todos" className="text-sm font-medium cursor-pointer">
                {ordensDisponiveis < totalItens 
                  ? `Selecionar ${ordensDisponiveis} itens disponíveis`
                  : 'Selecionar todos os itens'
                }
              </label>
            </div>
          )}

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
                {dadosNFe.itens?.map((item, index) => {
                  const isDisabled = !itensSelecionados.includes(index) && 
                                     itensSelecionados.length >= ordensDisponiveis;
                  return (
                    <TableRow 
                      key={index}
                      className={isDisabled ? 'opacity-50' : ''}
                    >
                      <TableCell>
                        <Checkbox
                          checked={itensSelecionados.includes(index)}
                          onCheckedChange={() => handleItemToggle(index)}
                          disabled={isDisabled}
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
                  );
                })}
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
              disabled={itensSelecionados.length === 0 || salvando || ordensDisponiveis === 0}
            >
              {salvando ? "Salvando..." : `Criar ${itensSelecionados.length} Ordem${itensSelecionados.length !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
