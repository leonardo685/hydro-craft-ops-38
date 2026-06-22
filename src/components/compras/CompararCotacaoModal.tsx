import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Link2, CheckCircle2, Clock, Wrench, Trophy, Plus, Trash2 } from "lucide-react";
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
  const [finalizando, setFinalizando] = useState(false);

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
      toast.success(fornId === "__none__" ? "Vencedor removido" : "Vencedor confirmado — ajuste valores abaixo");
      await carregar();
      if (fornId !== "__none__") {
        // sync inicial: propaga compras já existentes do vencedor para a OS
        const ords = Array.from(new Set(itens.map((i) => i.ordem_servico_id).filter(Boolean))) as string[];
        for (const o of ords) {
          // eslint-disable-next-line no-await-in-loop
          await sincronizarOS(o);
        }
      }
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

  // ============== Fechamento (vencedor) ==============

  const isUsinagemDesc = (s: string) => /\(\s*usinagem\s*\)/i.test(s || "");
  const stripUsinagem = (s: string) => (s || "").replace(/\s*\(\s*usinagem\s*\)\s*$/i, "").trim();
  const itemTipo = (it: any): "peca" | "usinagem" =>
    it?.tipo === "usinagem" || isUsinagemDesc(it?.descricao) ? "usinagem" : "peca";

  const sincronizarOS = async (ordemId: string) => {
    if (!ordemId || !cotacaoId) return;
    // Itens originais da cotação para esta OS (snapshot atual no banco)
    const { data: itensOS, error: eItens } = await supabase
      .from("cotacao_itens")
      .select("id, descricao, quantidade, unidade, tipo")
      .eq("cotacao_id", cotacaoId)
      .eq("ordem_servico_id", ordemId);
    if (eItens) {
      toast.error("Erro lendo itens da cotação: " + eItens.message);
      return;
    }

    const venc = cotacao?.vencedor_fornecedor_id as string | null;
    if (!venc) return;

    // Propostas do vencedor (somente compradas — preço > 0)
    const itemIds = (itensOS || []).map((i: any) => i.id);
    let propsVenc: any[] = [];
    if (itemIds.length) {
      const { data: pp } = await supabase
        .from("cotacao_propostas")
        .select("cotacao_item_id, preco_unitario")
        .eq("cotacao_fornecedor_id", venc)
        .in("cotacao_item_id", itemIds);
      propsVenc = pp || [];
    }
    const compradosMap = new Map<string, number>();
    propsVenc.forEach((p) => {
      if (p.preco_unitario != null) compradosMap.set(p.cotacao_item_id, Number(p.preco_unitario));
    });

    // Conjuntos "cotado" (descrições normalizadas) para remover da OS antes de regravar
    const cotadoPecas = new Set<string>();
    const cotadoUsinagem = new Set<string>();
    (itensOS || []).forEach((i: any) => {
      const t = itemTipo(i);
      const desc = t === "usinagem" ? stripUsinagem(i.descricao) : i.descricao;
      (t === "usinagem" ? cotadoUsinagem : cotadoPecas).add((desc || "").trim().toLowerCase());
    });

    // OS atual
    const { data: os, error: eOs } = await supabase
      .from("ordens_servico")
      .select("pecas_necessarias, usinagem_necessaria, numero_ordem")
      .eq("id", ordemId)
      .single();
    if (eOs) {
      toast.error("Erro lendo OS: " + eOs.message);
      return;
    }

    const pecasMant = ((os?.pecas_necessarias as any[]) || []).filter(
      (p) => !cotadoPecas.has(((p.peca || p.descricao || "") as string).trim().toLowerCase()),
    );
    const usinMant = ((os?.usinagem_necessaria as any[]) || []).filter(
      (u) => !cotadoUsinagem.has(((u.trabalho || u.descricao || "") as string).trim().toLowerCase()),
    );

    const novasPecas: any[] = [...pecasMant];
    const novasUsin: any[] = [...usinMant];

    (itensOS || []).forEach((i: any) => {
      const valor = compradosMap.get(i.id);
      if (valor == null) return; // vencedor não comprou esse item
      const t = itemTipo(i);
      if (t === "usinagem") {
        novasUsin.push({
          trabalho: stripUsinagem(i.descricao),
          quantidade: Number(i.quantidade) || 1,
          valor,
          comprado: true,
        });
      } else {
        novasPecas.push({
          peca: i.descricao,
          quantidade: Number(i.quantidade) || 1,
          valor,
          comprado: true,
        });
      }
    });

    const { error: eUp } = await supabase
      .from("ordens_servico")
      .update({ pecas_necessarias: novasPecas, usinagem_necessaria: novasUsin })
      .eq("id", ordemId);
    if (eUp) {
      toast.error("Falha ao atualizar OS " + (os?.numero_ordem || "") + ": " + eUp.message);
      return;
    }
    toast.success("OS " + (os?.numero_ordem || "") + " sincronizada");
  };

  const sincronizarTodasOS = async () => {
    const ords = Array.from(new Set(itens.map((i) => i.ordem_servico_id).filter(Boolean))) as string[];
    for (const o of ords) {
      // eslint-disable-next-line no-await-in-loop
      await sincronizarOS(o);
    }
  };

  const salvarPrazoPagamento = async (fornId: string, dias: string) => {
    const num = dias === "" ? null : parseInt(dias, 10);
    const { error } = await supabase
      .from("cotacao_fornecedores")
      .update({ prazo_pagamento_dias: num })
      .eq("id", fornId);
    if (error) return toast.error("Erro: " + error.message);
    toast.success("Prazo de pagamento salvo");
    carregar();
  };

  const adicionarItemFechamento = async (tipo: "peca" | "usinagem") => {
    const ords = Array.from(new Set(itens.map((i) => i.ordem_servico_id).filter(Boolean))) as string[];
    const ordemId = ords[0] || null; // se houver várias, usa a primeira; usuário pode editar depois
    if (!ordemId) {
      toast.error("Cotação sem OS vinculada — não é possível sincronizar item novo");
      return;
    }
    const descPlaceholder = tipo === "usinagem" ? "Nova usinagem (usinagem)" : "Nova peça";
    const { data: novo, error } = await supabase
      .from("cotacao_itens")
      .insert({
        cotacao_id: cotacaoId!,
        ordem_servico_id: ordemId,
        descricao: descPlaceholder,
        quantidade: 1,
        unidade: "un",
        tipo,
      })
      .select("id")
      .single();
    if (error) return toast.error("Erro: " + error.message);
    // cria proposta zerada para o vencedor para já aparecer na lista
    if (cotacao?.vencedor_fornecedor_id && novo?.id) {
      await supabase.from("cotacao_propostas").upsert(
        {
          cotacao_fornecedor_id: cotacao.vencedor_fornecedor_id,
          cotacao_item_id: novo.id,
          preco_unitario: 0,
          tipo,
        },
        { onConflict: "cotacao_fornecedor_id,cotacao_item_id" },
      );
    }
    toast.success("Item adicionado — preencha descrição e valor");
    await carregar();
    await sincronizarTodasOS();
  };

  const removerItemFechamento = async (itemId: string) => {
    // Apaga propostas associadas a esse item e o próprio item
    await supabase.from("cotacao_propostas").delete().eq("cotacao_item_id", itemId);
    const { error } = await supabase.from("cotacao_itens").delete().eq("id", itemId);
    if (error) return toast.error("Erro: " + error.message);
    toast.success("Item removido");
    await carregar();
    await sincronizarTodasOS();
  };

  const atualizarItemFechamento = async (
    itemId: string,
    campo: "descricao" | "quantidade" | "unidade",
    valor: string,
  ) => {
    const it = itens.find((i) => i.id === itemId);
    if (!it) return;
    let v: any = valor;
    if (campo === "quantidade") v = Number(valor.replace(",", ".")) || 0;
    if (it[campo] === v) return;
    const { error } = await supabase.from("cotacao_itens").update({ [campo]: v }).eq("id", itemId);
    if (error) return toast.error("Erro: " + error.message);
    await carregar();
    await sincronizarTodasOS();
  };

  const salvarPrecoVencedor = async (itemId: string, valor: string) => {
    if (!cotacao?.vencedor_fornecedor_id) return;
    const num = valor === "" ? null : Number(valor.replace(",", "."));
    const existente = proposta(cotacao.vencedor_fornecedor_id, itemId);
    if (existente && Number(existente.preco_unitario ?? NaN) === Number(num)) return;
    const { error } = await supabase.from("cotacao_propostas").upsert(
      {
        cotacao_fornecedor_id: cotacao.vencedor_fornecedor_id,
        cotacao_item_id: itemId,
        preco_unitario: num,
        prazo_entrega_dias: existente?.prazo_entrega_dias ?? null,
        observacao: existente?.observacao ?? null,
      },
      { onConflict: "cotacao_fornecedor_id,cotacao_item_id" },
    );
    if (error) return toast.error("Erro: " + error.message);
    await carregar();
    await sincronizarTodasOS();
  };

  const finalizarCompra = async () => {
    if (!cotacaoId) return;
    setFinalizando(true);
    try {
      await sincronizarTodasOS();
      const ords = Array.from(new Set(itens.map((i) => i.ordem_servico_id).filter(Boolean))) as string[];
      if (ords.length) {
        const { error: e1 } = await supabase
          .from("compras")
          .update({ status: "comprado", data_compra: new Date().toISOString() })
          .in("ordem_servico_id", ords);
        if (e1) throw e1;
      }
      const { error: e2 } = await supabase
        .from("cotacoes")
        .update({ status: "finalizada" })
        .eq("id", cotacaoId);
      if (e2) throw e2;
      toast.success("Compra finalizada");
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Erro ao finalizar: " + err.message);
    } finally {
      setFinalizando(false);
    }
  };

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
                    </div>
                    <Button size="sm" variant="outline" onClick={() => copiarLink(f.token_publico)}>
                      <Link2 className="h-3 w-3 mr-1" /> Link
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Fechamento com vencedor */}
            {cotacao.vencedor_fornecedor_id && (() => {
              const venc = forns.find((f) => f.id === cotacao.vencedor_fornecedor_id);
              if (!venc) return null;
              const totalFech = itens.reduce((acc, it) => {
                const p = proposta(venc.id, it.id);
                if (p?.preco_unitario == null) return acc;
                return acc + Number(p.preco_unitario) * Number(it.quantidade);
              }, 0);
              return (
                <div className="border-2 border-green-500 rounded-md p-4 bg-green-50/50 dark:bg-green-950/20 space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-green-600" />
                      <h3 className="text-base font-semibold">Fechamento com {venc.fornecedor_nome}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-muted-foreground">Prazo pagamento (dias):</label>
                      <Input
                        type="number"
                        key={`prazo-${venc.prazo_pagamento_dias ?? ""}`}
                        defaultValue={venc.prazo_pagamento_dias ?? 28}
                        className="h-8 w-24"
                        onBlur={(e) => {
                          const cur = String(venc.prazo_pagamento_dias ?? "");
                          if (e.target.value === cur) return;
                          salvarPrazoPagamento(venc.id, e.target.value);
                        }}
                        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Edite itens, valores e quantidades abaixo. As alterações são refletidas em tempo real na OS vinculada (peças/usinagens, QR code e histórico).
                  </p>
                  <div className="border rounded-md overflow-x-auto bg-background">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[100px]">Tipo</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead className="text-right w-[90px]">Qtd</TableHead>
                          <TableHead className="w-[70px]">Un</TableHead>
                          <TableHead className="text-right w-[130px]">Valor unit.</TableHead>
                          <TableHead className="text-right w-[130px]">Total</TableHead>
                          <TableHead className="w-[40px]">{" "}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {itens.map((it) => {
                          const tipo = itemTipo(it);
                          const p = proposta(venc.id, it.id);
                          const unit = p?.preco_unitario != null ? Number(p.preco_unitario) : 0;
                          const total = unit * Number(it.quantidade);
                          return (
                            <TableRow key={it.id}>
                              <TableCell>
                                <Badge variant={tipo === "usinagem" ? "outline" : "secondary"} className="gap-1 text-[10px]">
                                  {tipo === "usinagem" && <Wrench className="h-3 w-3" />}
                                  {tipo === "usinagem" ? "Usinagem" : "Peça"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Input
                                  key={`desc-${it.descricao}`}
                                  defaultValue={it.descricao}
                                  className="h-8"
                                  onBlur={(e) => atualizarItemFechamento(it.id, "descricao", e.target.value)}
                                  onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  key={`qtd-${it.quantidade}`}
                                  defaultValue={it.quantidade}
                                  className="h-8 text-right"
                                  onBlur={(e) => atualizarItemFechamento(it.id, "quantidade", e.target.value)}
                                  onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  key={`un-${it.unidade}`}
                                  defaultValue={it.unidade || "un"}
                                  className="h-8"
                                  onBlur={(e) => atualizarItemFechamento(it.id, "unidade", e.target.value)}
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  step="0.01"
                                  key={`vunit-${unit}`}
                                  defaultValue={unit || ""}
                                  placeholder="0,00"
                                  className="h-8 text-right"
                                  onBlur={(e) => salvarPrecoVencedor(it.id, e.target.value)}
                                  onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                                />
                              </TableCell>
                              <TableCell className="text-right text-sm font-medium">
                                {total > 0 ? fmt(total) : "—"}
                              </TableCell>
                              <TableCell>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-destructive"
                                  onClick={() => removerItemFechamento(it.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                         <TableRow className="bg-muted/40">
                           <TableCell colSpan={4} className="font-semibold">
                             Total do fechamento
                             {venc.valor_total_manual != null && Number(venc.valor_total_manual) > 0 && (
                               <span className="ml-2 text-xs font-normal text-muted-foreground">
                                 (calculado: {fmt(totalFech)})
                               </span>
                             )}
                           </TableCell>
                           <TableCell className="text-right">
                             <div className="flex items-center justify-end gap-1">
                               <span className="text-xs text-muted-foreground whitespace-nowrap">Manual:</span>
                               <Input
                                 type="number"
                                 step="0.01"
                                 key={`manual-${venc.valor_total_manual ?? ""}`}
                                 defaultValue={venc.valor_total_manual ?? ""}
                                 placeholder="R$"
                                 className="h-8 text-right w-28"
                                 onBlur={(e) => {
                                   const cur = venc.valor_total_manual != null ? String(venc.valor_total_manual) : "";
                                   if (e.target.value === cur) return;
                                   salvarTotalManual(venc.id, e.target.value);
                                 }}
                                 onKeyDown={(e) => {
                                   if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                                 }}
                               />
                             </div>
                           </TableCell>
                           <TableCell className="text-right font-semibold">
                             {venc.valor_total_manual != null && Number(venc.valor_total_manual) > 0
                               ? fmt(Number(venc.valor_total_manual))
                               : totalFech > 0 ? fmt(totalFech) : "—"}
                           </TableCell>
                           <TableCell>{" "}</TableCell>
                         </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => adicionarItemFechamento("peca")}>
                      <Plus className="h-3 w-3 mr-1" /> Adicionar peça
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => adicionarItemFechamento("usinagem")}>
                      <Plus className="h-3 w-3 mr-1" /> Adicionar usinagem
                    </Button>
                    <Button
                      size="sm"
                      onClick={finalizarCompra}
                      disabled={finalizando}
                      className="ml-auto bg-green-600 hover:bg-green-700 text-white"
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      {finalizando ? "Finalizando..." : "Finalizar compra"}
                    </Button>
                  </div>
                </div>
              );
            })()}

            {/* Comparativo */}
            <Collapsible defaultOpen={!cotacao.vencedor_fornecedor_id}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold">Comparativo (preço unitário e total)</h3>
                <CollapsibleTrigger asChild>
                  <Button size="sm" variant="ghost">Mostrar / ocultar</Button>
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent>
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
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}