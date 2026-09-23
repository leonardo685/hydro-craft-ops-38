import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { recordWav } from "@/lib/wav-recorder";
import { supabase } from "@/integrations/supabase/client";

interface DitarLaudoButtonProps {
  currentText: string;
  onResult: (texto: string) => void;
}

const COPY = {
  "pt-BR": {
    start: "Ditar",
    stop: "Parar",
    processing: "Organizando...",
    recording: "Gravando... descreva os problemas encontrados.",
    micError: "Não foi possível acessar o microfone.",
    empty: "Não captamos nenhuma fala. Tente novamente.",
    fail: "Não foi possível transcrever o áudio.",
    done: "Laudo organizado a partir da sua fala.",
  },
  en: {
    start: "Dictate",
    stop: "Stop",
    processing: "Organizing...",
    recording: "Recording... describe the problems found.",
    micError: "Could not access the microphone.",
    empty: "No speech was captured. Please try again.",
    fail: "Could not transcribe the audio.",
    done: "Report organized from your speech.",
  },
  es: {
    start: "Dictar",
    stop: "Detener",
    processing: "Organizando...",
    recording: "Grabando... describa los problemas encontrados.",
    micError: "No fue posible acceder al micrófono.",
    empty: "No se captó ninguna voz. Inténtelo de nuevo.",
    fail: "No fue posible transcribir el audio.",
    done: "Informe organizado a partir de su voz.",
  },
} as const;

export function DitarLaudoButton({ currentText, onResult }: DitarLaudoButtonProps) {
  const { language } = useLanguage();
  const { toast } = useToast();
  const copy = COPY[language as keyof typeof COPY] ?? COPY["pt-BR"];
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const recorderRef = useRef<{ stop: () => Promise<File> } | null>(null);

  const start = async () => {
    try {
      recorderRef.current = await recordWav();
      setIsRecording(true);
      toast({ title: copy.start, description: copy.recording });
    } catch (error) {
      console.error("Erro ao iniciar gravação:", error);
      toast({ title: copy.micError, variant: "destructive" });
    }
  };

  const stop = async () => {
    const recorder = recorderRef.current;
    recorderRef.current = null;
    setIsRecording(false);
    if (!recorder) return;

    setIsProcessing(true);
    try {
      const file = await recorder.stop();
      const form = new FormData();
      form.append("file", file, file.name);
      form.append("language", language);
      form.append("current", currentText || "");

      const { data, error } = await supabase.functions.invoke("laudo-tecnico-voz", { body: form });
      if (error) throw error;
      const laudo = (data as any)?.laudo as string | undefined;
      if (!laudo) throw new Error((data as any)?.error || copy.fail);

      onResult(laudo);
      toast({ title: copy.done });
    } catch (error) {
      const mensagem = (error as Error).message || "";
      console.error("Erro ao processar ditado:", error);
      toast({
        title: mensagem.includes("EMPTY_RECORDING") ? copy.empty : copy.fail,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Button
      type="button"
      size="sm"
      variant={isRecording ? "destructive" : "outline"}
      disabled={isProcessing}
      onClick={isRecording ? stop : start}
      className="gap-2"
    >
      {isProcessing ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {copy.processing}
        </>
      ) : isRecording ? (
        <>
          <Square className="h-4 w-4" />
          {copy.stop}
        </>
      ) : (
        <>
          <Mic className="h-4 w-4" />
          {copy.start}
        </>
      )}
    </Button>
  );
}
