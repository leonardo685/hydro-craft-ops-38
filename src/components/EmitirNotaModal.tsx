import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Copy, FileText, Calendar, User, FileImage, X, AlertCircle } from "lucide-react";
interface EmitirNotaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orcamento: any;
  onConfirm: () => void;
}
export default function EmitirNotaModal({
  open,
  onOpenChange,
  orcamento,
  onConfirm
}: EmitirNotaModalProps) {
  const [etapa, setEtapa] = useState<'dados' | 'anexo'>('dados');
  const [numeroNF, setNumeroNF] = useState(() => {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const numero = Math.floor(Math.random() * 90000) + 10000;
    return numero.toString();
  });
  const [anexoNota, setAnexoNota] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast({
          title: "Formato inválido",
          description: "Por favor, selecione apenas arquivos PDF",
          variant: "destructive"
        });
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        // 10MB
        toast({
          title: "Arquivo muito grande",
          description: "O arquivo deve ter no máximo 10MB",
          variant: "destructive"
        });
        return;
      }
      setAnexoNota(file);
    }
  };
  const uploadAnexo = async (): Promise<string | null> => {
    if (!anexoNota || !orcamento) return null;
    try {
      const fileExt = anexoNota.name.split('.').pop();
      const fileName = `nota-fiscal-${orcamento.numero}-${Date.now()}.${fileExt}`;
      const filePath = `notas-fiscais/${fileName}`;
      const {
        error: uploadError
      } = await supabase.storage.from('documentos').upload(filePath, anexoNota);
      if (uploadError) {
        console.error('Erro no upload:', uploadError);
        throw uploadError;
      }
      const {
        data: {
          publicUrl
        }
      } = supabase.storage.from('documentos').getPublicUrl(filePath);
      return publicUrl;
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      throw error;
    }
  };
  const copiarParaAreaTransferencia = async () => {
    const texto = `I - Retorno da NF ${numeroNF}.
II - Pedido N (a configurar)`;
    try {
      await navigator.clipboard.writeText(texto);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copiado!",
        description: "Texto copiado para área de transferência"
      });
    } catch (error) {
      console.error('Erro ao copiar:', error);
      toast({
        title: "Erro",
        description: "Erro ao copiar para área de transferência",
        variant: "destructive"
      });
    }
  };
  const handleConfirmarDados = () => {
    setEtapa('anexo');
  };
  const handleAnexarPDF = async () => {
    if (!anexoNota) {
      toast({
        title: "Arquivo obrigatório",
        description: "Selecione um arquivo PDF",
        variant: "destructive"
      });
      return;
    }
    setUploading(true);
    try {
      const urlAnexo = await uploadAnexo();

      // Atualizar orçamento no Supabase
      const {
        error
      } = await supabase.from('orcamentos').update({
        status: 'finalizado',
        numero_nf: numeroNF,
        pdf_nota_fiscal: urlAnexo
      }).eq('id', orcamento.id);
      if (error) {
        console.error('Erro ao atualizar orçamento:', error);
        throw error;
      }
      toast({
        title: "Nota fiscal emitida!",
        description: `Nota fiscal ${numeroNF} emitida com sucesso`
      });
      onConfirm();
      onOpenChange(false);

      // Reset
      setEtapa('dados');
      setAnexoNota(null);
    } catch (error) {
      console.error('Erro ao emitir nota fiscal:', error);
      toast({
        title: "Erro",
        description: "Erro ao emitir nota fiscal",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };
  const handleFechar = () => {
    setEtapa('dados');
    setAnexoNota(null);
    onOpenChange(false);
  };
  if (!orcamento) return null;
  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR');
  };
  const textoNota = `I - Retorno da NF ${numeroNF}.
II - Pedido N (a configurar)`;
  return <Dialog open={open} onOpenChange={handleFechar}>
      <DialogContent className="sm:max-w-lg">
        {etapa === 'dados' ? <>
            {/* Primeira tela - Dados da Nota */}
            <DialogHeader className="pb-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-red-500" />
                <DialogTitle className="text-lg font-semibold">Emitir Nota de Faturamento</DialogTitle>
              </div>
              <Button variant="ghost" size="sm" className="absolute right-4 top-4 p-0 h-6 w-6" onClick={handleFechar}>
                <X className="h-4 w-4" />
              </Button>
            </DialogHeader>

            <div className="space-y-6">
              {/* Informações principais */}
              <div className="bg-muted/30 p-4 rounded-lg space-y-4">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Data de Entrada</p>
                    <p className="font-semibold">{formatarData(orcamento.data_criacao)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Cliente</p>
                    <p className="font-semibold">{orcamento.cliente_nome}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <FileImage className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Nº da Nota</p>
                    <p className="font-semibold">{numeroNF}</p>
                  </div>
                </div>
              </div>

              {/* Texto da nota */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Texto da Nota de Retorno:</Label>
                <Textarea value={textoNota} readOnly className="min-h-[100px] border-2 border-red-200 bg-red-50/30 resize-none" />
                
                <Button variant="outline" onClick={copiarParaAreaTransferencia} className="w-full flex items-center gap-2">
                  <Copy className="h-4 w-4" />
                  {copied ? "Copiado!" : "Copiar para Área de Transferência"}
                </Button>
              </div>
            </div>

            <div className="flex gap-3 pt-6">
              <Button variant="outline" onClick={handleFechar} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={handleConfirmarDados} className="flex-1 bg-red-500 hover:bg-red-600 text-white">
                Confirmar Emissão
              </Button>
            </div>
          </> : <>
            {/* Segunda tela - Anexar PDF */}
            <DialogHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-red-500" />
                <DialogTitle className="text-lg font-semibold">Anexar Nota de Retorno</DialogTitle>
              </div>
              <Button variant="ghost" size="sm" className="absolute right-4 top-4 p-0 h-6 w-6" onClick={handleFechar}>
                <X className="h-4 w-4" />
              </Button>
            </DialogHeader>

            <div className="space-y-6">
              {/* Aviso */}
              <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-800">Faça upload do PDF da nota de retorno</p>
                  <p className="text-sm text-yellow-700">Arquivo deve ser PDF, máximo 10MB</p>
                </div>
              </div>

              {/* Seleção de arquivo */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Selecione o arquivo PDF</Label>
                <div className="border-2 border-red-200 border-dashed rounded-lg p-6">
                  <Input type="file" accept=".pdf" onChange={handleFileChange} className="cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100" />
                  {anexoNota ? <p className="text-sm text-green-600 mt-2 font-medium">
                      ✓ {anexoNota.name}
                    </p> : <p className="text-sm text-muted-foreground mt-2">
                      Nenhum arquivo escolhido
                    </p>}
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-6">
              <Button variant="outline" onClick={() => setEtapa('dados')} className="flex-1" disabled={uploading}>
                Cancelar
              </Button>
              <Button onClick={handleAnexarPDF} className="flex-1 bg-red-500 hover:bg-red-600 text-white" disabled={uploading || !anexoNota}>
                {uploading ? <>
                    <Upload className="h-4 w-4 mr-2 animate-spin" />
                    Anexando...
                  </> : "Anexar PDF"}
              </Button>
            </div>
          </>}
      </DialogContent>
    </Dialog>;
}