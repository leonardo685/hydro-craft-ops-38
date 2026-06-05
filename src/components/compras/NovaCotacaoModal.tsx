import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEmpresa } from "@/contexts/EmpresaContext";
import { toast } from "sonner";
import { Plus, Trash2, Search } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: () => void;
}

interface ItemForm {
  descricao: string;
  quantidade: number;
  unidade: string;
  ordem_servico_id?: string | null;
}

interface FornecedorRow {
  id: string;
  nome: string;
  email_cotacao: string | null;
  email: string | null;
  whatsapp: string | null;
  telefone: string | null;
  prazo_pagamento_padrao_dias: number | null;
}

interface OrdemRow {
  id: string;
  numero_ordem: string;
  cliente_nome: string | null;
  equipamento: string | null;
  pecas: { descricao: string; quantidade: number; unidade: string }[];
}

export function NovaCotacaoModal({ open, onOpenChange, onCreated }: Props) {
  const { empresaAtual } = useEmpresa();
  const [observacoes, setObservacoes] = useState("");
  const [prazoResposta, setPrazoResposta] = useState("");
  const [itens, setItens] = useState<ItemForm[]>([]);
  const [fornecedores, setFornecedores] = useState<FornecedorRow[]>([]);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [filtroForn, setFiltroForn] = useState("");
  const [ordens, setOrdens] = useState<OrdemRow[]>([]);
  const [ordemSelecionada, setOrdemSelecionada] = useState<string>("");
  const [itensCotados, setItensCotados] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !empresaAtual?.id) return;
    (async () => {
      const [forn, comp, cotados] = await Promise.all([
        supabase
          .from("fornecedores")
          .select("id, nome, email_cotacao, email, whatsapp, telefone, prazo_pagamento_padrao_dias")
          .eq("empresa_id", empresaAtual.id)
          .order("nome"),
        supabase
          .from("compras")
          .select("ordens_servico!inner(id, numero_ordem, cliente_nome, equipamento, status, pecas_necessarias, usinagem_necessaria)")
          .eq("empresa_id", empresaAtual.id)
          .in("status", ["aprovado", "cotando"]),
        supabase
          .from("cotacao_itens")
          .select("ordem_servico_id, descricao, cotacoes!inner(empresa_id)")
          .eq("cotacoes.empresa_id", empresaAtual.id)
          .not("ordem_servico_id", "is", null),
      ]);
      setFornecedores((forn.data as any) || []);
      const cotadosSet = new Set<string>();
      ((cotados.data as any[]) || []).forEach((ci) => {
        if (ci.ordem_servico_id && ci.descricao) {
          cotadosSet.add(`${ci.ordem_servico_id}|${ci.descricao.trim().toLowerCase()}`);
        }
      });
      setItensCotados(cotadosSet);
      const ords: OrdemRow[] = [];
      ((comp.data as any[]) || []).forEach((c) => {
        const os = c.ordens_servico;
        if (!os) return;
        const pecas: { descricao: string; quantidade: number; unidade: string }[] = [];
        (os.pecas_necessarias || []).forEach((p: any) => {
          pecas.push({
            descricao: p.peca || p.descricao || p.nome || "Peça",
            quantidade: Number(p.quantidade || 1),
            unidade: p.unidade || "un",
          });
        });
        (os.usinagem_necessaria || []).forEach((p: any) => {
          pecas.push({
            descricao: `${p.trabalho || p.descricao || p.nome || "Usinagem"} (usinagem)`,
            quantidade: Number(p.quantidade || 1),
            unidade: p.unidade || "un",
          });
        });
        ords.push({
          id: os.id,
          numero_ordem: os.numero_ordem,
          cliente_nome: os.cliente_nome,
          equipamento: os.equipamento,
          pecas,
        });
      });
      ords.sort((a, b) => a.numero_ordem.localeCompare(b.numero_ordem));
      setOrdens(ords);
    })();
  }, [open, empresaAtual?.id]);

  const reset = () => {
    setObservacoes("");
    setPrazoResposta("");
    setItens([]);
    setSelecionados(new Set());
    setFiltroForn("");
    setOrdemSelecionada("");
  };

  const addItem = (i: Partial<ItemForm>) => {
    setItens((prev) => [
      ...prev,
      {
        descricao: i.descricao || "",
        quantidade: i.quantidade || 1,
        unidade: i.unidade || "un",
        ordem_servico_id: i.ordem_servico_id || null,
      },
    ]);
  };

  const selecionarOrdem = (ordemId: string) => {
    setOrdemSelecionada(ordemId);
    setItens([]);
  };

  const isPecaSelecionada = (ordemId: string, descricao: string) =>
    itens.some((i) => i.ordem_servico_id === ordemId && i.descricao === descricao);

  const togglePeca = (ordemId: string, p: { descricao: string; quantidade: number; unidade: string }) => {
    setItens((prev) => {
      const exists = prev.some((i) => i.ordem_servico_id === ordemId && i.descricao === p.descricao);
      if (exists) {
        return prev.filter((i) => !(i.ordem_servico_id === ordemId && i.descricao === p.descricao));
      }
      return [...prev, { descricao: p.descricao, quantidade: p.quantidade, unidade: p.unidade, ordem_servico_id: ordemId }];
    });
  };

  const removeItem = (idx: number) => setItens((prev) => prev.filter((_, i) => i !== idx));

  const toggleForn = (id: string) => {
    setSelecionados((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const handleSalvar = async () => {
    if (!empresaAtual?.id) return;
    if (itens.length === 0) return toast.error("Adicione pelo menos um item");
    if (selecionados.size === 0) return toast.error("Selecione pelo menos um fornecedor");
    if (itens.some((i) => !i.descricao.trim())) return toast.error("Preencha a descrição de todos os itens");

    setSaving(true);
    try {
      const { data: numero } = await supabase.rpc("gerar_proximo_numero_cotacao", {
        p_empresa_id: empresaAtual.id,
      });
      const { data: user } = await supabase.auth.getUser();

      const { data: cot, error: e1 } = await supabase
        .from("cotacoes")
        .insert({
          empresa_id: empresaAtual.id,
          numero: numero as string,
          status: "aberta",
          observacoes: observacoes || null,
          prazo_resposta: prazoResposta || null,
          criado_por: user.user?.id,
        })
        .select("id")
        .single();
      if (e1) throw e1;

      const { error: e2 } = await supabase.from("cotacao_itens").insert(
        itens.map((i) => ({
          cotacao_id: cot!.id,
          descricao: i.descricao,
          quantidade: i.quantidade,
          unidade: i.unidade,
          ordem_servico_id: i.ordem_servico_id || null,
        }))
      );
      if (e2) throw e2;

      const fornsSel = fornecedores.filter((f) => selecionados.has(f.id));
      const { error: e3 } = await supabase.from("cotacao_fornecedores").insert(
        fornsSel.map((f) => ({
          cotacao_id: cot!.id,
          fornecedor_id: f.id,
          fornecedor_nome: f.nome,
          fornecedor_email: f.email_cotacao || f.email || null,
          fornecedor_whatsapp: f.whatsapp || f.telefone || null,
          prazo_pagamento_dias: f.prazo_pagamento_padrao_dias || 28,
        }))
      );
      if (e3) throw e3;

      toast.success(`Cotação ${numero} criada`);
      reset();
      onOpenChange(false);
      onCreated?.();
    } catch (err: any) {
      toast.error("Erro ao criar cotação: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const fornFiltrados = fornecedores.filter((f) =>
    f.nome.toLowerCase().includes(filtroForn.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Nova Cotação</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-4 -mr-2">
          <div className="space-y-6">
            {/* Dados básicos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Prazo para resposta</Label>
                <Input type="date" value={prazoResposta} onChange={(e) => setPrazoResposta(e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <Label>Observações</Label>
                <Textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Informações adicionais ao fornecedor (entrega, qualidade, etc.)"
                  rows={2}
                />
              </div>
            </div>

            {/* Itens */}
            <div>
              <div className="mb-3">
                <Label className="text-base">Ordem de serviço</Label>
                <Select value={ordemSelecionada} onValueChange={selecionarOrdem}>
                  <SelectTrigger>
                    <SelectValue placeholder={ordens.length === 0 ? "Nenhuma ordem em aberto" : "Selecione uma ordem"} />
                  </SelectTrigger>
                  <SelectContent>
                    {ordens.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.numero_ordem} — {o.cliente_nome || "Sem cliente"} ({o.pecas.length} itens)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {ordemSelecionada && (
                  <div className="mt-3 border rounded-md divide-y">
                    {(ordens.find((o) => o.id === ordemSelecionada)?.pecas || []).length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Esta ordem não tem itens. Adicione manualmente abaixo.
                      </p>
                    ) : (
                      (ordens.find((o) => o.id === ordemSelecionada)?.pecas || []).map((p, i) => {
                        const cotado = itensCotados.has(`${ordemSelecionada}|${p.descricao.trim().toLowerCase()}`);
                        const selecionado = isPecaSelecionada(ordemSelecionada, p.descricao);
                        return (
                          <label
                            key={i}
                            className="flex items-center gap-3 px-3 py-2 hover:bg-muted cursor-pointer"
                          >
                            <Checkbox
                              checked={selecionado}
                              onCheckedChange={() => togglePeca(ordemSelecionada, p)}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm flex items-center gap-2 flex-wrap">
                                <span className="truncate">{p.descricao}</span>
                                {cotado && (
                                  <Badge variant="secondary" className="text-[10px]">
                                    já cotado
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {p.quantidade} {p.unidade}
                              </div>
                            </div>
                          </label>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between mb-2">
                <Label className="text-base">Itens da cotação ({itens.length})</Label>
                <Button size="sm" variant="outline" onClick={() => addItem({ ordem_servico_id: ordemSelecionada || null })}>
                  <Plus className="h-4 w-4 mr-1" /> Item manual
                </Button>
              </div>

              <div className="space-y-2">
                {itens.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6 border rounded-md">
                    Selecione uma ordem acima para carregar seus itens, ou adicione um item manual.
                  </p>
                )}
                {itens.map((it, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-end border rounded-md p-2">
                    <div className="col-span-7">
                      <Label className="text-xs">Descrição</Label>
                      <Input
                        value={it.descricao}
                        onChange={(e) => {
                          const v = e.target.value;
                          setItens((prev) => prev.map((p, i) => (i === idx ? { ...p, descricao: v } : p)));
                        }}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Qtd</Label>
                      <Input
                        type="number"
                        min={0}
                        value={it.quantidade}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          setItens((prev) => prev.map((p, i) => (i === idx ? { ...p, quantidade: v } : p)));
                        }}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Unid.</Label>
                      <Input
                        value={it.unidade}
                        onChange={(e) => {
                          const v = e.target.value;
                          setItens((prev) => prev.map((p, i) => (i === idx ? { ...p, unidade: v } : p)));
                        }}
                      />
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeItem(idx)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Fornecedores */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-base">Fornecedores ({selecionados.size} selecionados)</Label>
                <div className="relative w-56">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-8"
                    placeholder="Buscar fornecedor"
                    value={filtroForn}
                    onChange={(e) => setFiltroForn(e.target.value)}
                  />
                </div>
              </div>
              <div className="border rounded-md max-h-64 overflow-y-auto">
                {fornFiltrados.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Nenhum fornecedor cadastrado.
                  </p>
                ) : (
                  fornFiltrados.map((f) => (
                    <label
                      key={f.id}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-muted cursor-pointer border-b last:border-b-0"
                    >
                      <Checkbox
                        checked={selecionados.has(f.id)}
                        onCheckedChange={() => toggleForn(f.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{f.nome}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {(f.email_cotacao || f.email || "sem email")} ·{" "}
                          {(f.whatsapp || f.telefone || "sem whatsapp")} ·{" "}
                          {f.prazo_pagamento_padrao_dias || 28}ddl
                        </div>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSalvar} disabled={saving}>
            {saving ? "Criando..." : "Criar cotação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}