import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Link2, CheckCircle2, Clock, Wrench, Trophy, Plus, Trash2, RefreshCw } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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

  const salvarTotal = async (fornId: string, itemId: string, totalStr: string) => {
    const item = itens.find((i) => i.id === itemId);
    if (!item) return;
    const qtd = Number(item.quantidade) || 0;
    if (qtd <= 0) return;
    const total = totalStr === "" ? null : Number(totalStr.replace(",", "."));
    const unit = total == null ? null : Number((total / qtd).toFixed(4));
    await salvarPreco(fornId, itemId, unit == null ? "" : String(unit));
  };

  const definirVencedor = async (fornId: string) => {
    try {
      const { error } = await supabase
        .from("cotacoes")
        .update({ vencedor_fornecedor_id: fornId === "__none__" ? null : fornId })
        .eq("id", cotacaoId!);
      if (error) throw error;
      toast.success("Vencedor atualizado");
      carregar();
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    }
  };

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

  const totalFornEfetivo = (fornId: string) => {
    const f = forns.find((x) => x.id === fornId);
    const manual = f?.valor_total_manual != null ? Number(f.valor_total_manual) : 0;
    if (manual > 0) return manual;
    return totalForn(fornId);
  };

  const salvarTotalManual = async (fornId: string, valor: string) => {
    const num = valor === "" ? null : Number(valor.replace(",", "."));
    try {
      const { error } = await supabase
        .from("cotacao_fornecedores")
        .update({
          valor_total_manual: num,
          respondido_em: new Date().toISOString(),
        })
        .eq("id", fornId);
      if (error) throw error;
      toast.success("Total salvo");
      carregar();
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    }
  };

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
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col p-0">
        <div className="px-6 pt-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            Cotação {cotacao.numero}
            <Badge variant={cotacao.status === "finalizada" ? "default" : "secondary"}>{cotacao.status}</Badge>
          </DialogTitle>
          {cotacao.observacoes && (
            <p className="text-sm text-muted-foreground">{cotacao.observacoes}</p>
          )}
        </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <div className="space-y-6 pt-4">
            {/* Status fornecedores */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold">Fornecedores convidados</h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Trophy className="h-3 w-3" /> Vencedor:
                  </span>
                  <Select
                    value={cotacao.vencedor_fornecedor_id || "__none__"}
                    onValueChange={definirVencedor}
                  >
                    <SelectTrigger className="h-8 w-[220px]">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— Nenhum —</SelectItem>
                      {forns.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.fornecedor_nome}
                          {totalFornEfetivo(f.id) > 0 ? ` · ${fmt(totalFornEfetivo(f.id))}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {forns.map((f) => (
                  <div
                    key={f.id}
                    className={`border rounded-md p-3 flex items-center justify-between gap-2 ${
                      cotacao.vencedor_fornecedor_id === f.id ? "border-green-500 bg-green-50 dark:bg-green-950/30" : ""
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate flex items-center gap-1">
                        {cotacao.vencedor_fornecedor_id === f.id && (
                          <Trophy className="h-3 w-3 text-green-600" />
                        )}
                        {f.fornecedor_nome}
                      </div>
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
                      <div className="flex items-center gap-1 mt-2">
                        <span className="text-xs text-muted-foreground whitespace-nowrap">Total manual:</span>
                        <Input
                          type="number"
                          step="0.01"
                          key={`manual-${f.valor_total_manual ?? ""}`}
                          defaultValue={f.valor_total_manual ?? ""}
                          placeholder="R$ total geral"
                          className="h-7 text-right text-xs"
                          onBlur={(e) => {
                            const cur = f.valor_total_manual != null ? String(f.valor_total_manual) : "";
                            if (e.target.value === cur) return;
                            salvarTotalManual(f.id, e.target.value);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                          }}
                        />
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
              <h3 className="text-sm font-semibold mb-2">Comparativo (preço unitário e total)</h3>
              <div className="border rounded-md overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px]">Item</TableHead>
                      <TableHead className="text-right">Qtd</TableHead>
                      {forns.map((f) => (
                        <TableHead key={f.id} className="text-right min-w-[180px]">
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
                            const totalAtual =
                              p?.preco_unitario != null
                                ? String(Number((Number(p.preco_unitario) * Number(it.quantidade)).toFixed(2)))
                                : "";
                            const isBest =
                              melhor != null && p?.preco_unitario != null && Number(p.preco_unitario) === melhor;
                            const isUsinagem = p?.tipo === "usinagem";
                            return (
                              <TableCell
                                key={f.id}
                                className={isBest ? "bg-green-50 dark:bg-green-950/30" : ""}
                              >
                                {isUsinagem && (
                                  <Badge variant="outline" className="mb-1 gap-1 text-[10px]">
                                    <Wrench className="h-3 w-3" /> usinagem
                                  </Badge>
                                )}
                                <div className="flex gap-1 items-center">
                                  <Input
                                    type="number"
                                    step="0.01"
                                    key={`unit-${valorAtual}`}
                                    defaultValue={valorAtual}
                                    placeholder="unit"
                                    title="Preço unitário"
                                    className={`h-8 text-right ${isBest ? "font-semibold" : ""}`}
                                    onBlur={(e) => salvarPreco(f.id, it.id, e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                                    }}
                                  />
                                  <Input
                                    type="number"
                                    step="0.01"
                                    key={`tot-${totalAtual}`}
                                    defaultValue={totalAtual}
                                    placeholder="total"
                                    title="Valor total (calcula unitário)"
                                    className="h-8 text-right"
                                    onBlur={(e) => salvarTotal(f.id, it.id, e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                                    }}
                                  />
                                </div>
                                {p?.preco_unitario != null && (
                                  <div className="text-xs text-right text-muted-foreground mt-1">
                                    {fmt(Number(p.preco_unitario))} · total {fmt(Number(p.preco_unitario) * Number(it.quantidade))}
                                  </div>
                                )}
                                {p?.prazo_entrega_dias != null && (
                                  <div className="text-xs text-muted-foreground">
                                    {p.prazo_entrega_dias}d entrega
                                  </div>
                                )}
                                {isUsinagem && p?.descricao_alternativa && (
                                  <div className="text-xs text-muted-foreground italic mt-1 text-right">
                                    {p.descricao_alternativa}
                                  </div>
                                )}
                                {p?.observacao && (
                                  <div className="text-xs text-muted-foreground mt-1 text-right">
                                    {p.observacao}
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
                        const t = totalFornEfetivo(f.id);
                        const manual = f.valor_total_manual != null && Number(f.valor_total_manual) > 0;
                        return (
                          <TableCell key={f.id} className="text-right font-semibold">
                            {t > 0 ? (
                              <span>
                                {fmt(t)}
                                {manual && (
                                  <span className="ml-1 text-[10px] text-muted-foreground font-normal">(manual)</span>
                                )}
                              </span>
                            ) : "—"}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}