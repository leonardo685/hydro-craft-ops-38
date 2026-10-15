import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Html5Qrcode } from "html5-qrcode";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search, FileCheck2, FileText, Wrench, Camera, ArrowLeft, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEmpresa } from "@/contexts/EmpresaContext";

interface ScanQRCodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type OrdemInfo = {
  numero: string;
  ordemId: string | null;
  cliente?: string;
  equipamento?: string;
  temLaudo: boolean;
  orcamentoId: string | null;
  documentoEntrega?: string | null;
};

const SCANNER_ID = "qr-internal-scanner-region";

const normalizarNumero = (raw: string): string => {
  const t = raw.trim().toUpperCase();
  const m = t.match(/MH-?(\d+)-(\d{2})/i);
  if (m) return `MH-${m[1].replace(/^0+(?=\d{3})/, "").padStart(3, "0")}-${m[2]}`;
  const d = t.match(/^(\d+)$/);
  if (d) {
    const ano = String(new Date().getFullYear()).slice(-2);
    return `MH-${d[1].replace(/^0+(?=\d{3})/, "").padStart(3, "0")}-${ano}`;
  }
  return t;
};

export function ScanQRCodeModal({ open, onOpenChange }: ScanQRCodeModalProps) {
  const navigate = useNavigate();
  const { empresaAtual } = useEmpresa();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const handlingRef = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [manual, setManual] = useState("");
  const [info, setInfo] = useState<OrdemInfo | null>(null);

  useEffect(() => {
    if (!open) {
      setInfo(null);
      setManual("");
    }
  }, [open]);

  useEffect(() => {
    if (!open || info) return;
    let cancelled = false;
    const start = async () => {
      try {
        await new Promise((r) => setTimeout(r, 50));
        if (cancelled) return;
        const instance = new Html5Qrcode(SCANNER_ID);
        scannerRef.current = instance;
        await instance.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          async (decoded) => {
            if (handlingRef.current) return;
            handlingRef.current = true;
            await buscar(decoded);
            handlingRef.current = false;
          },
          () => {}
        );
        if (cancelled) await instance.stop().catch(() => {});
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
          try { inst.clear(); } catch { /* noop */ }
          scannerRef.current = null;
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, info]);

  const buscar = async (raw: string) => {
    const numero = normalizarNumero(raw);
    if (!numero || !empresaAtual?.id) return;
    setLoading(true);
    try {
      const { data: ordens } = await supabase
        .from("ordens_servico")
        .select("id, cliente_nome, equipamento, orcamento_id, documento_entrega_url")
        .eq("empresa_id", empresaAtual.id)
        .eq("numero_ordem", numero)
        .limit(1);
      const ordem: any = ordens?.[0];

      let temLaudo = false;
      if (ordem) {
        const { data: testes } = await supabase
          .from("testes_equipamentos")
          .select("id")
          .eq("empresa_id", empresaAtual.id)
          .eq("ordem_servico_id", ordem.id)
          .limit(1);
        temLaudo = !!testes?.length;
      }

      let orcamentoId: string | null = ordem?.orcamento_id || null;
      if (!orcamentoId) {
        const { data: orcs } = await supabase
          .from("orcamentos")
          .select("id")
          .eq("empresa_id", empresaAtual.id)
          .eq("ordem_referencia", numero)
          .order("created_at", { ascending: false })
          .limit(1);
        orcamentoId = orcs?.[0]?.id || null;
      }

      if (!ordem && !orcamentoId) {
        toast.error(`Ordem ${numero} não encontrada`);
        return;
      }

      setInfo({
        numero,
        ordemId: ordem?.id || null,
        cliente: ordem?.cliente_nome,
        equipamento: ordem?.equipamento,
        temLaudo,
        orcamentoId,
        documentoEntrega: ordem?.documento_entrega_url,
      });
    } catch (err) {
      console.error(err);
      toast.error("Erro ao buscar ordem");
    } finally {
      setLoading(false);
    }
  };

  const ir = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  const abrirLaudo = () => {
    if (!info?.temLaudo) return toast.error("Laudo indisponível");
    window.open(`/laudo-publico/${info.numero}`, "_blank");
  };
  const abrirOrcamento = () => {
    if (!info?.orcamentoId) return toast.error("Orçamento indisponível");
    ir(`/orcamentos/novo?editId=${info.orcamentoId}`);
  };
  const abrirOS = () => {
    if (!info?.ordemId) return toast.error("Ordem de serviço indisponível");
    ir(`/visualizar-ordem-servico/${info.ordemId}`);
  };

  const enviarDocumento = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !info?.ordemId || !empresaAtual?.id) return;
    if (file.size > 20 * 1024 * 1024) return toast.error("Arquivo muito grande (máx. 20MB)");
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `documentos-entrega/${info.numero}_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("equipamentos").upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("equipamentos").getPublicUrl(path);
      const { error } = await supabase
        .from("ordens_servico")
        .update({ documento_entrega_url: urlData.publicUrl, data_documento_entrega: new Date().toISOString() } as any)
        .eq("id", info.ordemId)
        .eq("empresa_id", empresaAtual.id);
      if (error) throw error;
      await supabase.from("documentos_ordem").insert({
        ordem_servico_id: info.ordemId,
        empresa_id: empresaAtual.id,
        arquivo_url: urlData.publicUrl,
        nome_arquivo: `Documento de entrega assinado - ${info.numero}.${ext}`,
        tipo_arquivo: file.type || "image/jpeg",
        tamanho_bytes: file.size,
      });
      setInfo({ ...info, documentoEntrega: urlData.publicUrl });
      toast.success("Documento de entrega salvo na ordem");
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao salvar documento: " + (err?.message || ""));
    } finally {
      setUploading(false);
    }
  };

  const Opcao = ({ icon: Icon, titulo, sub, onClick, disponivel = true }: any) => (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 w-full rounded-lg border p-4 text-left transition-colors hover:bg-secondary ${disponivel ? "" : "opacity-60"}`}
    >
      <Icon className="w-6 h-6 text-primary shrink-0" />
      <div className="min-w-0">
        <p className="font-medium text-foreground">{titulo}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div>
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{info ? `Ordem ${info.numero}` : "Ler QR Code do equipamento"}</DialogTitle>
          <DialogDescription>
            {info
              ? [info.cliente, info.equipamento].filter(Boolean).join(" • ") || "Escolha o que deseja abrir"
              : "Aponte a câmera para o QR Code ou digite o número da ordem."}
          </DialogDescription>
        </DialogHeader>

        {info ? (
          <div className="space-y-3">
            <Opcao icon={FileCheck2} titulo="Laudo de teste" sub={info.temLaudo ? "Abrir laudo" : "Laudo indisponível"} disponivel={info.temLaudo} onClick={abrirLaudo} />
            <Opcao icon={FileText} titulo="Orçamento" sub={info.orcamentoId ? "Abrir orçamento" : "Orçamento indisponível"} disponivel={!!info.orcamentoId} onClick={abrirOrcamento} />
            <Opcao icon={Wrench} titulo="Ordem de serviço" sub={info.ordemId ? "Abrir ordem de serviço" : "Ordem de serviço indisponível"} disponivel={!!info.ordemId} onClick={abrirOS} />
            <Opcao
              icon={uploading ? Loader2 : Camera}
              titulo="Escanear documento de entrega"
              sub={uploading ? "Enviando..." : info.documentoEntrega ? "Já enviado — toque para substituir" : "Foto do invoice ou nota fiscal assinada"}
              disponivel={!!info.ordemId}
              onClick={() => {
                if (!info.ordemId) return toast.error("Ordem de serviço indisponível");
                if (!uploading) fileRef.current?.click();
              }}
            />
            {info.documentoEntrega && (
              <a href={info.documentoEntrega} target="_blank" rel="noreferrer" className="block text-center text-sm text-primary underline">
                Ver documento de entrega enviado
              </a>
            )}
            <input ref={fileRef} type="file" accept="image/*,application/pdf" capture="environment" className="hidden" onChange={enviarDocumento} />
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setInfo(null)}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Ler outro
              </Button>
              <Button variant="ghost" className="flex-1" onClick={() => ir(`/processo-interno/${info.numero}`)}>
                <Activity className="w-4 h-4 mr-1" /> Histórico
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div id={SCANNER_ID} className="w-full overflow-hidden rounded-lg border bg-muted aspect-square" />
            {loading && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Buscando...
              </div>
            )}
            <form onSubmit={(e) => { e.preventDefault(); if (manual.trim()) buscar(manual); }} className="flex gap-2">
              <Input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="Ex: MH-001-25" disabled={loading} />
              <Button type="submit" size="icon" disabled={loading || !manual.trim()}>
                <Search className="w-4 h-4" />
              </Button>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
