import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useEmpresa } from "@/contexts/EmpresaContext";

interface UploadProdutoProntoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ordem: any;
  onConfirm: () => void;
}

export function UploadProdutoProntoModal({ 
  open, 
  onOpenChange, 
  ordem, 
  onConfirm 
}: UploadProdutoProntoModalProps) {
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const { toast } = useToast();
  const { empresaAtual } = useEmpresa();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Adicionar novos arquivos aos existentes
    setSelectedFiles(prev => [...prev, ...files]);

    // Criar previews
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const uploadPhotos = async () => {
    // Upload das fotos para o bucket 'equipamentos'
    const uploadPromises = selectedFiles.map(async (file, index) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `produto_pronto_${ordem.id}_${Date.now()}_${index}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from('equipamentos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('equipamentos')
        .getPublicUrl(filePath);

      // Salvar referência no banco (usando a tabela fotos_equipamentos)
      const { error: insertError } = await supabase
        .from('fotos_equipamentos')
        .insert({
          recebimento_id: ordem.recebimento_id || null,
          ordem_servico_id: ordem.id,
          arquivo_url: publicUrl,
          nome_arquivo: fileName,
          apresentar_orcamento: false, // Fotos do produto pronto
          empresa_id: empresaAtual?.id
        });

      if (insertError) {
        console.error('Erro ao salvar foto no banco:', insertError);
        throw insertError;
      }

      return publicUrl;
    });

    await Promise.all(uploadPromises);
  };

  const handleUploadOnly = async () => {
    if (selectedFiles.length === 0) {
      toast({
        title: "Atenção",
        description: "Por favor, selecione pelo menos uma foto do produto pronto",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      await uploadPhotos();

      toast({
        title: "Upload concluído",
        description: `${selectedFiles.length} foto(s) do produto pronto enviada(s) com sucesso`,
      });

      // Limpar estado e fechar modal
      setSelectedFiles([]);
      setPreviews([]);
      onOpenChange(false);
    } catch (error) {
      console.error('Erro detalhado no upload:', error);
      toast({
        title: "Erro no upload",
        description: error instanceof Error ? error.message : "Erro ao enviar as fotos do produto pronto",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleUploadAndFinalize = async () => {
    if (selectedFiles.length === 0) {
      toast({
        title: "Atenção",
        description: "Por favor, selecione pelo menos uma foto do produto pronto",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      await uploadPhotos();

      toast({
        title: "Upload concluído",
        description: `${selectedFiles.length} foto(s) do produto pronto enviada(s) com sucesso`,
      });

      // Limpar estado e fechar modal
      setSelectedFiles([]);
      setPreviews([]);
      onOpenChange(false);

      // Chamar a função de confirmação (finalizar ordem)
      onConfirm();
    } catch (error) {
      console.error('Erro detalhado no upload:', error);
      console.error('Ordem:', ordem);
      console.error('Arquivos selecionados:', selectedFiles.length);
      toast({
        title: "Erro no upload",
        description: error instanceof Error ? error.message : "Erro ao enviar as fotos do produto pronto",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload do Produto Pronto</DialogTitle>
          <DialogDescription>
            Ordem: {ordem.recebimentos?.numero_ordem || ordem.numero_ordem} - {ordem.equipamento}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Área de upload */}
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
            <input
              type="file"
              id="file-upload"
              multiple
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              disabled={uploading}
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer flex flex-col items-center gap-2"
            >
              <Upload className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Clique para selecionar fotos do produto pronto
              </p>
              <p className="text-xs text-muted-foreground">
                Você pode selecionar múltiplas fotos
              </p>
            </label>
          </div>

          {/* Grid de previews */}
          {previews.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {previews.map((preview, index) => (
                <div key={index} className="relative group">
                  <img
                    src={preview}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg border"
                  />
                  <button
                    onClick={() => handleRemoveFile(index)}
                    className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    disabled={uploading}
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <div className="absolute bottom-2 left-2 right-2 bg-background/80 backdrop-blur-sm p-1 rounded text-xs truncate">
                    {selectedFiles[index]?.name}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Informações */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              {selectedFiles.length} foto(s) selecionada(s)
            </p>
          </div>

          {/* Botões de ação */}
          <div className="flex gap-2 justify-end pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedFiles([]);
                setPreviews([]);
                onOpenChange(false);
              }}
              disabled={uploading}
            >
              Cancelar
            </Button>
            <Button
              variant="secondary"
              onClick={handleUploadOnly}
              disabled={uploading || selectedFiles.length === 0}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Apenas Enviar Fotos
                </>
              )}
            </Button>
            <Button
              onClick={handleUploadAndFinalize}
              disabled={uploading || selectedFiles.length === 0}
              className="bg-gradient-primary"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Enviar e Finalizar
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
