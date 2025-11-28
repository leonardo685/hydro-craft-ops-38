import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, X, Image as ImageIcon, Loader2, Camera } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface UploadFotosProducaoModalProps {
  ordem: any;
  children: React.ReactNode;
  onUploadComplete: () => void;
}

export function UploadFotosProducaoModal({ 
  ordem, 
  children,
  onUploadComplete 
}: UploadFotosProducaoModalProps) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const { toast } = useToast();

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

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast({
        title: "Atenção",
        description: "Por favor, selecione pelo menos uma foto",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      // Upload das fotos para o bucket 'equipamentos'
      const uploadPromises = selectedFiles.map(async (file, index) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `producao_${ordem.id}_${Date.now()}_${index}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('equipamentos')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Obter URL pública
        const { data: { publicUrl } } = supabase.storage
          .from('equipamentos')
          .getPublicUrl(filePath);

        // Salvar referência no banco com recebimento_id E ordem_servico_id
        const { error: insertError } = await supabase
          .from('fotos_equipamentos')
          .insert({
            recebimento_id: ordem.recebimento_id || null,
            ordem_servico_id: ordem.id,
            arquivo_url: publicUrl,
            nome_arquivo: fileName,
            apresentar_orcamento: false,
            legenda: 'Foto de produção',
          });

        if (insertError) {
          console.error('Erro ao salvar foto no banco:', insertError);
          throw insertError;
        }

        return publicUrl;
      });

      await Promise.all(uploadPromises);

      toast({
        title: "Upload concluído",
        description: `${selectedFiles.length} foto(s) enviada(s) com sucesso`,
      });

      // Limpar estado e fechar modal
      setSelectedFiles([]);
      setPreviews([]);
      setOpen(false);

      // Notificar conclusão
      onUploadComplete();
    } catch (error) {
      console.error('Erro no upload:', error);
      toast({
        title: "Erro no upload",
        description: error instanceof Error ? error.message : "Erro ao enviar as fotos",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <div onClick={() => setOpen(true)}>
        {children}
      </div>
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Fotos do Equipamento
            </DialogTitle>
            <DialogDescription>
              Ordem: {ordem.recebimentos?.numero_ordem || ordem.numero_ordem} - {ordem.equipamento}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Área de upload */}
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
              <input
                type="file"
                id="foto-upload"
                multiple
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                disabled={uploading}
              />
              <label
                htmlFor="foto-upload"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <Camera className="h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Clique para adicionar fotos do equipamento
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
                  setOpen(false);
                }}
                disabled={uploading}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleUpload}
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
                    Enviar Fotos
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
