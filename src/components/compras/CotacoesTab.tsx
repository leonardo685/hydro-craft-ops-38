import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, FileText, Eye, Download } from "lucide-react";
import { useEmpresa } from "@/contexts/EmpresaContext";
import { format } from "date-fns";
import { NovaCotacaoModal } from "./NovaCotacaoModal";
import { CompararCotacaoModal } from "./CompararCotacaoModal";
import jsPDF from "jspdf";
import { addLogoToPDF } from "@/lib/pdf-logo-utils";
import { toast } from "sonner";

interface CotacaoRow {
  id: string;
  numero: string;
  status: string;
  observacoes: string | null;
  prazo_resposta: string | null;
  created_at: string;
  total_itens: number;
  total_forns: number;
  total_respostas: number;
}

export function CotacoesTab() {
  const { empresaAtual } = useEmpresa();
  const [cotacoes, setCotacoes] = useState<CotacaoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [novaOpen, setNovaOpen] = useState(false);
  const [verId, setVerId] = useState<string | null>(null);

  const baixarPdf = async (cotacaoId: string) => {
    try {
      const [cRes, iRes, fRes] = await Promise.all([
        supabase.from("cotacoes").select("*").eq("id", cotacaoId).single(),
        supabase.from("cotacao_itens").select("*").eq("cotacao_id", cotacaoId).order("created_at"),
        supabase.from("cotacao_fornecedores").select("*").eq("cotacao_id", cotacaoId),
      ]);
      const cot = cRes.data;
      const itens = iRes.data || [];
      const forns = fRes.data || [];
      if (!cot) throw new Error("Cotação não encontrada");

      const fornIds = forns.map((f: any) => f.id);
      const { data: propostas } = await supabase
        .from("cotacao_propostas")
        .select("*")
        .in("cotacao_fornecedor_id", fornIds.length ? fornIds : ["00000000-0000-0000-0000-000000000000"]);

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      let y = 12;

      await addLogoToPDF(doc, empresaAtual?.logo_url, pageWidth - 50, 8, 35, 20);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(empresaAtual?.razao_social || empresaAtual?.nome || "Empresa", 14, y + 5);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      if (empresaAtual?.cnpj) doc.text(`CNPJ: ${empresaAtual.cnpj}`, 14, y + 11);
      doc.setDrawColor(220, 38, 38);
      doc.setLineWidth(0.8);
      doc.line(14, y + 18, pageWidth - 14, y + 18);
      y += 26;

      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(220, 38, 38);
      doc.text(`COTAÇÃO ${cot.numero}`, pageWidth / 2, y, { align: "center" });
      doc.setTextColor(0, 0, 0);
      y += 8;

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Criada em: ${format(new Date(cot.created_at), "dd/MM/yyyy")}`, 14, y);
      if (cot.prazo_resposta) {
        doc.text(`Prazo resposta: ${format(new Date(cot.prazo_resposta), "dd/MM/yyyy")}`, 80, y);
      }
      doc.text(`Status: ${cot.status}`, 160, y);
      y += 6;
      if (cot.observacoes) {
        const lines = doc.splitTextToSize(`Obs: ${cot.observacoes}`, pageWidth - 28);
        doc.text(lines, 14, y);
        y += lines.length * 4 + 2;
      }
      y += 4;

      // Itens
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setFillColor(128, 128, 128);
      doc.setTextColor(255, 255, 255);
      doc.rect(14, y, pageWidth - 28, 7, "F");
      doc.text("ITENS", pageWidth / 2, y + 5, { align: "center" });
      doc.setTextColor(0, 0, 0);
      y += 10;

      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("#", 14, y);
      doc.text("Descrição", 22, y);
      doc.text("Qtd", pageWidth - 50, y, { align: "right" });
      doc.text("Un.", pageWidth - 20, y, { align: "right" });
      y += 2;
      doc.setLineWidth(0.2);
      doc.line(14, y, pageWidth - 14, y);
      y += 4;
      doc.setFont("helvetica", "normal");
      itens.forEach((it: any, idx: number) => {
        if (y > pageHeight - 30) {
          doc.addPage();
          y = 20;
        }
        const desc = doc.splitTextToSize(it.descricao || "", pageWidth - 90);
        doc.text(String(idx + 1), 14, y);
        doc.text(desc, 22, y);
        doc.text(String(Number(it.quantidade)), pageWidth - 50, y, { align: "right" });
        doc.text(String(it.unidade || ""), pageWidth - 20, y, { align: "right" });
        y += Math.max(desc.length * 4, 5) + 2;
      });
      y += 4;

      // Fornecedores e propostas
      forns.forEach((f: any) => {
        if (y > pageHeight - 50) {
          doc.addPage();
          y = 20;
        }
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setFillColor(240, 240, 240);
        doc.rect(14, y, pageWidth - 28, 7, "F");
        doc.text(`Fornecedor: ${f.fornecedor_nome}`, 16, y + 5);
        doc.text(f.respondido_em ? "Respondida" : "Pendente", pageWidth - 16, y + 5, { align: "right" });
        y += 10;

        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.text("Item", 16, y);
        doc.text("Preço Unit.", 110, y, { align: "right" });
        doc.text("Prazo", 140, y, { align: "right" });
        doc.text("Total", pageWidth - 16, y, { align: "right" });
        y += 2;
        doc.line(14, y, pageWidth - 14, y);
        y += 4;
        doc.setFont("helvetica", "normal");

        let totalForn = 0;
        itens.forEach((it: any) => {
          const p = (propostas || []).find(
            (x: any) => x.cotacao_fornecedor_id === f.id && x.cotacao_item_id === it.id
          );
          if (y > pageHeight - 20) {
            doc.addPage();
            y = 20;
          }
          const desc = doc.splitTextToSize(it.descricao || "", 85);
          doc.text(desc, 16, y);
          const preco = p?.preco_unitario != null ? Number(p.preco_unitario) : null;
          const total = preco != null ? preco * Number(it.quantidade) : null;
          if (total != null) totalForn += total;
          doc.text(preco != null ? `R$ ${preco.toFixed(2)}` : "—", 110, y, { align: "right" });
          doc.text(p?.prazo_entrega_dias != null ? `${p.prazo_entrega_dias}d` : "—", 140, y, { align: "right" });
          doc.text(total != null ? `R$ ${total.toFixed(2)}` : "—", pageWidth - 16, y, { align: "right" });
          y += Math.max(desc.length * 4, 5) + 1;
        });
        doc.setFont("helvetica", "bold");
        doc.line(14, y, pageWidth - 14, y);
        y += 4;
        doc.text(`Total: R$ ${totalForn.toFixed(2)}`, pageWidth - 16, y, { align: "right" });
        y += 6;
        if (f.observacao_resposta) {
          doc.setFont("helvetica", "italic");
          const obs = doc.splitTextToSize(`Obs: ${f.observacao_resposta}`, pageWidth - 28);
          doc.text(obs, 14, y);
          y += obs.length * 4 + 2;
        }
        y += 4;
      });

      const total = doc.getNumberOfPages();
      for (let i = 1; i <= total; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(`Página ${i} de ${total}`, 14, pageHeight - 8);
        doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, pageWidth - 14, pageHeight - 8, { align: "right" });
      }

      doc.save(`cotacao_${cot.numero}.pdf`);
    } catch (e: any) {
      toast.error("Erro ao gerar PDF: " + e.message);
    }
  };

  const carregar = async () => {
    if (!empresaAtual?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from("cotacoes")
      .select(`
        id, numero, status, observacoes, prazo_resposta, created_at,
        cotacao_itens(count),
        cotacao_fornecedores(id, respondido_em)
      `)
      .eq("empresa_id", empresaAtual.id)
      .order("created_at", { ascending: false });
    const rows: CotacaoRow[] = ((data as any[]) || []).map((c) => ({
      id: c.id,
      numero: c.numero,
      status: c.status,
      observacoes: c.observacoes,
      prazo_resposta: c.prazo_resposta,
      created_at: c.created_at,
      total_itens: c.cotacao_itens?.[0]?.count ?? 0,
      total_forns: (c.cotacao_fornecedores || []).length,
      total_respostas: (c.cotacao_fornecedores || []).filter((f: any) => f.respondido_em).length,
    }));
    setCotacoes(rows);
    setLoading(false);
  };

  useEffect(() => {
    carregar();
  }, [empresaAtual?.id]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Cotações (RFQ)</h2>
          <p className="text-sm text-muted-foreground">
            Solicite preços a múltiplos fornecedores e compare lado a lado.
          </p>
        </div>
        <Button onClick={() => setNovaOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Nova cotação
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="text-center py-12 text-muted-foreground">Carregando...</p>
          ) : cotacoes.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">Nenhuma cotação ainda.</p>
              <Button variant="link" onClick={() => setNovaOpen(true)}>
                Criar primeira cotação
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Criada em</TableHead>
                  <TableHead>Prazo resposta</TableHead>
                  <TableHead className="text-center">Itens</TableHead>
                  <TableHead className="text-center">Respostas</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cotacoes.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.numero}</TableCell>
                    <TableCell>{format(new Date(c.created_at), "dd/MM/yyyy")}</TableCell>
                    <TableCell>{c.prazo_resposta ? format(new Date(c.prazo_resposta), "dd/MM/yyyy") : "—"}</TableCell>
                    <TableCell className="text-center">{c.total_itens}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={c.total_respostas === c.total_forns ? "default" : "secondary"}>
                        {c.total_respostas}/{c.total_forns}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={c.status === "finalizada" ? "default" : "outline"}>{c.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => setVerId(c.id)}>
                          <Eye className="h-4 w-4 mr-1" /> Comparar
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => baixarPdf(c.id)}>
                          <Download className="h-4 w-4 mr-1" /> PDF
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <NovaCotacaoModal open={novaOpen} onOpenChange={setNovaOpen} onCreated={carregar} />
      <CompararCotacaoModal cotacaoId={verId} open={!!verId} onOpenChange={(v) => !v && setVerId(null)} />
    </div>
  );
}
