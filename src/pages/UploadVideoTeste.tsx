import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Video, ArrowLeft, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function UploadVideoTeste() {
  const navigate = useNavigate();
  const [testeId, setTesteId] = useState("cc90dc45-423d-4679-9b1e-a502b740e171");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Buscar URL do vídeo atual
    const fetchCurrentVideo = async () => {
      const { data, error } = await supabase
        .from('testes_equipamentos')
        .select('video_url')
        .eq('id', testeId)
        .single();
      
      if (!error && data?.video_url) {
        setVideoUrl(data.video_url);
      }
    };
    
    fetchCurrentVideo();
  }, [testeId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type.startsWith('video/')) {
        const maxSize = 500 * 1024 * 1024; // 500MB
        if (file.size > maxSize) {
          toast({
            title: "Arquivo muito grande",
            description: "O vídeo deve ter no máximo 500MB.",
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
      setVideoUrl(data.videoUrl);
      
      // Atualizar a página após 2 segundos
      setTimeout(() => {
        window.location.reload();
      }, 2000);
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
            Upload de Vídeo para Teste MH-001-26
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
              ID já preenchido para MH-001-26
            </p>
          </div>

          {videoUrl && (
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm font-medium mb-2">Vídeo Atual:</p>
              <a 
                href={videoUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline flex items-center gap-2"
              >
                Ver vídeo <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}

          <div>
            <Label htmlFor="videoFile">Vídeo (máx. 500MB)</Label>
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
              <p className="text-xs text-muted-foreground">
                Selecione o arquivo de vídeo que deseja fazer upload (ex: Vídeo_do_WhatsApp_de_2025-11-02_à_s_11.32.33_a5f8d660.mp4)
              </p>
            </div>
          </div>

          <Button 
            onClick={handleSubmit} 
            disabled={uploading || !videoFile || !testeId}
            className="w-full"
          >
            {uploading ? "Enviando..." : "Enviar Vídeo"}
          </Button>

          <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
              Instruções:
            </p>
            <ol className="text-xs text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside">
              <li>Clique em "Escolher arquivo" acima</li>
              <li>Selecione o vídeo que você quer fazer upload</li>
              <li>Clique em "Enviar Vídeo"</li>
              <li>Aguarde o upload completar</li>
              <li>Acesse o laudo público em /laudo-publico/MH-013-25 para ver o vídeo</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
