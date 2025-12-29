import { useState, useCallback } from 'react';

interface CompressionProgress {
  stage: 'loading' | 'compressing' | 'done';
  progress: number;
}

interface CompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

// Configurações de compressão
const COMPRESSION_CONFIG = {
  maxWidth: 1280,
  maxHeight: 720,
  videoBitrate: 1000000, // 1 Mbps
  audioBitrate: 128000, // 128 kbps
};

export function useVideoCompression() {
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState<CompressionProgress>({
    stage: 'loading',
    progress: 0
  });

  const compressVideo = useCallback(async (file: File): Promise<CompressionResult> => {
    setIsCompressing(true);
    setCompressionProgress({ stage: 'loading', progress: 0 });

    const originalSize = file.size;

    try {
      // Criar elemento de vídeo para carregar o arquivo
      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;

      // Carregar o vídeo
      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve();
        video.onerror = () => reject(new Error('Erro ao carregar vídeo'));
        video.src = URL.createObjectURL(file);
      });

      setCompressionProgress({ stage: 'loading', progress: 50 });

      // Calcular dimensões de saída mantendo aspect ratio
      let outputWidth = video.videoWidth;
      let outputHeight = video.videoHeight;

      if (outputWidth > COMPRESSION_CONFIG.maxWidth) {
        const ratio = COMPRESSION_CONFIG.maxWidth / outputWidth;
        outputWidth = COMPRESSION_CONFIG.maxWidth;
        outputHeight = Math.round(outputHeight * ratio);
      }

      if (outputHeight > COMPRESSION_CONFIG.maxHeight) {
        const ratio = COMPRESSION_CONFIG.maxHeight / outputHeight;
        outputHeight = COMPRESSION_CONFIG.maxHeight;
        outputWidth = Math.round(outputWidth * ratio);
      }

      // Garantir dimensões pares (necessário para alguns codecs)
      outputWidth = outputWidth - (outputWidth % 2);
      outputHeight = outputHeight - (outputHeight % 2);

      // Criar canvas para processamento
      const canvas = document.createElement('canvas');
      canvas.width = outputWidth;
      canvas.height = outputHeight;
      const ctx = canvas.getContext('2d')!;

      // Verificar suporte a MediaRecorder com codec desejado
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
          ? 'video/webm;codecs=vp8'
          : 'video/webm';

      setCompressionProgress({ stage: 'compressing', progress: 0 });

      // Capturar stream do canvas
      const stream = canvas.captureStream(30); // 30 FPS

      // Adicionar áudio se existir
      try {
        const audioContext = new AudioContext();
        const source = audioContext.createMediaElementSource(video);
        const destination = audioContext.createMediaStreamDestination();
        source.connect(destination);
        source.connect(audioContext.destination);
        
        destination.stream.getAudioTracks().forEach(track => {
          stream.addTrack(track);
        });
      } catch (audioError) {
        console.log('Vídeo sem áudio ou erro ao processar áudio:', audioError);
      }

      // Configurar MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: COMPRESSION_CONFIG.videoBitrate,
      });

      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      // Processar vídeo frame a frame
      const duration = video.duration;
      
      const compressedBlob = await new Promise<Blob>((resolve, reject) => {
        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: mimeType });
          resolve(blob);
        };

        mediaRecorder.onerror = (event) => {
          reject(new Error('Erro durante compressão'));
        };

        mediaRecorder.start(100); // Chunks a cada 100ms

        video.currentTime = 0;
        video.play();

        const updateProgress = () => {
          const progress = Math.min((video.currentTime / duration) * 100, 100);
          setCompressionProgress({ stage: 'compressing', progress });
        };

        video.ontimeupdate = updateProgress;

        video.onended = () => {
          mediaRecorder.stop();
          stream.getTracks().forEach(track => track.stop());
        };

        // Renderizar frames no canvas
        const renderFrame = () => {
          if (video.ended || video.paused) return;
          ctx.drawImage(video, 0, 0, outputWidth, outputHeight);
          requestAnimationFrame(renderFrame);
        };

        requestAnimationFrame(renderFrame);
      });

      // Limpar recursos
      URL.revokeObjectURL(video.src);

      // Criar arquivo comprimido
      const compressedFileName = file.name.replace(/\.[^/.]+$/, '') + '_compressed.webm';
      const compressedFile = new File([compressedBlob], compressedFileName, {
        type: mimeType,
      });

      setCompressionProgress({ stage: 'done', progress: 100 });

      const result: CompressionResult = {
        file: compressedFile,
        originalSize,
        compressedSize: compressedFile.size,
        compressionRatio: Math.round((1 - compressedFile.size / originalSize) * 100),
      };

      return result;
    } finally {
      setIsCompressing(false);
    }
  }, []);

  const shouldCompress = useCallback((file: File): boolean => {
    // Comprimir se o arquivo for maior que 50MB
    const threshold = 50 * 1024 * 1024;
    return file.size > threshold;
  }, []);

  return {
    compressVideo,
    isCompressing,
    compressionProgress,
    shouldCompress,
  };
}
