import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEmpresa } from "@/contexts/EmpresaContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileDown } from "lucide-react";
import jsPDF from "jspdf";

interface PartRow { codigo: string; descricao: string; vezes: number; quantidade: number; orcamentos: number }

const USED_STATUS = ["aprovado", "finalizado"];

export function PartsUsedList() {
  const { empresaAtual } = useEmpresa();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlyUsed, setOnlyUsed] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!empresaAtual?.id) return;
    (async () => {
      setLoading(true);
      const all: any[] = [];
      for (let from = 0; ; from += 1000) {
        const { data } = await supabase
          .from("itens_orcamento")
          .select("codigo, descricao, quantidade, orcamento_id, orcamentos!inner(status, empresa_id)")
          .eq("empresa_id", empresaAtual.id)
          .eq("orcamentos.empresa_id", empresaAtual.id)
          .eq("tipo", "peca")
          .range(from, from + 999);
        all.push(...(data || []));
        if (!data || data.length < 1000) break;
      }
      setItems(all);
      setLoading(false);
    })();
  }, [empresaAtual?.id]);

  const rows = useMemo<PartRow[]>(() => {
    const map = new Map<string, PartRow & { set: Set<string> }>();
    items
      .filter((i) => !onlyUsed || USED_STATUS.includes(i.orcamentos?.status))
      .forEach((i) => {
        const desc = (i.descricao || "").trim();
        const cod = (i.codigo || "").trim();
        const key = `${cod.toUpperCase()}|${desc.toUpperCase().replace(/\s+/g, " ")}`;
        const r = map.get(key) || { codigo: cod, descricao: desc, vezes: 0, quantidade: 0, orcamentos: 0, set: new Set<string>() };
        r.vezes += 1;
        r.quantidade += Number(i.quantidade) || 0;
        r.set.add(i.orcamento_id);
        r.orcamentos = r.set.size;
        map.set(key, r);
      });
    const q = search.trim().toUpperCase();
    return Array.from(map.values())
      .map(({ set, ...r }) => r)
      .filter((r) => !q || r.descricao.toUpperCase().includes(q) || r.codigo.toUpperCase().includes(q))
      .sort((a, b) => b.quantidade - a.quantidade || a.descricao.localeCompare(b.descricao));
  }, [items, onlyUsed, search]);

  const repeated = rows.filter((r) => r.orcamentos > 1).length;
  const totalQty = rows.reduce((s, r) => s + r.quantidade, 0);

  const exportPdf = () => {
    const doc = new jsPDF();
    const w = doc.internal.pageSize.getWidth();
    let y = 18;
    doc.setFontSize(16); doc.setFont("helvetica", "bold");
    doc.text("MEC HYDRO - Parts Used", 14, y);
    doc.setFontSize(9); doc.setFont("helvetica", "normal");
    y += 6;
    doc.text(`${onlyUsed ? "Approved/finalized quotes" : "All quotes"} | Generated ${new Date().toLocaleDateString("en-US")}`, 14, y);
    y += 5;
    doc.text(`Distinct parts: ${rows.length} | Repeated parts: ${repeated} | Total qty: ${totalQty}`, 14, y);
    y += 8;
    const header = () => {
      doc.setFont("helvetica", "bold"); doc.setFontSize(9);
      doc.text("#", 14, y); doc.text("Code", 22, y); doc.text("Description", 50, y);
      doc.text("Quotes", w - 40, y, { align: "right" }); doc.text("Qty", w - 14, y, { align: "right" });
      y += 2; doc.line(14, y, w - 14, y); y += 5;
      doc.setFont("helvetica", "normal");
    };
    header();
    rows.forEach((r, i) => {
      const lines = doc.splitTextToSize(r.descricao || "-", w - 50 - 50);
      const h = lines.length * 4 + 2;
      if (y + h > 285) { doc.addPage(); y = 18; header(); }
      doc.text(String(i + 1), 14, y);
      doc.text(doc.splitTextToSize(r.codigo || "-", 26), 22, y);
      doc.text(lines, 50, y);
      doc.text(String(r.orcamentos), w - 40, y, { align: "right" });
      doc.text(String(r.quantidade), w - 14, y, { align: "right" });
      y += h;
    });
    doc.save("Parts Used - MEC HYDRO.pdf");
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between space-y-0">
        <CardTitle>Parts used ({rows.length} distinct, {repeated} repeated)</CardTitle>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={onlyUsed} onCheckedChange={setOnlyUsed} /> Only approved/finalized
          </label>
          <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-48" />
          <Button onClick={exportPdf} disabled={!rows.length} className="gap-2"><FileDown className="h-4 w-4" />Export PDF</Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Quotes</TableHead>
                <TableHead className="text-right">Total qty</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={i}>
                  <TableCell>{r.codigo || "-"}</TableCell>
                  <TableCell>{r.descricao}</TableCell>
                  <TableCell className="text-right">{r.orcamentos}</TableCell>
                  <TableCell className="text-right font-medium">{r.quantidade}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
