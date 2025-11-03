import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Video } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface UploadVideoTesteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  testeId: string;
  onSuccess: () => void;
}

export function UploadVideoTesteModal({ 
  open, 
  onOpenChange, 
  testeId,
  onSuccess 
}: UploadVideoTesteModalProps) {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type.startsWith('video/')) {
        const maxSize = 100 * 1024 * 1024; // 100MB
        if (file.size > maxSize) {
          toast({
            title: "Arquivo muito grande",
            description: "O vídeo deve ter no máximo 100MB.",
            variant: "destructive",
          });
          return;
        }
        setVideoFile(file);
      } else {
        toast({
          title: "Erro",
          description: "Por favor, selecione apenas arquivos de vídeo",
          variant: "destructive",
        });
      }
    }
  };

  const handleSubmit = async () => {
    if (!videoFile) {
      toast({
        title: "Erro",
        description: "Selecione um vídeo para fazer upload",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('testeId', testeId);
      formData.append('video', videoFile);

      const { data, error } = await supabase.functions.invoke('upload-video-teste', {
        body: formData,
      });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Vídeo enviado com sucesso!",
      });

      setVideoFile(null);
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Erro ao enviar vídeo:', error);
      toast({
        title: "Erro",
        description: "Erro ao enviar vídeo",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Adicionar Vídeo ao Teste
          </DialogTitle>
          <DialogDescription>
            Faça upload do vídeo do teste
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="videoFile">Vídeo (máx. 100MB)</Label>
            <div className="mt-2 space-y-2">
              <div className="flex items-center gap-4">
                <Input
                  id="videoFile"
                  type="file"
                  accept="video/*"
                  onChange={handleFileChange}
                  className="flex-1"
                />
                <Upload className="h-5 w-5 text-muted-foreground" />
              </div>
              {videoFile && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Video className="h-4 w-4" />
                  <span>{videoFile.name}</span>
                  <span>({(videoFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={uploading || !videoFile}
            >
              {uploading ? "Enviando..." : "Enviar Vídeo"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
