import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Video, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function UploadVideoTeste() {
  const navigate = useNavigate();
  const [testeId, setTesteId] = useState("b461d197-208e-4a0f-98c6-0110d42689b6");
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
    if (!videoFile || !testeId) {
      toast({
        title: "Erro",
        description: "Selecione um vídeo e informe o ID do teste",
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
    } catch (error) {
      console.error('Erro ao enviar vídeo:', error);
      toast({
        title: "Erro",
        description: "Erro ao enviar vídeo. Verifique o console para mais detalhes.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <Button
        variant="ghost"
        onClick={() => navigate(-1)}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-6 w-6" />
            Upload de Vídeo para Teste MH-013-25
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="testeId">ID do Teste</Label>
            <Input
              id="testeId"
              value={testeId}
              onChange={(e) => setTesteId(e.target.value)}
              placeholder="ID do teste"
            />
            <p className="text-xs text-muted-foreground mt-1">
              ID já preenchido para MH-013-25
            </p>
          </div>

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

          <Button 
            onClick={handleSubmit} 
            disabled={uploading || !videoFile || !testeId}
            className="w-full"
          >
            {uploading ? "Enviando..." : "Enviar Vídeo"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
