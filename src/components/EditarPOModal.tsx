import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FileText, Trash2, Upload } from "lucide-react";

const RE_ANEXO = /\n?[-\s]*Anexo do Pedido:\s*[^\n]*/;
const RE_NUM = /(Número do Pedido:\s*)[^\n]*/;

/** Replaces or removes the P.O. attachment line in an approved quote description. */
export function atualizarDescricaoPO(descricao: string, numero: string, anexoUrl: string | null) {
  let d = String(descricao || "").replace(RE_ANEXO, "");
  if (RE_NUM.test(d)) d = d.replace(RE_NUM, `$1${numero}`);
  if (anexoUrl) {
    d = RE_NUM.test(d)
      ? d.replace(/(Número do Pedido:[^\n]*)/, `$1\n- Anexo do Pedido: ${anexoUrl}`)
      : `${d.trim()}\n- Anexo do Pedido: ${anexoUrl}`;
  }
  return d.trim();
}

export function lerAnexoPO(descricao: string) {
  return String(descricao || "").match(/Anexo do Pedido:\s*(\S+)/)?.[1] || null;
}

export function EditarPOModal({ open, onOpenChange, orcamento, empresaId, language, onSaved }: {
  open: boolean; onOpenChange: (o: boolean) => void; orcamento: any; empresaId?: string; language: string; onSaved: () => void;
}) {
  const en = language === "en";
  const { toast } = useToast();
  const [numero, setNumero] = useState("");
  const [anexoAtual, setAnexoAtual] = useState<string | null>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!open || !orcamento) return;
    setNumero(orcamento.numero_pedido || "");
    setAnexoAtual(lerAnexoPO(orcamento.descricao));
    setArquivo(null);
  }, [open, orcamento]);

  const salvar = async () => {
    if (!orcamento || !empresaId) return;
    setSalvando(true);
    try {
      let url = anexoAtual;
      if (arquivo) {
        const path = `pedidos/${Date.now()}_${arquivo.name}`;
        const up = await supabase.storage.from("equipamentos").upload(path, arquivo);
        if (up.error) throw up.error;
        url = supabase.storage.from("equipamentos").getPublicUrl(path).data.publicUrl;
      }
      // Apply to every approved/finalized quote sharing the old P.O., so the combined PDF stays consistent.
      const antigo = String(orcamento.numero_pedido || "").trim();
      let alvos: any[] = [orcamento];
      if (antigo) {
        const { data, error } = await supabase.from("orcamentos").select("id, descricao, numero_pedido")
          .eq("empresa_id", empresaId).eq("numero_pedido", antigo).in("status", ["aprovado", "faturamento", "finalizado"]);
        if (error) throw error;
        alvos = data?.length ? data : alvos;
        if (!alvos.some(a => a.id === orcamento.id)) alvos.push(orcamento);
      }
      for (const a of alvos) {
        const { error } = await supabase.from("orcamentos").update({
          numero_pedido: numero.trim() || null,
          descricao: atualizarDescricaoPO(a.descricao, numero.trim(), url),
        }).eq("id", a.id).eq("empresa_id", empresaId);
        if (error) throw error;
      }
      toast({ title: en ? "P.O. updated" : "P.O. atualizado",
        description: alvos.length > 1 ? (en ? `Applied to ${alvos.length} quotes on this P.O.` : `Aplicado a ${alvos.length} orçamentos deste P.O.`) : undefined });
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: en ? "Could not update P.O." : "Erro ao atualizar P.O.", description: e?.message, variant: "destructive" });
    } finally { setSalvando(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{en ? "Edit P.O." : "Editar P.O."} — {orcamento?.numero}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{en ? "P.O. number" : "Número do pedido"}</Label>
            <Input value={numero} onChange={e => setNumero(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{en ? "P.O. file" : "Arquivo do P.O."}</Label>
            {arquivo ? (
              <div className="flex items-center justify-between rounded border p-2 text-sm">
                <span className="truncate">{arquivo.name}</span>
                <Button variant="ghost" size="sm" onClick={() => setArquivo(null)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ) : anexoAtual ? (
              <div className="flex items-center justify-between rounded border p-2 text-sm">
                <a href={anexoAtual} target="_blank" rel="noreferrer" className="flex items-center gap-2 truncate text-primary underline">
                  <FileText className="h-4 w-4" />{en ? "Current file" : "Arquivo atual"}
                </a>
                <Button variant="ghost" size="sm" onClick={() => setAnexoAtual(null)} title={en ? "Remove file" : "Remover arquivo"}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ) : <p className="text-sm text-muted-foreground">{en ? "No file attached" : "Nenhum arquivo"}</p>}
            <label className="flex cursor-pointer items-center gap-2 rounded border border-dashed p-3 text-sm text-muted-foreground hover:bg-muted">
              <Upload className="h-4 w-4" />{en ? "Upload new PDF (replaces current)" : "Enviar novo PDF (substitui o atual)"}
              <input type="file" accept="application/pdf" className="hidden" onChange={e => setArquivo(e.target.files?.[0] || null)} />
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{en ? "Cancel" : "Cancelar"}</Button>
          <Button onClick={salvar} disabled={salvando}>{salvando ? (en ? "Saving..." : "Salvando...") : (en ? "Save" : "Salvar")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
