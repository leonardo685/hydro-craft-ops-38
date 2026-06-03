import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";

export default function CotacaoPublica() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [forn, setForn] = useState<any>(null);
  const [cotacao, setCotacao] = useState<any>(null);
  const [itens, setItens] = useState<any[]>([]);
  const [propostas, setPropostas] = useState<Record<string, { preco: string; prazo: string; obs: string }>>({});
  const [obsGeral, setObsGeral] = useState("");
  const [empresa, setEmpresa] = useState<any>(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      setLoading(true);
      try {
        const { data: f } = await supabase
          .from("cotacao_fornecedores")
          .select("*")
          .eq("token_publico", token)
          .maybeSingle();
        if (!f) {
          setLoading(false);
          return;
        }
        setForn(f);
        setObsGeral(f.observacao_resposta || "");

        const [c, i, p] = await Promise.all([
          supabase.from("cotacoes").select("*").eq("id", f.cotacao_id).single(),
          supabase.from("cotacao_itens").select("*").eq("cotacao_id", f.cotacao_id).order("created_at"),
          supabase.from("cotacao_propostas").select("*").eq("cotacao_fornecedor_id", f.id),
        ]);
        setCotacao(c.data);
        setItens(i.data || []);

        // se cotacao tem empresa_id, buscar info pública
        if (c.data?.empresa_id) {
          const { data: emp } = await supabase.rpc("get_empresa_public_info", { p_empresa_id: c.data.empresa_id });
          setEmpresa(Array.isArray(emp) ? emp[0] : emp);
        }

        const map: Record<string, any> = {};
        (p.data || []).forEach((pr: any) => {
          map[pr.cotacao_item_id] = {
            preco: pr.preco_unitario != null ? String(pr.preco_unitario) : "",
            prazo: pr.prazo_entrega_dias != null ? String(pr.prazo_entrega_dias) : "",
            obs: pr.observacao || "",
          };
        });
        setPropostas(map);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const setProp = (itemId: string, k: "preco" | "prazo" | "obs", v: string) => {
    setPropostas((prev) => ({
      ...prev,
      [itemId]: { preco: "", prazo: "", obs: "", ...prev[itemId], [k]: v },
    }));
  };

  const handleEnviar = async () => {
    if (!forn) return;
    setSaving(true);
    try {
      // upsert manual por (forn_id, item_id)
      const rows = itens
        .map((it) => {
          const p = propostas[it.id];
          if (!p || (!p.preco && !p.prazo && !p.obs)) return null;
          return {
            cotacao_fornecedor_id: forn.id,
            cotacao_item_id: it.id,
            preco_unitario: p.preco ? Number(p.preco.replace(",", ".")) : null,
            prazo_entrega_dias: p.prazo ? parseInt(p.prazo) : null,
            observacao: p.obs || null,
          };
        })
        .filter(Boolean) as any[];

      if (rows.length === 0) {
        toast.error("Preencha pelo menos um item");
        setSaving(false);
        return;
      }

      const { error } = await supabase
        .from("cotacao_propostas")
        .upsert(rows, { onConflict: "cotacao_fornecedor_id,cotacao_item_id" });
      if (error) throw error;

      await supabase
        .from("cotacao_fornecedores")
        .update({
          respondido_em: new Date().toISOString(),
          observacao_resposta: obsGeral || null,
        })
        .eq("id", forn.id);

      toast.success("Proposta enviada com sucesso!");
      setForn({ ...forn, respondido_em: new Date().toISOString() });
    } catch (e: any) {
      toast.error("Erro ao enviar: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-10 w-10 border-b-2 border-primary rounded-full" />
      </div>
    );
  }

  if (!forn || !cotacao) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="text-center py-12">
            <p className="text-lg font-semibold mb-2">Link inválido</p>
            <p className="text-sm text-muted-foreground">Esta cotação não existe ou expirou.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-4">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle>Cotação {cotacao.numero}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {empresa?.razao_social || empresa?.nome || "Solicitação de cotação"}
                </p>
              </div>
              {forn.respondido_em && (
                <Badge variant="default" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Já respondida
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <span className="text-muted-foreground">Fornecedor: </span>
              <span className="font-medium">{forn.fornecedor_nome}</span>
            </div>
            {cotacao.observacoes && (
              <div>
                <span className="text-muted-foreground">Observações: </span>
                {cotacao.observacoes}
              </div>
            )}
            <div className="text-xs text-muted-foreground">
              Condição de pagamento esperada: {forn.prazo_pagamento_dias || 28} dias
              {cotacao.prazo_resposta && ` · Responder até ${new Date(cotacao.prazo_resposta).toLocaleDateString("pt-BR")}`}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Itens — informe seu preço</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="w-20 text-right">Qtd</TableHead>
                  <TableHead className="w-32">Preço unitário</TableHead>
                  <TableHead className="w-28">Prazo (dias)</TableHead>
                  <TableHead>Obs.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itens.map((it) => (
                  <TableRow key={it.id}>
                    <TableCell className="font-medium">{it.descricao}</TableCell>
                    <TableCell className="text-right">
                      {Number(it.quantidade)} {it.unidade}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0,00"
                        value={propostas[it.id]?.preco || ""}
                        onChange={(e) => setProp(it.id, "preco", e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        placeholder="0"
                        value={propostas[it.id]?.prazo || ""}
                        onChange={(e) => setProp(it.id, "prazo", e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        placeholder="opcional"
                        value={propostas[it.id]?.obs || ""}
                        onChange={(e) => setProp(it.id, "obs", e.target.value)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <Label>Observações gerais (validade da proposta, frete, etc.)</Label>
              <Textarea
                value={obsGeral}
                onChange={(e) => setObsGeral(e.target.value)}
                rows={3}
                placeholder="Ex: proposta válida por 15 dias, frete CIF, etc."
              />
            </div>
            <Button onClick={handleEnviar} disabled={saving} className="w-full" size="lg">
              {saving ? "Enviando..." : forn.respondido_em ? "Atualizar proposta" : "Enviar proposta"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}