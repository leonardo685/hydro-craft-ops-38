import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowDown, ArrowDownLeft, ArrowUp, ArrowUpDown, ArrowUpRight, ChevronDown, ChevronUp, FileDown } from "lucide-react";
import { useMemo, useState } from "react";
import { useLancamentosFinanceiros } from "@/hooks/use-lancamentos-financeiros";
import { useCategoriasFinanceiras } from "@/hooks/use-categorias-financeiras";
import { useContasBancarias } from "@/hooks/use-contas-bancarias";

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function PlanejamentoCaixa() {
  const { lancamentos } = useLancamentosFinanceiros();
  const { getNomeCategoriaMae } = useCategoriasFinanceiras();
  const { contasAtivas } = useContasBancarias();

  const [planejamentoExpanded, setPlanejamentoExpanded] = useState(true);
  const [periodoSelecionado, setPeriodoSelecionado] = useState("");
  const [dataInicial, setDataInicial] = useState("");
  const [dataFinal, setDataFinal] = useState("");
  const [contaBancariaFiltro, setContaBancariaFiltro] = useState("todas");
  const [buscaAtiva, setBuscaAtiva] = useState(false);
  const [movimentacoesFiltradas, setMovimentacoesFiltradas] = useState<any[]>([]);
  const [lancamentosOcultosTemporarios, setLancamentosOcultosTemporarios] = useState<Set<string>>(new Set());
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(null);

  const contasBancarias = contasAtivas.map(c => ({
    id: c.nome,
    nome: c.banco ? `${c.nome} - ${c.banco}` : c.nome,
  }));

  // Atualizar datas a partir de período pré-definido
  useMemo(() => {
    if (!periodoSelecionado || periodoSelecionado === "personalizado") return;
    const hoje = new Date();
    let inicio: Date; let fim: Date;
    switch (periodoSelecionado) {
      case "hoje": inicio = new Date(hoje); fim = new Date(hoje); break;
      case "semana": {
        const diaSemana = hoje.getDay();
        const diasAteSegunda = diaSemana === 0 ? -6 : 1 - diaSemana;
        inicio = new Date(hoje); inicio.setDate(hoje.getDate() + diasAteSegunda);
        fim = new Date(inicio); fim.setDate(inicio.getDate() + 6); break;
      }
      case "mes": inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1); fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0); break;
      case "trimestre": { const t = Math.floor(hoje.getMonth() / 3); inicio = new Date(hoje.getFullYear(), t * 3, 1); fim = new Date(hoje.getFullYear(), (t + 1) * 3, 0); break; }
      case "ano": inicio = new Date(hoje.getFullYear(), 0, 1); fim = new Date(hoje.getFullYear(), 11, 31); break;
      default: return;
    }
    setDataInicial(inicio.toISOString().split("T")[0]);
    setDataFinal(fim.toISOString().split("T")[0]);
  }, [periodoSelecionado]);

  const toggleOcultarLancamento = (id: string) => {
    setLancamentosOcultosTemporarios(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const handleBuscarMovimentacoes = () => {
    if (!periodoSelecionado && !dataInicial && !dataFinal) {
      setMovimentacoesFiltradas([]);
      setBuscaAtiva(false);
      return;
    }
    const dataInicioFiltro = dataInicial ? new Date(dataInicial + "T00:00:00") : null;
    const dataFimFiltro = dataFinal ? new Date(dataFinal + "T23:59:59") : null;
    const movs = lancamentos
      .filter(l => {
        if (l.pago) return false;
        if (l.tipo === "transferencia") return false;
        if (l.formaPagamento === "parcelado" && l.numeroParcelas && !l.parcelaNumero) return false;
        const d = new Date(l.dataEsperada);
        if (dataInicioFiltro && d < dataInicioFiltro) return false;
        if (dataFimFiltro && d > dataFimFiltro) return false;
        if (contaBancariaFiltro !== "todas" && l.contaBancaria !== contaBancariaFiltro) return false;
        return true;
      })
      .map(l => ({
        id: l.id,
        data: new Date(l.dataEsperada).toLocaleDateString("pt-BR"),
        descricao: l.descricao,
        tipo: l.tipo === "entrada" ? "receita" : "despesa",
        categoria: getNomeCategoriaMae(l.categoriaId || "") || "Sem categoria",
        valor: l.valor,
        status: l.pago ? "pago" : new Date(l.dataEsperada) < new Date() ? "vencido" : "pendente",
      }));
    setMovimentacoesFiltradas(movs);
    setBuscaAtiva(true);
  };

  const limparFiltros = () => {
    setPeriodoSelecionado("");
    setDataInicial("");
    setDataFinal("");
    setContaBancariaFiltro("todas");
    setMovimentacoesFiltradas([]);
    setBuscaAtiva(false);
    setLancamentosOcultosTemporarios(new Set());
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      if (sortDirection === "asc") setSortDirection("desc");
      else if (sortDirection === "desc") { setSortColumn(null); setSortDirection(null); }
    } else { setSortColumn(column); setSortDirection("asc"); }
  };

  const movimentacoesOrdenadas = useMemo(() => {
    if (!sortColumn || !sortDirection) return movimentacoesFiltradas;
    return [...movimentacoesFiltradas].sort((a, b) => {
      let aV: any = a[sortColumn as keyof typeof a];
      let bV: any = b[sortColumn as keyof typeof b];
      if (sortColumn === "data") {
        const [dA, mA, yA] = a.data.split("/"); const [dB, mB, yB] = b.data.split("/");
        aV = new Date(`${yA}-${mA}-${dA}`); bV = new Date(`${yB}-${mB}-${dB}`);
      }
      if (sortColumn === "valor") { aV = a.valor; bV = b.valor; }
      if (aV < bV) return sortDirection === "asc" ? -1 : 1;
      if (aV > bV) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [movimentacoesFiltradas, sortColumn, sortDirection]);

  const sortIcon = (col: string) =>
    sortColumn === col
      ? (sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />)
      : <ArrowUpDown className="h-4 w-4 opacity-30" />;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Planejamento de Fluxo de Caixa</CardTitle>
            <p className="text-sm text-muted-foreground">Busque e visualize movimentações financeiras por período</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setPlanejamentoExpanded(!planejamentoExpanded)}>
            {planejamentoExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      {planejamentoExpanded && (
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Período Pré-definido</Label>
              <Select value={periodoSelecionado} onValueChange={setPeriodoSelecionado}>
                <SelectTrigger><SelectValue placeholder="Selecionar período" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="personalizado">Personalizado</SelectItem>
                  <SelectItem value="hoje">Hoje</SelectItem>
                  <SelectItem value="semana">Esta Semana</SelectItem>
                  <SelectItem value="mes">Este Mês</SelectItem>
                  <SelectItem value="trimestre">Este Trimestre</SelectItem>
                  <SelectItem value="ano">Este Ano</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data Inicial</Label>
              <Input type="date" value={dataInicial} onChange={e => setDataInicial(e.target.value)} disabled={periodoSelecionado !== "" && periodoSelecionado !== "personalizado"} />
            </div>
            <div className="space-y-2">
              <Label>Data Final</Label>
              <Input type="date" value={dataFinal} onChange={e => setDataFinal(e.target.value)} disabled={periodoSelecionado !== "" && periodoSelecionado !== "personalizado"} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Conta Bancária</Label>
            <Select value={contaBancariaFiltro} onValueChange={setContaBancariaFiltro}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as contas</SelectItem>
                {contasBancarias.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {!buscaAtiva ? (
            <Button onClick={handleBuscarMovimentacoes} className="w-full">Buscar Movimentações</Button>
          ) : (
            <Button onClick={limparFiltros} variant="outline" className="w-full">Limpar Filtros</Button>
          )}

          {movimentacoesFiltradas.length > 0 && (
            <div className="space-y-4 mt-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Resultados da Busca</h3>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm"><FileDown className="h-4 w-4 mr-2" />Exportar PDF</Button>
                  <Button variant="outline" size="sm"><FileDown className="h-4 w-4 mr-2" />Exportar Excel</Button>
                </div>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="cursor-pointer hover:bg-muted/50 select-none" onClick={() => handleSort("data")}>
                        <div className="flex items-center gap-1">Data {sortIcon("data")}</div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-muted/50 select-none" onClick={() => handleSort("descricao")}>
                        <div className="flex items-center gap-1">Descrição {sortIcon("descricao")}</div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-muted/50 select-none" onClick={() => handleSort("tipo")}>
                        <div className="flex items-center gap-1">Tipo {sortIcon("tipo")}</div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-muted/50 select-none" onClick={() => handleSort("categoria")}>
                        <div className="flex items-center gap-1">Categoria {sortIcon("categoria")}</div>
                      </TableHead>
                      <TableHead className="text-right cursor-pointer hover:bg-muted/50 select-none" onClick={() => handleSort("valor")}>
                        <div className="flex items-center justify-end gap-1">Valor {sortIcon("valor")}</div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-muted/50 select-none" onClick={() => handleSort("status")}>
                        <div className="flex items-center gap-1">Status {sortIcon("status")}</div>
                      </TableHead>
                      <TableHead className="text-center">Ocultar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movimentacoesOrdenadas.map(mov => (
                      <TableRow key={mov.id} className={lancamentosOcultosTemporarios.has(mov.id) ? "opacity-40" : ""}>
                        <TableCell>{mov.data}</TableCell>
                        <TableCell>{mov.descricao}</TableCell>
                        <TableCell>
                          <Badge className="gap-1" style={{
                            backgroundColor: mov.tipo === "receita" ? "hsl(142 76% 36%)" : "hsl(0 84% 60%)",
                            color: "white",
                            borderColor: mov.tipo === "receita" ? "hsl(142 76% 36%)" : "hsl(0 84% 60%)",
                          }}>
                            {mov.tipo === "receita" ? <ArrowDownLeft className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                            {mov.tipo === "receita" ? "Receita" : "Despesa"}
                          </Badge>
                        </TableCell>
                        <TableCell><Badge variant="outline">{mov.categoria}</Badge></TableCell>
                        <TableCell className={`text-right font-medium ${mov.tipo === "receita" ? "text-green-600" : "text-destructive"}`}>
                          {formatCurrency(mov.valor)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={mov.status === "pago" ? "default" : mov.status === "vencido" ? "destructive" : "outline"}>
                            {mov.status === "pago" ? "Pago" : mov.status === "vencido" ? "Vencido" : "Pendente"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Checkbox checked={lancamentosOcultosTemporarios.has(mov.id)} onCheckedChange={() => toggleOcultarLancamento(mov.id)} title="Ocultar temporariamente do planejamento" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total de Receitas</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(movimentacoesFiltradas.filter(m => m.tipo === "receita" && !lancamentosOcultosTemporarios.has(m.id)).reduce((a, m) => a + m.valor, 0))}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total de Despesas</p>
                  <p className="text-2xl font-bold text-destructive">
                    {formatCurrency(movimentacoesFiltradas.filter(m => m.tipo === "despesa" && !lancamentosOcultosTemporarios.has(m.id)).reduce((a, m) => a + m.valor, 0))}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Saldo Líquido</p>
                  <p className={`text-2xl font-bold ${(() => {
                    const r = movimentacoesFiltradas.filter(m => m.tipo === "receita" && !lancamentosOcultosTemporarios.has(m.id)).reduce((a, m) => a + m.valor, 0);
                    const d = movimentacoesFiltradas.filter(m => m.tipo === "despesa" && !lancamentosOcultosTemporarios.has(m.id)).reduce((a, m) => a + m.valor, 0);
                    return r - d >= 0 ? "text-blue-600" : "text-amber-600";
                  })()}`}>
                    {formatCurrency((() => {
                      const r = movimentacoesFiltradas.filter(m => m.tipo === "receita" && !lancamentosOcultosTemporarios.has(m.id)).reduce((a, m) => a + m.valor, 0);
                      const d = movimentacoesFiltradas.filter(m => m.tipo === "despesa" && !lancamentosOcultosTemporarios.has(m.id)).reduce((a, m) => a + m.valor, 0);
                      return r - d;
                    })())}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}