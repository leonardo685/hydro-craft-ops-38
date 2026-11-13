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
import { commercialEmailType, emailQuoteLines, emailQuotePO, samePOEmailQuotes, type EmailQuote } from "@/lib/commercial-email";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orcamento: any | null;
  language: string;
  onSent?: (result: { ids: string[]; tipo: 'quote' | 'invoice'; sentAt: string }) => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function toBase64(buf: ArrayBuffer) {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

export function EnviarDocumentoEmailModal({ open, onOpenChange, orcamento, language, onSent }: Props) {
  const { toast } = useToast();
  const { clientes, adicionarEmail } = useClientes();
  const { empresaAtual } = useEmpresa();
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [listaAberta, setListaAberta] = useState(false);
  const [extras, setExtras] = useState<string[]>([]);
  const [novoEmail, setNovoEmail] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [relacionadas, setRelacionadas] = useState<EmailQuote[]>([]);
  const [invoiceIds, setInvoiceIds] = useState<string[]>([]);
  const [carregandoInvoices, setCarregandoInvoices] = useState(false);
  const [erroInvoices, setErroInvoices] = useState(false);
  const [mensagemEditada, setMensagemEditada] = useState(false);

  const tipoDocumento = commercialEmailType(orcamento?.status);
  const isInvoice = tipoDocumento === "invoice";
  const tipoLabel = isInvoice ? "Invoice" : "Quote";
  const nomeEmpresa = (empresaAtual?.razao_social || empresaAtual?.nome || "").toUpperCase();
  const incluirAssinatura = nomeEmpresa.includes("MEC HYDRO");
  const invoicesEnviadas = useMemo(() => orcamento ? [orcamento, ...relacionadas.filter(q => invoiceIds.includes(q.id))] : [], [orcamento, relacionadas, invoiceIds]);

  const mensagemPadrao = useMemo(() => {
    if (isInvoice && !incluirAssinatura) return "";
    const empresaNome = empresaAtual?.razao_social || empresaAtual?.nome || "MEC HYDRO";
    const linhas = [
      `Hello ${orcamento?.cliente_nome?.trim() || "there"},`,
      "",
      `Please find attached our ${invoicesEnviadas.length > 1 ? "Invoices" : tipoLabel}:`,
      ...emailQuoteLines(invoicesEnviadas),
      "",
      "If you have any questions, please let us know.",
      "",
      `Best regards,`,
      empresaNome,
    ];
    return linhas.join("\n");
  }, [isInvoice, incluirAssinatura, tipoLabel, invoicesEnviadas, orcamento?.cliente_nome, empresaAtual]);

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
    if (open) { setSelecionados([]); setListaAberta(false); setExtras([]); setNovoEmail(""); setInvoiceIds([]); setMensagemEditada(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, orcamento?.id]);

  useEffect(() => {
    if (open && !mensagemEditada) setMensagem(mensagemPadrao);
  }, [open, mensagemEditada, mensagemPadrao]);

  useEffect(() => {
    let active = true;
    setRelacionadas([]);
    setErroInvoices(false);
    setCarregandoInvoices(false);
    if (!open || !isInvoice || !incluirAssinatura || !empresaAtual?.id || !orcamento || !emailQuotePO(orcamento)) return;
    setCarregandoInvoices(true);
    const load = async () => {
      const all: EmailQuote[] = [];
      try {
        for (let start = 0; ; start += 1000) {
          const { data, error } = await supabase.from('orcamentos')
            .select('id, empresa_id, status, numero, numero_pedido, descricao, assunto_proposta, equipamento')
            .eq('empresa_id', empresaAtual.id).in('status', ['aprovado', 'faturamento', 'finalizado'])
            .order('id').range(start, start + 999);
          if (error) throw error;
          all.push(...(data || []));
          if ((data?.length || 0) < 1000) break;
        }
        if (active) setRelacionadas(samePOEmailQuotes(orcamento, all, empresaAtual.id));
      } catch {
        if (active) setErroInvoices(true);
      } finally {
        if (active) setCarregandoInvoices(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [open, orcamento, isInvoice, incluirAssinatura, empresaAtual?.id]);

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
    if (!orcamento || !tipoDocumento || !empresaAtual?.id) return;
    if (!selecionados.length) {
      toast({ title: "Selecione ao menos um e-mail", variant: "destructive" });
      return;
    }
    setEnviando(true);
    try {
      const { bytes, nome } = await gerarArquivoOrcamentoPorId(orcamento.id, empresaAtual, language,
        isInvoice && incluirAssinatura ? invoicesEnviadas.map(q => q.id) : undefined);
      const { data, error } = await supabase.functions.invoke("enviar-documento-orcamento", {
        body: {
          empresaId: empresaAtual.id,
          orcamentoIds: invoicesEnviadas.map(q => q.id),
          tipo: tipoDocumento,
          numero: invoicesEnviadas.map(q => q.numero).join(', '),
          clienteNome: orcamento.cliente_nome,
          empresaNome: empresaAtual?.razao_social || empresaAtual?.nome || "MEC HYDRO",
          assinatura: incluirAssinatura,
          emails: selecionados,
          mensagem,
          nomeArquivo: nome,
          pdfBase64: toBase64(bytes),
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.success !== true) throw new Error('O envio não foi confirmado.');
      if (data.trackingSaved && data.sentAt) {
        onSent?.({ ids: data.orcamentoIds, tipo: tipoDocumento, sentAt: data.sentAt });
      } else {
        toast({ title: 'E-mail enviado', description: 'Não foi possível salvar o indicador Sent. Não é necessário reenviar.' });
      }
      toast({ title: `${tipoLabel} enviado`, description: `Enviado para ${selecionados.length} destinatário(s)` });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Erro ao enviar e-mail", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setEnviando(false);
    }
  };

  if (!tipoDocumento) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" /> Enviar {tipoLabel} #{orcamento?.numero}
          </DialogTitle>
          <DialogDescription>{orcamento?.cliente_nome}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {carregandoInvoices && <Loader2 aria-label="Buscando invoices do mesmo P.O." className="h-4 w-4 animate-spin" />}
          {erroInvoices && <p role="alert" className="text-sm text-destructive">Não foi possível buscar invoices do mesmo P.O. Feche e abra novamente para tentar.</p>}
          {relacionadas.length > 0 && (
            <div className="space-y-2">
              <Label>Enviar juntas · P.O. {emailQuotePO(orcamento)}</Label>
              <p className="text-sm font-medium">Invoice #{orcamento.numero}</p>
              <div className="max-h-44 overflow-y-auto divide-y divide-border">
                {relacionadas.map(quote => (
                  <label key={quote.id} className="flex cursor-pointer items-start gap-2 py-2 text-sm">
                    <Checkbox checked={invoiceIds.includes(quote.id)} disabled={enviando}
                      aria-label={`Incluir Invoice ${quote.numero}`}
                      onCheckedChange={() => setInvoiceIds(ids => ids.includes(quote.id) ? ids.filter(id => id !== quote.id) : [...ids, quote.id])} />
                    <span className="min-w-0 break-words">Invoice #{quote.numero}<span className="block text-xs text-muted-foreground">{quote.assunto_proposta || quote.equipamento}</span></span>
                  </label>
                ))}
              </div>
            </div>
          )}
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
            <Textarea rows={6} value={mensagem} onChange={(e) => { setMensagemEditada(true); setMensagem(e.target.value); }} />
          </div>
          <Button className="w-full" onClick={enviar} disabled={enviando || carregandoInvoices || erroInvoices}>
            {enviando ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Enviar {invoicesEnviadas.length > 1 ? `${invoicesEnviadas.length} Invoices` : tipoLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
