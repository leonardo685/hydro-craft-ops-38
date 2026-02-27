import { useState, useRef, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, Video, X, CheckCircle, Loader2, Camera, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useVideoCompression } from "@/hooks/useVideoCompression";
import * as tus from 'tus-js-client';

interface UploadVideoTesteModalProps {
  ordem: any;
  children: React.ReactNode;
  onUploadComplete?: () => void;
}

export function UploadVideoTesteModal({ ordem, children, onUploadComplete }: UploadVideoTesteModalProps) {
  const [open, setOpen] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const videoPreviewUrl = useMemo(() => {
    if (videoFile) return URL.createObjectURL(videoFile);
    return null;
  }, [videoFile]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'preparing' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [testeInfo, setTesteInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
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
      setUploadStatus('idle');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log('📹 Arquivo selecionado:', file.name, 'Tipo:', file.type, 'Tamanho:', file.size);

    // Validar por extensão também (MOV às vezes não tem MIME type correto)
    const validExtensions = ['.mp4', '.mov', '.webm', '.avi', '.mkv', '.m4v', '.3gp'];
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    const isVideoByType = file.type.startsWith('video/') || file.type === 'application/octet-stream';
    const isVideoByExtension = validExtensions.includes(extension);

    if (!isVideoByType && !isVideoByExtension) {
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

    // Feedback imediato
    toast({
      title: "Vídeo selecionado!",
      description: `${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)`,
    });

    // Usar arquivo diretamente sem compressão automática
    // (compressão pode falhar com arquivos MOV grandes)
    setVideoFile(file);
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

    // Mostrar estado de preparação imediatamente
    setUploadStatus('preparing');
    setUploadProgress(0);
    setUploadError(null);

    try {
      console.log('=== INICIANDO UPLOAD RESUMÍVEL (TUS) ===');
      console.log('Arquivo:', videoFile.name, 'Tipo:', videoFile.type, 'Tamanho:', (videoFile.size / 1024 / 1024).toFixed(2), 'MB');
      
      // Verificar autenticação
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Sessão:', session ? 'OK' : 'NÃO AUTENTICADO');
      
      if (!session?.access_token) {
        toast({
          title: "Erro de autenticação",
          description: "Você precisa estar logado para fazer upload de vídeos.",
          variant: "destructive",
        });
        setUploadStatus('error');
        setUploadError('Não autenticado');
        return;
      }

      // Gerar nome do arquivo
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const numeroOrdem = ordem.recebimentos?.numero_ordem || ordem.numero_ordem || 'sem-numero';
      const fileName = `${numeroOrdem}_teste_${timestamp}.mp4`;
      const bucketName = 'videos-teste';

      console.log('Nome do arquivo:', fileName);

      // Iniciar upload resumível com TUS
      setUploadStatus('uploading');
      
      const supabaseUrl = 'https://fmbfkufkxvyncadunlhh.supabase.co';
      const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtYmZrdWZreHZ5bmNhZHVubGhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwOTM1NDYsImV4cCI6MjA3MjY2OTU0Nn0.A3-H5fOxRJMx_q4Vj3qvM0vxjZgSF-VXxZYBdZT-Tbs';

      const videoUrl = await new Promise<string | null>((resolve, reject) => {
        const upload = new tus.Upload(videoFile, {
          endpoint: `${supabaseUrl}/storage/v1/upload/resumable`,
          retryDelays: [0, 3000, 5000, 10000, 20000],
          headers: {
            authorization: `Bearer ${session.access_token}`,
            apikey: anonKey,
          },
          uploadDataDuringCreation: false,
          removeFingerprintOnSuccess: true,
          chunkSize: 6 * 1024 * 1024, // 6MB por chunk
          metadata: {
            bucketName: bucketName,
            objectName: fileName,
            contentType: 'video/mp4',
            cacheControl: '3600',
          },
          onError: (error) => {
            console.error('TUS Error:', error);
            setUploadError(error.message || 'Erro no upload');
            reject(error);
          },
          onProgress: (bytesUploaded, bytesTotal) => {
            const percentage = Math.round((bytesUploaded / bytesTotal) * 100);
            console.log(`Progresso: ${percentage}% (${(bytesUploaded / 1024 / 1024).toFixed(1)}MB / ${(bytesTotal / 1024 / 1024).toFixed(1)}MB)`);
            setUploadProgress(percentage);
          },
          onSuccess: () => {
            console.log('TUS Upload concluído!');
            const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucketName}/${fileName}`;
            resolve(publicUrl);
          },
        });

        // Verificar se há upload anterior para retomar
        upload.findPreviousUploads().then((previousUploads) => {
          if (previousUploads.length > 0) {
            console.log('Retomando upload anterior...');
            upload.resumeFromPreviousUpload(previousUploads[0]);
          }
          upload.start();
        });
      });

      if (!videoUrl) {
        throw new Error(uploadError || 'Falha no upload do vídeo');
      }

      console.log('Upload concluído! URL:', videoUrl);

      // Atualizar o teste com a URL do vídeo
      const { error } = await supabase
        .from('testes_equipamentos')
        .update({ video_url: videoUrl })
        .eq('id', testeInfo.id);

      if (error) throw error;

      setUploadStatus('success');
      toast({
        title: "Vídeo enviado!",
        description: "O vídeo do teste foi salvo com sucesso.",
      });

      setTimeout(() => {
        setOpen(false);
        onUploadComplete?.();
      }, 1500);
    } catch (error: any) {
      console.error('Erro no upload:', error);
      setUploadStatus('error');
      const errorMessage = uploadError || error?.message || 'Não foi possível enviar o vídeo';
      setUploadError(errorMessage);
      toast({
        title: "Erro no upload",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const removeVideo = () => {
    setVideoFile(null);
    setUploadProgress(0);
    setUploadStatus('idle');
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (cameraInputRef.current) {
      cameraInputRef.current.value = '';
    }
  };

  const openCamera = () => {
    cameraInputRef.current?.click();
  };

  const isUploading = uploadStatus === 'uploading' || uploadStatus === 'preparing';

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
              disabled={isUploading}
            />
            
            {/* Input para captura de câmera */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="video/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
              id="video-camera-input"
              disabled={isUploading}
            />
            
            {!videoFile ? (
              <div className="space-y-3">
                {/* Botão de gravar com câmera */}
                <Button
                  type="button"
                  variant="default"
                  className="w-full h-16"
                  onClick={openCamera}
                  disabled={isUploading}
                >
                  <Camera className="h-6 w-6 mr-2" />
                  Gravar Vídeo com Câmera
                </Button>

                {/* Divisor */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">ou</span>
                  </div>
                </div>

                {/* Selecionar arquivo existente */}
                <label
                  htmlFor="video-upload-modal-input"
                  className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                  <span className="text-sm text-muted-foreground">
                    Selecionar vídeo existente
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Máximo 500MB
                  </span>
                </label>
              </div>
            ) : (
              <div className="p-4 bg-muted/30 rounded-lg space-y-3">
                {/* Preview do vídeo */}
                {videoPreviewUrl && (
                  <div className="relative rounded-lg overflow-hidden bg-black">
                    <video
                      src={videoPreviewUrl}
                      controls
                      className="w-full max-h-48 object-contain"
                      preload="metadata"
                    />
                  </div>
                )}

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
                  {!isUploading && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={removeVideo}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* Barra de progresso de compressão */}
                {isCompressing && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Comprimindo vídeo...
                      </span>
                      <span>{compressionProgress.progress}%</span>
                    </div>
                    <Progress value={compressionProgress.progress} className="h-2" />
                  </div>
                )}

                {/* Estado de preparação */}
                {uploadStatus === 'preparing' && (
                  <div className="space-y-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
                    <div className="flex items-center gap-2 text-primary font-medium text-sm">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Preparando upload...
                    </div>
                    <Progress value={0} className="h-2" />
                  </div>
                )}

                {/* Barra de progresso de upload */}
                {uploadStatus === 'uploading' && (
                  <div className="space-y-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-2 text-primary font-medium">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Enviando vídeo...
                      </span>
                      <span className="text-primary font-bold">{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-3" />
                    <p className="text-xs text-amber-600 text-center font-medium">
                      ⚠️ Não feche esta janela durante o upload
                    </p>
                  </div>
                )}

                {/* Sucesso */}
                {uploadStatus === 'success' && (
                  <div className="flex items-center gap-2 text-green-600 text-sm p-3 bg-green-50 rounded-lg border border-green-200">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">Upload concluído com sucesso!</span>
                  </div>
                )}

                {/* Erro */}
                {uploadStatus === 'error' && uploadError && (
                  <div className="flex items-start gap-2 text-red-600 text-sm p-3 bg-red-50 rounded-lg border border-red-200">
                    <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium block">Erro no upload</span>
                      <span className="text-xs">{uploadError}</span>
                    </div>
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
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando... {uploadProgress}%
              </>
            ) : "Enviar Vídeo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
