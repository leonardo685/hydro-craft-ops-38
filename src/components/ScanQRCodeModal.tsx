import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Html5Qrcode } from "html5-qrcode";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search } from "lucide-react";

interface ScanQRCodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SCANNER_ID = "qr-internal-scanner-region";

export function ScanQRCodeModal({ open, onOpenChange }: ScanQRCodeModalProps) {
  const navigate = useNavigate();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [loading, setLoading] = useState(false);
  const [manual, setManual] = useState("");
  const handlingRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const start = async () => {
      try {
        const instance = new Html5Qrcode(SCANNER_ID);
        scannerRef.current = instance;
        await instance.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          async (decoded) => {
            if (handlingRef.current) return;
            handlingRef.current = true;
            await handleResult(decoded);
            handlingRef.current = false;
          },
          () => {}
        );
        if (cancelled) {
          await instance.stop().catch(() => {});
        }
      } catch (err) {
        console.error("Erro ao iniciar câmera:", err);
        toast.error("Não foi possível acessar a câmera. Use a busca manual.");
      }
    };

    start();

    return () => {
      cancelled = true;
      const inst = scannerRef.current;
      if (inst) {
        inst.stop().catch(() => {}).finally(() => {
          inst.clear();
          scannerRef.current = null;
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const extractNumeroOrdem = (raw: string): string => {
    const trimmed = raw.trim();
    // If URL containing /ordem/MH-XXX-YY or /acesso-ordem/...
    const match = trimmed.match(/MH-\d+-\d+/i);
    if (match) return match[0].toUpperCase();
    return trimmed.toUpperCase();
  };

  const handleResult = async (raw: string) => {
    const numeroOrdem = extractNumeroOrdem(raw);
    if (!numeroOrdem) return;
    setLoading(true);
    try {
      onOpenChange(false);
      navigate(`/processo-interno/${numeroOrdem}`);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao abrir ordem");
    } finally {
      setLoading(false);
    }
  };

  const handleManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manual.trim()) return;
    await handleResult(manual);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ler QR Code do equipamento</DialogTitle>
          <DialogDescription>
            Aponte a câmera para o QR Code. Funciona para qualquer ordem (recebimento, análise, aprovados, orçamento, etc.)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div
            id={SCANNER_ID}
            className="w-full overflow-hidden rounded-lg border bg-muted aspect-square"
          />

          {loading && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Buscando...
            </div>
          )}

          <form onSubmit={handleManual} className="flex gap-2">
            <Input
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              placeholder="Ex: MH-001-25"
              disabled={loading}
            />
            <Button type="submit" size="icon" disabled={loading || !manual.trim()}>
              <Search className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}