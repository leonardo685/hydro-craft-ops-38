import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Upload, FileText, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface UploadPdfModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ordemId: string;
  onUploadComplete: () => void;
  tipoUpload: 'nota_fiscal' | 'nota_retorno';
}

export function UploadPdfModal({ 
  open, 
  onOpenChange, 
  ordemId, 
  onUploadComplete,
  tipoUpload 
}: UploadPdfModalProps) {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [numeroNotaRetorno, setNumeroNotaRetorno] = useState('');
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast({
          title: "Arquivo inválido",
          description: "Por favor, selecione apenas arquivos PDF",
          variant: "destructive",
        });
        return;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          title: "Arquivo muito grande",
          description: "O arquivo deve ter no máximo 10MB",
          variant: "destructive",
        });
        return;
      }
      setArquivo(file);
    }
  };

  const handleUpload = async () => {
    if (!arquivo) {
      toast({
        title: "Erro",
        description: "Selecione um arquivo PDF",
        variant: "destructive",
      });
      return;
    }

    if (tipoUpload === 'nota_retorno' && !numeroNotaRetorno.trim()) {
      toast({
        title: "Erro",
        description: "Informe o número da nota de retorno",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      // Upload do arquivo para o storage
      const nomeArquivo = `${tipoUpload}_${ordemId}_${Date.now()}.pdf`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('equipamentos')
        .upload(`notas-fiscais/${nomeArquivo}`, arquivo);

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from('equipamentos')
        .getPublicUrl(`notas-fiscais/${nomeArquivo}`);

      // Atualizar a tabela correspondente
      if (tipoUpload === 'nota_fiscal') {
        const { error: updateError } = await supabase
          .from('ordens_servico')
          .update({ pdf_nota_fiscal: urlData.publicUrl })
          .eq('id', ordemId);

        if (updateError) throw updateError;
      } else {
        // Para nota de retorno, buscar o recebimento_id da ordem
        const { data: ordem, error: ordemError } = await supabase
          .from('ordens_servico')
          .select('recebimento_id')
          .eq('id', ordemId)
          .single();

        if (ordemError) throw ordemError;

        if (ordem.recebimento_id) {
          const { error: updateError } = await supabase
            .from('recebimentos')
            .update({ 
              pdf_nota_retorno: urlData.publicUrl,
              data_nota_retorno: new Date().toISOString(),
              numero_nota_retorno: numeroNotaRetorno.trim(),
              na_empresa: false
            })
            .eq('id', ordem.recebimento_id);

          if (updateError) throw updateError;
        }
      }

      toast({
        title: "Upload concluído",
        description: "PDF anexado com sucesso!",
      });

      onUploadComplete();
      onOpenChange(false);
      setArquivo(null);
      setNumeroNotaRetorno('');
    } catch (error) {
      console.error('Erro no upload:', error);
      toast({
        title: "Erro no upload",
        description: "Erro ao anexar o PDF. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const getTitulo = () => {
    return tipoUpload === 'nota_fiscal' ? 'Anexar Nota Fiscal' : 'Anexar Nota de Retorno';
  };

  const getDescricao = () => {
    return tipoUpload === 'nota_fiscal' 
      ? 'Faça upload do PDF da nota fiscal emitida'
      : 'Faça upload do PDF da nota de retorno';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            {getTitulo()}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="bg-gradient-secondary p-4 rounded-lg">
          <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-warning mt-0.5" />
              <div>
                <p className="text-sm font-medium">{getDescricao()}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Arquivo deve ser PDF, máximo 10MB
                </p>
              </div>
            </div>
          </div>

          {tipoUpload === 'nota_retorno' && (
            <div className="space-y-2">
              <Label htmlFor="numeroNotaRetorno">Número da Nota de Retorno *</Label>
              <Input
                id="numeroNotaRetorno"
                value={numeroNotaRetorno}
                onChange={(e) => setNumeroNotaRetorno(e.target.value)}
                placeholder="Ex: 12345"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="arquivo">Selecione o arquivo PDF</Label>
            <Input
              id="arquivo"
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="cursor-pointer"
            />
            {arquivo && (
              <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                <FileText className="h-4 w-4 text-primary" />
                <span className="text-sm truncate">{arquivo.name}</span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {(arquivo.size / 1024 / 1024).toFixed(1)} MB
                </span>
              </div>
            )}
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
              onClick={handleUpload} 
              className="flex-1 bg-gradient-primary"
              disabled={!arquivo || uploading}
            >
              {uploading ? "Enviando..." : "Anexar PDF"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}