import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Plus, Send, Loader2, ChevronDown, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useClientes } from "@/hooks/use-clientes";
import { useEmpresa } from "@/contexts/EmpresaContext";
import { supabase } from "@/integrations/supabase/client";
import { gerarArquivoOrcamentoPorId } from "@/lib/orcamento-modern-pdf";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orcamento: any | null;
  language: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function toBase64(buf: ArrayBuffer) {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

export function EnviarDocumentoEmailModal({ open, onOpenChange, orcamento, language }: Props) {
  const { toast } = useToast();
  const { clientes, adicionarEmail } = useClientes();
  const { empresaAtual } = useEmpresa();
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [listaAberta, setListaAberta] = useState(false);
  const [extras, setExtras] = useState<string[]>([]);
  const [novoEmail, setNovoEmail] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);

  const isInvoice = ["aprovado", "faturamento", "finalizado"].includes(orcamento?.status);
  const tipoLabel = isInvoice ? "Invoice" : "Quote";

  const cliente = useMemo(
    () => clientes.find((c: any) => (orcamento?.cliente_id && c.id === orcamento.cliente_id) || c.nome === orcamento?.cliente_nome) || null,
    [clientes, orcamento]
  );
  const cadastrados = useMemo(() => {
    const l: string[] = [];
    if (cliente?.email) l.push(cliente.email);
    if (cliente?.emails_adicionais) l.push(...(cliente.emails_adicionais as string[]));
    return [...new Set(l.filter(Boolean))];
  }, [cliente]);
  const todos = [...new Set([...cadastrados, ...extras])];

  useEffect(() => {
    if (open) { setSelecionados([]); setListaAberta(false); setExtras([]); setNovoEmail(""); setMensagem(""); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, orcamento?.id]);

  const toggle = (e: string) => setSelecionados((p) => (p.includes(e) ? p.filter((x) => x !== e) : [...p, e]));

  const adicionar = async () => {
    const email = novoEmail.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) {
      toast({ title: "E-mail inválido", variant: "destructive" });
      return;
    }
    if (cliente && !cadastrados.includes(email)) {
      try { await adicionarEmail(cliente.id, email); } catch { /* toast no hook */ }
    }
    setExtras((p) => [...new Set([...p, email])]);
    setSelecionados((p) => [...new Set([...p, email])]);
    setNovoEmail("");
  };

  const enviar = async () => {
    if (!orcamento) return;
    if (!selecionados.length) {
      toast({ title: "Selecione ao menos um e-mail", variant: "destructive" });
      return;
    }
    setEnviando(true);
    try {
      const { bytes, nome } = await gerarArquivoOrcamentoPorId(orcamento.id, empresaAtual, language);
      const { data, error } = await supabase.functions.invoke("enviar-documento-orcamento", {
        body: {
          tipo: isInvoice ? "invoice" : "quote",
          numero: orcamento.numero,
          clienteNome: orcamento.cliente_nome,
          empresaNome: empresaAtual?.razao_social || empresaAtual?.nome || "MEC HYDRO",
          emails: selecionados,
          mensagem,
          nomeArquivo: nome,
          pdfBase64: toBase64(bytes),
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: `${tipoLabel} enviado`, description: `Enviado para ${selecionados.length} destinatário(s)` });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Erro ao enviar e-mail", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" /> Enviar {tipoLabel} #{orcamento?.numero}
          </DialogTitle>
          <DialogDescription>{orcamento?.cliente_nome}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>E-mails</Label>
            {todos.length === 0 && <p className="text-sm text-muted-foreground">Nenhum e-mail cadastrado para este cliente.</p>}
            {selecionados.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selecionados.map((e) => (
                  <span key={e} className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs">
                    {e}
                    <button type="button" aria-label={`Remover ${e}`} onClick={() => toggle(e)} className="rounded-full hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {todos.length > 0 && (
              <div className="relative">
                <Button type="button" variant="outline" size="sm" className="w-full justify-between" onClick={() => setListaAberta((v) => !v)}>
                  <span className="text-muted-foreground">{listaAberta ? "Fechar lista" : "Selecionar e-mails"}</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${listaAberta ? "rotate-180" : ""}`} />
                </Button>
                {listaAberta && (
                  <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
                    {todos.map((e) => (
                      <label key={e} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent">
                        <Checkbox checked={selecionados.includes(e)} onCheckedChange={() => toggle(e)} />
                        {e}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="Novo e-mail"
              value={novoEmail}
              onChange={(e) => setNovoEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); adicionar(); } }}
            />
            <Button type="button" variant="outline" onClick={adicionar}><Plus className="h-4 w-4" /></Button>
          </div>
          <div className="space-y-2">
            <Label>Mensagem (opcional)</Label>
            <Textarea rows={3} value={mensagem} onChange={(e) => setMensagem(e.target.value)} />
          </div>
          <Button className="w-full" onClick={enviar} disabled={enviando}>
            {enviando ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Enviar {tipoLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
