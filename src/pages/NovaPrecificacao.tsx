import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Calculator, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useEmpresa } from "@/contexts/EmpresaContext";
import { PrecificacaoModal } from "@/components/PrecificacaoModal";
import { formatarMoeda, formatarPercentual } from "@/lib/precificacao-utils";

interface Precificacao {
  id: string;
  cliente_nome: string;
  produto: string | null;
  descricao: string | null;
  preco_desejado: number;
  desconto_percentual: number;
  impostos_percentual: number;
  comissao_percentual: number;
  percentuais_customizados: any;
  custos_variaveis: any;
  custos_cilindros: any;
  precificacao_lucro_real: any;
  margem_contribuicao: number;
  percentual_margem: number;
  updated_at: string;
}

export default function NovaPrecificacao() {
  const navigate = useNavigate();
  const { empresaAtual } = useEmpresa();
  const [clientes, setClientes] = useState<{ id: string; nome: string }[]>([]);
  const [lista, setLista] = useState<Precificacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modo, setModo] = useState<"lista" | "form">("lista");
  const [selecionada, setSelecionada] = useState<Precificacao | null>(null);
  const [clienteNome, setClienteNome] = useState("");
  const [produto, setProduto] = useState("");
  const [descricao, setDescricao] = useState("");
  const [aberto, setAberto] = useState(false);

  const carregarLista = useCallback(async () => {
    if (!empresaAtual?.id) return;
    setCarregando(true);
    const { data, error } = await supabase
      .from("precificacoes")
      .select("*")
      .eq("empresa_id", empresaAtual.id)
      .order("updated_at", { ascending: false });
    if (error) {
      console.error("Erro ao carregar precificações:", error);
      toast.error("Erro ao carregar precificações");
    }
    setLista((data as Precificacao[]) || []);
    setCarregando(false);
  }, [empresaAtual?.id]);

  useEffect(() => {
    if (!empresaAtual?.id) return;
    supabase
      .from("clientes")
      .select("id, nome")
      .eq("empresa_id", empresaAtual.id)
      .order("nome")
      .then(({ data }) => setClientes(data || []));
    carregarLista();
  }, [empresaAtual?.id, carregarLista]);

  const dados = useMemo(
    () => ({
      id: selecionada?.id,
      numero: "Estimativa",
      cliente_nome: clienteNome.trim(),
      equipamento: produto.trim(),
      descricao: descricao.trim(),
      preco_desejado: selecionada?.preco_desejado || 0,
      desconto_percentual: selecionada?.desconto_percentual || 0,
      impostos_percentual: selecionada?.impostos_percentual ?? 16,
      comissao_percentual: selecionada?.comissao_percentual || 0,
      percentuais_customizados: selecionada?.percentuais_customizados || [],
      custos_variaveis: selecionada?.custos_variaveis || [],
      custos_cilindros: selecionada?.custos_cilindros || [],
      precificacao_lucro_real: selecionada?.precificacao_lucro_real || {},
    }),
    [selecionada, clienteNome, produto, descricao]
  );

  const abrirForm = (p: Precificacao | null) => {
    setSelecionada(p);
    setClienteNome(p?.cliente_nome || "");
    setProduto(p?.produto || "");
    setDescricao(p?.descricao || "");
    setModo("form");
  };

  const voltarParaLista = () => {
    setModo("lista");
    setSelecionada(null);
    setClienteNome("");
    setProduto("");
    setDescricao("");
  };

  const iniciar = () => {
    if (!clienteNome.trim() || !produto.trim()) {
      toast.error("Informe o cliente e o produto");
      return;
    }
    setAberto(true);
  };

  const excluir = async (p: Precificacao) => {
    const { error } = await supabase.from("precificacoes").delete().eq("id", p.id);
    if (error) {
      console.error("Erro ao excluir precificação:", error);
      toast.error("Erro ao excluir precificação");
      return;
    }
    toast.success("Precificação excluída");
    carregarLista();
  };

  const aoSalvar = () => {
    carregarLista();
    voltarParaLista();
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => (modo === "form" ? voltarParaLista() : navigate("/orcamentos"))}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>

        {modo === "lista" ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-primary" /> Precificações
                  </CardTitle>
                  <CardDescription>Estimativas de preço salvas, sem criar orçamento.</CardDescription>
                </div>
                <Button onClick={() => abrirForm(null)}>
                  <Plus className="h-4 w-4 mr-2" /> Nova precificação
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {carregando ? (
                <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>
              ) : lista.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhuma precificação salva ainda. Clique em "Nova precificação" para começar.
                </p>
              ) : (
                <div className="space-y-2">
                  {lista.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between gap-2 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 cursor-pointer"
                      onClick={() => abrirForm(p)}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{p.cliente_nome}</p>
                        {p.produto && <p className="text-sm text-muted-foreground truncate">{p.produto}</p>}
                        <p className="text-xs text-muted-foreground mt-1">
                          Atualizada em {new Date(p.updated_at).toLocaleString("pt-BR")}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold">{formatarMoeda(p.preco_desejado || 0)}</p>
                        <p className="text-xs text-muted-foreground">
                          Margem {formatarPercentual(p.percentual_margem || 0)}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          excluir(p);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-primary" />
                {selecionada ? "Editar precificação" : "Nova precificação"}
              </CardTitle>
              <CardDescription>
                Estimativa de preço sem criar orçamento. Salve na tela de precificação para guardar na lista.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cliente">Cliente</Label>
                <Input
                  id="cliente"
                  list="lista-clientes"
                  value={clienteNome}
                  onChange={(e) => setClienteNome(e.target.value)}
                  placeholder="Selecione ou digite o cliente"
                />
                <datalist id="lista-clientes">
                  {clientes.map((c) => (
                    <option key={c.id} value={c.nome} />
                  ))}
                </datalist>
              </div>
              <div className="space-y-2">
                <Label htmlFor="produto">Produto / Equipamento</Label>
                <Input id="produto" value={produto} onChange={(e) => setProduto(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea id="descricao" rows={4} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
              </div>
              <Button className="w-full" onClick={iniciar}>
                <Calculator className="h-4 w-4 mr-2" /> Fazer precificação
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
      <PrecificacaoModal open={aberto} onClose={() => setAberto(false)} orcamento={dados} onSave={aoSalvar} standalone />
    </AppLayout>
  );
}
