import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Copy, Check, Download, Mail, Plus, Send, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useClientes } from "@/hooks/use-clientes";
import { useEmpresa } from "@/contexts/EmpresaContext";
import { supabase } from "@/integrations/supabase/client";

interface EnviarQRCodeClienteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  numeroOrdem: string;
  clienteNome: string;
}

export function EnviarQRCodeClienteModal({
  open,
  onOpenChange,
  numeroOrdem,
  clienteNome,
}: EnviarQRCodeClienteModalProps) {
  const { toast } = useToast();
  const { clientes, adicionarEmail } = useClientes();
  const { empresaAtual } = useEmpresa();

  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [emailsSelecionados, setEmailsSelecionados] = useState<string[]>([]);
  const [novoEmail, setNovoEmail] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const link =
    `${window.location.origin}/ordem/${encodeURIComponent(numeroOrdem)}` +
    (empresaAtual?.id ? `?e=${empresaAtual.id}` : "");

  const clienteEncontrado = useMemo(
    () => clientes.find((c) => c.nome === clienteNome) || null,
    [clientes, clienteNome]
  );

  const emailsDisponiveis = useMemo(() => {
    const emails: string[] = [];
    if (clienteEncontrado?.email) emails.push(clienteEncontrado.email);
    if (clienteEncontrado?.emails_adicionais) {
      emails.push(...(clienteEncontrado.emails_adicionais as string[]));
    }
    return [...new Set(emails.filter(Boolean))];
  }, [clienteEncontrado]);

  useEffect(() => {
    if (!open) {
      setNovoEmail("");
      setEnviando(false);
      setCopiado(false);
      return;
    }
    setEmailsSelecionados(emailsDisponiveis);
    QRCode.toDataURL(link, { width: 600, margin: 2, errorCorrectionLevel: "M" })
      .then(setQrDataUrl)
      .catch((err) => console.error("Erro ao gerar QR Code:", err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, link, emailsDisponiveis.join(",")]);

  const toggleEmail = (email: string) => {
    setEmailsSelecionados((prev) =>
      prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]
    );
  };

  const handleAdicionarEmail = async () => {
    const email = novoEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({ title: "E-mail inválido", description: "Informe um e-mail válido", variant: "destructive" });
      return;
    }
    if (emailsSelecionados.includes(email)) {
      setNovoEmail("");
      return;
    }
    // Salva no cadastro do cliente quando possível
    if (clienteEncontrado && !emailsDisponiveis.includes(email)) {
      try {
        await adicionarEmail(clienteEncontrado.id, email);
      } catch {
        // hook já exibe o toast de erro
      }
    }
    setEmailsSelecionados((prev) => [...prev, email]);
    setNovoEmail("");
  };

  const handleCopiarLink = async () => {
    await navigator.clipboard.writeText(link);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `qrcode-${numeroOrdem}.png`;
    a.click();
  };

  const handleEnviar = async () => {
    if (emailsSelecionados.length === 0) {
      toast({
        title: "Selecione um e-mail",
        description: "Escolha ao menos um destinatário",
        variant: "destructive",
      });
      return;
    }
    setEnviando(true);
    try {
      const { data, error } = await supabase.functions.invoke("enviar-qrcode-cliente", {
        body: {
          numeroOrdem,
          clienteNome,
          emails: emailsSelecionados,
          link,
          empresaNome: empresaAtual?.razao_social || empresaAtual?.nome || "MEC HYDRO",
          qrBase64: qrDataUrl.split(",")[1],
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "QR Code enviado",
        description: `Enviado para ${emailsSelecionados.length} destinatário(s)`,
      });
      onOpenChange(false);
    } catch (err: any) {
      console.error("Erro ao enviar QR Code:", err);
      toast({
        title: "Erro ao enviar",
        description: err?.message || "Não foi possível enviar o e-mail",
        variant: "destructive",
      });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Enviar QR Code ao cliente</DialogTitle>
          <DialogDescription>
            O cliente acompanha o andamento do serviço da ordem {numeroOrdem} e, ao finalizar, acessa o laudo
            técnico pelo mesmo QR Code.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-col items-center gap-3">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt={`QR Code ${numeroOrdem}`} className="w-44 h-44 rounded-lg border bg-white p-2" />
            ) : (
              <div className="w-44 h-44 rounded-lg border bg-muted flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleDownload} disabled={!qrDataUrl}>
                <Download className="w-4 h-4 mr-2" />
                Baixar PNG
              </Button>
              <Button variant="outline" size="sm" onClick={handleCopiarLink}>
                {copiado ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                Copiar link
              </Button>
            </div>
            <p className="text-xs text-muted-foreground break-all text-center">{link}</p>
          </div>

          <Separator />

          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-muted-foreground" />
              Destinatários
            </Label>

            {emailsSelecionados.length === 0 && emailsDisponiveis.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhum e-mail cadastrado para este cliente. Adicione um abaixo.
              </p>
            )}

            <div className="space-y-2">
              {[...new Set([...emailsDisponiveis, ...emailsSelecionados])].map((email) => (
                <div key={email} className="flex items-center gap-2">
                  <Checkbox
                    id={`qr-email-${email}`}
                    checked={emailsSelecionados.includes(email)}
                    onCheckedChange={() => toggleEmail(email)}
                  />
                  <label htmlFor={`qr-email-${email}`} className="text-sm cursor-pointer">
                    {email}
                  </label>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="novo@email.com"
                value={novoEmail}
                onChange={(e) => setNovoEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAdicionarEmail();
                  }
                }}
              />
              <Button variant="outline" size="icon" onClick={handleAdicionarEmail}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <Button className="w-full" onClick={handleEnviar} disabled={enviando}>
            {enviando ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Enviar por e-mail
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
