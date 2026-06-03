import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, FileText, Eye } from "lucide-react";
import { useEmpresa } from "@/contexts/EmpresaContext";
import { format } from "date-fns";
import { NovaCotacaoModal } from "./NovaCotacaoModal";
import { CompararCotacaoModal } from "./CompararCotacaoModal";

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
                      <Button size="sm" variant="outline" onClick={() => setVerId(c.id)}>
                        <Eye className="h-4 w-4 mr-1" /> Comparar
                      </Button>
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
