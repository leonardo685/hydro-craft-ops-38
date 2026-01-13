import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Check, Calendar, FileText, User, DollarSign, Link } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { UploadPdfModal } from "./UploadPdfModal";
import { supabase } from "@/integrations/supabase/client";
import EmitirNotaModal from "./EmitirNotaModal";

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
    orcamento_vinculado?: string;
  };
  onConfirm: (ordemId: string) => void;
}

export function EmitirNotaRetornoModal({ 
  open, 
  onOpenChange, 
  ordem, 
  onConfirm 
}: EmitirNotaRetornoModalProps) {
  const [copied, setCopied] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showConfirmFaturamento, setShowConfirmFaturamento] = useState(false);
  const [orcamentoData, setOrcamentoData] = useState<any>(null);
  const [showEmitirNotaModal, setShowEmitirNotaModal] = useState(false);
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
    setShowUploadModal(true);
  };

  const handleUploadComplete = async () => {
    // Primeiro confirma a nota de retorno
    onConfirm(ordem.id);
    setShowUploadModal(false);
    
    // Verificar se tem orçamento vinculado
    if (ordem.orcamento_vinculado) {
      try {
        // Buscar dados completos do orçamento
        const { data: orcamento, error } = await supabase
          .from('orcamentos')
          .select('*')
          .eq('numero', ordem.orcamento_vinculado)
          .single();
        
        if (error) {
          console.error('Erro ao buscar orçamento:', error);
          onOpenChange(false);
          return;
        }
        
        // Verificar se o orçamento está aprovado (pode ser faturado)
        if (orcamento && (orcamento.status === 'aprovado' || orcamento.status === 'faturamento')) {
          setOrcamentoData(orcamento);
          setShowConfirmFaturamento(true);
        } else {
          onOpenChange(false);
        }
      } catch (error) {
        console.error('Erro ao verificar orçamento:', error);
        onOpenChange(false);
      }
    } else {
      onOpenChange(false);
    }
  };

  const handleConfirmarFaturamento = () => {
    setShowConfirmFaturamento(false);
    setShowEmitirNotaModal(true);
  };

  const handleRecusarFaturamento = () => {
    setShowConfirmFaturamento(false);
    setOrcamentoData(null);
    onOpenChange(false);
  };

  const handleFaturamentoComplete = () => {
    setShowEmitirNotaModal(false);
    setOrcamentoData(null);
    onOpenChange(false);
  };

  return (
    <>
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

              {/* Indicador de orçamento vinculado */}
              {ordem.orcamento_vinculado && (
                <div className="flex items-center gap-2 pt-2 border-t border-border">
                  <Link className="h-4 w-4 text-green-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Orçamento Vinculado</p>
                    <p className="font-medium text-green-600">{ordem.orcamento_vinculado}</p>
                  </div>
                </div>
              )}
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

      {/* Modal de Upload do PDF da Nota de Retorno */}
      <UploadPdfModal
        open={showUploadModal}
        onOpenChange={setShowUploadModal}
        ordemId={ordem.id}
        onUploadComplete={handleUploadComplete}
        tipoUpload="nota_retorno"
      />

      {/* Modal de Confirmação para Faturamento */}
      <Dialog open={showConfirmFaturamento} onOpenChange={setShowConfirmFaturamento}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              Orçamento Vinculado Detectado
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-green-50 dark:bg-green-950/30 p-4 rounded-lg border border-green-200 dark:border-green-900">
              <p className="text-sm text-muted-foreground mb-2">
                A nota de retorno da ordem <strong>{ordem.numero_ordem}</strong> foi emitida com sucesso!
              </p>
              <p className="text-foreground">
                Esta ordem está vinculada ao orçamento <strong className="text-green-600">{ordem.orcamento_vinculado}</strong>.
              </p>
            </div>
            
            <p className="text-center font-medium">
              Deseja emitir a nota de faturamento agora?
            </p>
            
            <div className="flex gap-2 pt-4">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={handleRecusarFaturamento}
              >
                Não, apenas retorno
              </Button>
              <Button 
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={handleConfirmarFaturamento}
              >
                <DollarSign className="h-4 w-4 mr-1" />
                Sim, emitir faturamento
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Emissão de Nota de Faturamento */}
      {orcamentoData && (
        <EmitirNotaModal
          open={showEmitirNotaModal}
          onOpenChange={(open) => {
            setShowEmitirNotaModal(open);
            if (!open) {
              setOrcamentoData(null);
              onOpenChange(false);
            }
          }}
          orcamento={orcamentoData}
          onConfirm={handleFaturamentoComplete}
        />
      )}
    </>
  );
}
