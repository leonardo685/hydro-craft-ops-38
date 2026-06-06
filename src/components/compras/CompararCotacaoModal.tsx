import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Link2, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Props {
  cotacaoId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function CompararCotacaoModal({ cotacaoId, open, onOpenChange }: Props) {
  const [cotacao, setCotacao] = useState<any>(null);
  const [itens, setItens] = useState<any[]>([]);
  const [forns, setForns] = useState<any[]>([]);
  const [propostas, setPropostas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const carregar = async () => {
    if (!cotacaoId) return;
    setLoading(true);
    try {
      const [c, i, f] = await Promise.all([
        supabase.from("cotacoes").select("*").eq("id", cotacaoId).single(),
        supabase.from("cotacao_itens").select("*").eq("cotacao_id", cotacaoId).order("created_at"),
        supabase.from("cotacao_fornecedores").select("*").eq("cotacao_id", cotacaoId).order("fornecedor_nome"),
      ]);
      setCotacao(c.data);
      setItens(i.data || []);
      setForns(f.data || []);
      const fornIds = (f.data || []).map((x: any) => x.id);
      if (fornIds.length) {
        const { data: p } = await supabase
          .from("cotacao_propostas")
          .select("*")
          .in("cotacao_fornecedor_id", fornIds);
        setPropostas(p || []);
      } else setPropostas([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) carregar();
  }, [open, cotacaoId]);

  const proposta = (fornId: string, itemId: string) =>
    propostas.find((p) => p.cotacao_fornecedor_id === fornId && p.cotacao_item_id === itemId);

  const salvarPreco = async (fornId: string, itemId: string, valor: string) => {
    const existente = proposta(fornId, itemId);
    const num = valor === "" ? null : Number(valor.replace(",", "."));
    if (existente && Number(existente.preco_unitario ?? NaN) === Number(num)) return;
    try {
      const row = {
        cotacao_fornecedor_id: fornId,
        cotacao_item_id: itemId,
        preco_unitario: num,
        prazo_entrega_dias: existente?.prazo_entrega_dias ?? null,
        observacao: existente?.observacao ?? null,
      };
      const { error } = await supabase
        .from("cotacao_propostas")
        .upsert(row, { onConflict: "cotacao_fornecedor_id,cotacao_item_id" });
      if (error) throw error;
      // marca fornecedor como respondido (manual)
      const f = forns.find((x) => x.id === fornId);
      if (f && !f.respondido_em) {
        await supabase
          .from("cotacao_fornecedores")
          .update({ respondido_em: new Date().toISOString() })
          .eq("id", fornId);
      }
      toast.success("Preço salvo");
      carregar();
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    }
  };

  const melhorPrecoItem = (itemId: string) => {
    const precos = propostas
      .filter((p) => p.cotacao_item_id === itemId && p.preco_unitario != null)
      .map((p) => Number(p.preco_unitario));
    return precos.length ? Math.min(...precos) : null;
  };

  const totalForn = (fornId: string) =>
    propostas
      .filter((p) => p.cotacao_fornecedor_id === fornId)
      .reduce((acc, p) => {
        const item = itens.find((i) => i.id === p.cotacao_item_id);
        if (!item || p.preco_unitario == null) return acc;
        return acc + Number(p.preco_unitario) * Number(item.quantidade);
      }, 0);

  const copiarLink = (token: string) => {
    const url = `${window.location.origin}/cotacao/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado");
  };

  const fmt = (n: number) =>
    n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  if (!cotacao) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <p className="text-center py-12 text-muted-foreground">{loading ? "Carregando..." : "Sem dados"}</p>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            Cotação {cotacao.numero}
            <Badge variant={cotacao.status === "finalizada" ? "default" : "secondary"}>{cotacao.status}</Badge>
          </DialogTitle>
          {cotacao.observacoes && (
            <p className="text-sm text-muted-foreground">{cotacao.observacoes}</p>
          )}
        </DialogHeader>

        <ScrollArea className="flex-1 pr-2">
          <div className="space-y-6">
            {/* Status fornecedores */}
            <div>
              <h3 className="text-sm font-semibold mb-2">Fornecedores convidados</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {forns.map((f) => (
                  <div key={f.id} className="border rounded-md p-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{f.fornecedor_nome}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                        {f.respondido_em ? (
                          <span className="text-green-600 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Respondeu em {format(new Date(f.respondido_em), "dd/MM HH:mm")}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Aguardando
                          </span>
                        )}
                        · {f.prazo_pagamento_dias || 28}ddl
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => copiarLink(f.token_publico)}>
                      <Link2 className="h-3 w-3 mr-1" /> Link
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Comparativo */}
            <div>
              <h3 className="text-sm font-semibold mb-2">Comparativo (preço unitário)</h3>
              <div className="border rounded-md overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px]">Item</TableHead>
                      <TableHead className="text-right">Qtd</TableHead>
                      {forns.map((f) => (
                        <TableHead key={f.id} className="text-right min-w-[120px]">
                          {f.fornecedor_nome}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itens.map((it) => {
                      const melhor = melhorPrecoItem(it.id);
                      return (
                        <TableRow key={it.id}>
                          <TableCell className="font-medium">{it.descricao}</TableCell>
                          <TableCell className="text-right">
                            {Number(it.quantidade)} {it.unidade}
                          </TableCell>
                          {forns.map((f) => {
                            const p = proposta(f.id, it.id);
                            const valorAtual = p?.preco_unitario != null ? String(p.preco_unitario) : "";
                            const isBest =
                              melhor != null && p?.preco_unitario != null && Number(p.preco_unitario) === melhor;
                            return (
                              <TableCell
                                key={f.id}
                                className={isBest ? "bg-green-50 dark:bg-green-950/30" : ""}
                              >
                                <Input
                                  type="number"
                                  step="0.01"
                                  defaultValue={valorAtual}
                                  placeholder="0,00"
                                  className={`h-8 text-right ${isBest ? "font-semibold" : ""}`}
                                  onBlur={(e) => salvarPreco(f.id, it.id, e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                                  }}
                                />
                                {p?.preco_unitario != null && (
                                  <div className="text-xs text-right text-muted-foreground mt-1">
                                    {fmt(Number(p.preco_unitario))}
                                  </div>
                                )}
                                {p?.prazo_entrega_dias != null && (
                                  <div className="text-xs text-muted-foreground">
                                    {p.prazo_entrega_dias}d entrega
                                  </div>
                                )}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      );
                    })}
                    <TableRow className="bg-muted/40">
                      <TableCell className="font-semibold" colSpan={2}>
                        Total
                      </TableCell>
                      {forns.map((f) => {
                        const t = totalForn(f.id);
                        return (
                          <TableCell key={f.id} className="text-right font-semibold">
                            {t > 0 ? fmt(t) : "—"}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}