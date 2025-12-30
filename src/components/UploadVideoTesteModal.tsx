import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, Video, X, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useVideoCompression } from "@/hooks/useVideoCompression";

interface UploadVideoTesteModalProps {
  ordem: any;
  children: React.ReactNode;
  onUploadComplete?: () => void;
}

export function UploadVideoTesteModal({ ordem, children, onUploadComplete }: UploadVideoTesteModalProps) {
  const [open, setOpen] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [testeInfo, setTesteInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { compressVideo, isCompressing, compressionProgress, shouldCompress } = useVideoCompression();

  const loadTesteInfo = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('testes_equipamentos')
        .select('*')
        .eq('ordem_servico_id', ordem.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error) throw error;
      setTesteInfo(data);
    } catch (error) {
      console.error('Erro ao carregar teste:', error);
      toast({
        title: "Erro",
        description: "Não foi possível encontrar um teste para esta ordem.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      loadTesteInfo();
      setVideoFile(null);
      setUploadProgress(0);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('video/')) {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione um arquivo de vídeo.",
        variant: "destructive",
      });
      return;
    }

    // Validar tamanho (máximo 500MB)
    const maxSize = 500 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: "Arquivo muito grande",
        description: "O vídeo deve ter no máximo 500MB.",
        variant: "destructive",
      });
      return;
    }

    // Comprimir se necessário
    if (shouldCompress(file)) {
      try {
        const result = await compressVideo(file);
        setVideoFile(result.file);
        toast({
          title: "Vídeo comprimido",
          description: `Tamanho reduzido de ${(result.originalSize / 1024 / 1024).toFixed(1)}MB para ${(result.compressedSize / 1024 / 1024).toFixed(1)}MB`,
        });
      } catch (error) {
        console.error('Erro na compressão:', error);
        setVideoFile(file);
      }
    } else {
      setVideoFile(file);
    }
  };

  const uploadWithProgress = async (file: File, fileName: string): Promise<string | null> => {
    const supabaseUrl = 'https://fmbfkufkxvyncadunlhh.supabase.co';
    
    // Obter token do usuário autenticado
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      console.error('Upload falhou: usuário não autenticado');
      toast({
        title: "Erro de autenticação",
        description: "Você precisa estar logado para fazer upload de vídeos.",
        variant: "destructive",
      });
      return null;
    }
    
    console.log('Upload iniciando com token do usuário autenticado');
    console.log('Tamanho do arquivo:', (file.size / 1024 / 1024).toFixed(2), 'MB');
    
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(progress);
          console.log('Progresso do upload:', progress, '%');
        }
      });
      
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const publicUrl = `${supabaseUrl}/storage/v1/object/public/videos-teste/${fileName}`;
          console.log('Upload concluído:', publicUrl);
          resolve(publicUrl);
        } else {
          console.error('Upload falhou:', {
            status: xhr.status,
            statusText: xhr.statusText,
            response: xhr.responseText
          });
          resolve(null);
        }
      });
      
      xhr.addEventListener('error', (e) => {
        console.error('Erro de rede no upload:', e);
        resolve(null);
      });
      
      xhr.addEventListener('timeout', () => {
        console.error('Upload timeout');
        resolve(null);
      });
      
      // Timeout de 10 minutos para uploads grandes
      xhr.timeout = 600000;
      
      xhr.open('POST', `${supabaseUrl}/storage/v1/object/videos-teste/${fileName}`);
      xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`);
      xhr.setRequestHeader('x-upsert', 'true');
      xhr.send(file);
    });
  };

  const handleUpload = async () => {
    if (!videoFile || !testeInfo) {
      toast({
        title: "Erro",
        description: "Selecione um vídeo para fazer upload.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Gerar nome do arquivo
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const numeroOrdem = ordem.recebimentos?.numero_ordem || ordem.numero_ordem || 'sem-numero';
      const fileExt = videoFile.name.split('.').pop() || 'mp4';
      const fileName = `${numeroOrdem}_teste_${timestamp}.${fileExt}`;

      console.log('Iniciando upload do vídeo:', fileName);

      // Fazer upload com progresso
      const videoUrl = await uploadWithProgress(videoFile, fileName);

      if (!videoUrl) {
        throw new Error('Falha no upload do vídeo');
      }

      // Atualizar o teste com a URL do vídeo
      const { error } = await supabase
        .from('testes_equipamentos')
        .update({ video_url: videoUrl })
        .eq('id', testeInfo.id);

      if (error) throw error;

      toast({
        title: "Vídeo enviado!",
        description: "O vídeo do teste foi salvo com sucesso.",
      });

      setOpen(false);
      onUploadComplete?.();
    } catch (error) {
      console.error('Erro no upload:', error);
      toast({
        title: "Erro no upload",
        description: "Não foi possível enviar o vídeo. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const removeVideo = () => {
    setVideoFile(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Upload de Vídeo do Teste
          </DialogTitle>
          <DialogDescription>
            Envie o vídeo do teste para a ordem {ordem.recebimentos?.numero_ordem || ordem.numero_ordem}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-4 text-muted-foreground">
              Carregando informações do teste...
            </div>
          ) : testeInfo ? (
            <div className="p-3 bg-muted/50 rounded-lg text-sm">
              <p><strong>Teste:</strong> {testeInfo.tipo_teste}</p>
              <p><strong>Resultado:</strong> {testeInfo.resultado_teste}</p>
              <p><strong>Data:</strong> {new Date(testeInfo.data_hora_teste).toLocaleString('pt-BR')}</p>
              {testeInfo.video_url && (
                <p className="text-green-600 flex items-center gap-1 mt-2">
                  <CheckCircle className="h-4 w-4" />
                  Já possui vídeo (será substituído)
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-4 text-red-500">
              Nenhum teste encontrado para esta ordem.
            </div>
          )}

          {/* Input de arquivo */}
          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileChange}
              className="hidden"
              id="video-upload-modal-input"
            />
            
            {!videoFile ? (
              <label
                htmlFor="video-upload-modal-input"
                className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">
                  Clique para selecionar o vídeo
                </span>
                <span className="text-xs text-muted-foreground mt-1">
                  Máximo 500MB
                </span>
              </label>
            ) : (
              <div className="p-4 bg-muted/30 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Video className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium truncate max-w-[200px]">
                        {videoFile.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(videoFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={removeVideo}
                    disabled={isUploading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Barra de progresso de compressão */}
                {isCompressing && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Comprimindo vídeo...</span>
                      <span>{compressionProgress.progress}%</span>
                    </div>
                    <Progress value={compressionProgress.progress} className="h-2" />
                  </div>
                )}

                {/* Barra de progresso de upload */}
                {isUploading && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Enviando...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-2" />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isUploading}>
            Cancelar
          </Button>
          <Button 
            onClick={handleUpload} 
            disabled={!videoFile || !testeInfo || isUploading || isCompressing}
          >
            {isUploading ? "Enviando..." : "Enviar Vídeo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
