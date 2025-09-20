import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Copy, FileText } from "lucide-react";

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
  const [numeroNF, setNumeroNF] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("");
  const [dataVencimento, setDataVencimento] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [anexoNota, setAnexoNota] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

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
      if (file.size > 10 * 1024 * 1024) { // 10MB
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

      const { error: uploadError } = await supabase.storage
        .from('documentos')
        .upload(filePath, anexoNota);

      if (uploadError) {
        console.error('Erro no upload:', uploadError);
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('documentos')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      throw error;
    }
  };

  const copiarParaAreaTransferencia = async (texto: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      toast({
        title: "Copiado!",
        description: "Informações copiadas para área de transferência"
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

  const handleConfirmar = async () => {
    if (!numeroNF || !formaPagamento || !dataVencimento) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);

    try {
      let urlAnexo = null;
      
      if (anexoNota) {
        urlAnexo = await uploadAnexo();
      }

      // Atualizar orçamento no Supabase
      const { error } = await supabase
        .from('orcamentos')
        .update({
          status: 'finalizado',
          numero_nf: numeroNF,
          forma_pagamento: formaPagamento,
          data_vencimento: dataVencimento,
          observacoes_nota: observacoes,
          pdf_nota_fiscal: urlAnexo
        })
        .eq('id', orcamento.id);

      if (error) {
        console.error('Erro ao atualizar orçamento:', error);
        throw error;
      }

      // Preparar texto para área de transferência
      const textoParaCopiar = `
NOTA FISCAL EMITIDA
Número: ${numeroNF}
Orçamento: ${orcamento.numero}
Cliente: ${orcamento.cliente_nome}
Equipamento: ${orcamento.equipamento}
Valor: R$ ${orcamento.valor?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
Forma de Pagamento: ${formaPagamento}
Data de Vencimento: ${dataVencimento}
${observacoes ? `Observações: ${observacoes}` : ''}
      `.trim();

      await copiarParaAreaTransferencia(textoParaCopiar);

      toast({
        title: "Nota fiscal emitida!",
        description: `Nota fiscal ${numeroNF} emitida com sucesso`
      });

      onConfirm();
      onOpenChange(false);
      
      // Limpar campos
      setNumeroNF("");
      setFormaPagamento("");
      setDataVencimento("");
      setObservacoes("");
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

  if (!orcamento) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Emitir Nota Fiscal</DialogTitle>
          <DialogDescription>
            Emitir NF para {orcamento.numero} - {orcamento.cliente_nome}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Informações do Orçamento */}
          <div className="p-4 bg-gradient-secondary rounded-lg space-y-2">
            <h4 className="font-medium text-foreground">Informações do Orçamento</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Número:</span>
                <span className="ml-2 font-medium">{orcamento.numero}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Valor:</span>
                <span className="ml-2 font-medium text-primary">
                  R$ {orcamento.valor?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">Cliente:</span>
                <span className="ml-2 font-medium">{orcamento.cliente_nome}</span>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">Equipamento:</span>
                <span className="ml-2 font-medium">{orcamento.equipamento}</span>
              </div>
            </div>
          </div>

          {/* Dados da Nota Fiscal */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="numeroNF">Número da NF *</Label>
              <Input
                id="numeroNF"
                value={numeroNF}
                onChange={(e) => setNumeroNF(e.target.value)}
                placeholder="Ex: NF-2024-001"
              />
            </div>

            <div>
              <Label htmlFor="formaPagamento">Forma de Pagamento *</Label>
              <Select value={formaPagamento} onValueChange={setFormaPagamento}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a forma de pagamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="boleto">Boleto Bancário</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="cartao">Cartão de Crédito</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="transferencia">Transferência Bancária</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="dataVencimento">Data de Vencimento *</Label>
              <Input
                id="dataVencimento"
                type="date"
                value={dataVencimento}
                onChange={(e) => setDataVencimento(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Observações adicionais..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="anexoNota">Anexar PDF da Nota Fiscal</Label>
              <Input
                id="anexoNota"
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="mt-1"
              />
              {anexoNota && (
                <p className="text-sm text-muted-foreground mt-1">
                  Arquivo selecionado: {anexoNota.name}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-4">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)} 
            className="flex-1"
            disabled={uploading}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirmar} 
            className="flex-1 bg-gradient-primary"
            disabled={uploading}
          >
            {uploading ? (
              <>
                <Upload className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Emitir NF
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}