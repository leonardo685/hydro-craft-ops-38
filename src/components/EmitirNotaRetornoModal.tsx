import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Check, Calendar, FileText, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface EmitirNotaRetornoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ordem: {
    id: string;
    numero_ordem: string;
    cliente_nome: string;
    equipamento: string;
    data_entrada: string;
    nota_fiscal?: string;
  };
  onConfirm: () => void;
}

export function EmitirNotaRetornoModal({ 
  open, 
  onOpenChange, 
  ordem, 
  onConfirm 
}: EmitirNotaRetornoModalProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const textoNota = `I - Retorno da NF ${ordem.nota_fiscal || 'N/A'}.
II - Pedido N (a configurar)`;

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(textoNota);
      setCopied(true);
      toast({
        title: "Texto copiado!",
        description: "O texto foi copiado para a área de transferência",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao copiar texto para área de transferência",
        variant: "destructive",
      });
    }
  };

  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Emitir Nota de Retorno
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações da Ordem */}
          <div className="bg-gradient-secondary p-4 rounded-lg space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Data de Entrada</p>
                <p className="font-medium">
                  {new Date(ordem.data_entrada).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Cliente</p>
                <p className="font-medium">{ordem.cliente_nome}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Nº da Nota</p>
                <p className="font-medium">{ordem.nota_fiscal || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Área de Texto */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Texto da Nota de Retorno:</label>
            <Textarea
              value={textoNota}
              readOnly
              className="min-h-[100px] bg-muted"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyText}
              className="w-full"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar para Área de Transferência
                </>
              )}
            </Button>
          </div>

          {/* Botões de Ação */}
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleConfirm} className="flex-1 bg-gradient-primary">
              Confirmar Emissão
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}