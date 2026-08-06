import { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useHistoricoLancamentos } from "@/hooks/use-historico-lancamentos";
import { RefreshButton } from "@/components/RefreshButton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Search, ArrowUp, ArrowDown, ArrowUpDown, X } from "lucide-react";

export default function HistoricoLancamentos() {
  const { data: historico, isLoading, refetch } = useHistoricoLancamentos();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortColumn, setSortColumn] = useState<string | null>("created_at");
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>('desc');
  const [filtroDataInicio, setFiltroDataInicio] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");
  const [filtroAcao, setFiltroAcao] = useState("todos");
  const [filtroDescricao, setFiltroDescricao] = useState("");
  const [filtroBanco, setFiltroBanco] = useState("todos");
  const [filtroCampo, setFiltroCampo] = useState("todos");
  const [filtroValorAnterior, setFiltroValorAnterior] = useState("");
  const [filtroValorNovo, setFiltroValorNovo] = useState("");

  const getTipoAcaoBadge = (tipoAcao: string) => {
    const badges = {
      criado: <Badge variant="outline" className="bg-accent-light text-accent border-accent">Criado</Badge>,
      editado: <Badge variant="outline" className="bg-warning-light text-warning border-warning">Editado</Badge>,
      excluido: <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive">Excluído</Badge>,
      pago: <Badge variant="outline" className="bg-accent-light text-accent border-accent">Marcado como Pago</Badge>,
      despago: <Badge variant="outline" className="bg-warning-light text-warning border-warning">Desmarcado como Pago</Badge>,
    };
    return badges[tipoAcao as keyof typeof badges] || <Badge variant="outline">{tipoAcao}</Badge>;
  };

  const getCampoAlterado = (campo: string | null) => {
    if (!campo) return "-";
    
    const campos = {
      status_pagamento: "Status de Pagamento",
      valor: "Valor",
      data_esperada: "Data Esperada",
      data_realizada: "Data Realizada",
      descricao: "Descrição",
      tipo: "Tipo",
      categoria: "Categoria",
      conta_bancaria: "Conta Bancária",
      fornecedor_cliente: "Fornecedor/Cliente",
    };
    return campos[campo as keyof typeof campos] || campo;
  };

  const formatValor = (valor: string | null, campo: string | null) => {
    if (!valor || valor === "null") return "-";
    
    if (campo === "valor") {
      const numValue = parseFloat(valor);
      return numValue.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      });
    }
    
    if (campo === "data_esperada" || campo === "data_realizada") {
      try {
        return format(new Date(valor), "dd/MM/yyyy", { locale: ptBR });
      } catch {
        return valor;
      }
    }
    
    if (campo === "status_pagamento") {
      return valor === "true" ? "Pago" : "Não Pago";
    }
    
    return valor;
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      if (sortDirection === null) {
        setSortDirection('asc');
      } else if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortDirection(null);
        setSortColumn(null);
      }
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const SortableTableHead = ({ 
    column, 
    children, 
    className = "" 
  }: { 
    column: string; 
    children: React.ReactNode; 
    className?: string;
  }) => {
    const isActive = sortColumn === column;
    
    return (
      <TableHead className={className}>
        <button
          onClick={() => handleSort(column)}
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
          {children}
          <div className="flex flex-col">
            {isActive && sortDirection === 'asc' && (
              <ArrowUp className="h-3 w-3" />
            )}
            {isActive && sortDirection === 'desc' && (
              <ArrowDown className="h-3 w-3" />
            )}
            {(!isActive || sortDirection === null) && (
              <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
            )}
          </div>
        </button>
      </TableHead>
    );
  };

  const sortData = (data: any[]) => {
    if (!sortColumn || !sortDirection) return data;

    return [...data].sort((a, b) => {
      let aVal = a[sortColumn];
      let bVal = b[sortColumn];

      if (sortColumn === 'created_at') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      } else {
        aVal = String(aVal || '').toLowerCase();
        bVal = String(bVal || '').toLowerCase();
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const getBanco = (item: any) => {
    if (item.campo_alterado === "conta_bancaria") {
      return item.valor_novo || item.valor_anterior || "-";
    }
    return item.lancamentos_financeiros?.conta_bancaria || item.metadados?.conta_bancaria || "-";
  };

  const getDescricao = (item: any) =>
    item.metadados?.descricao || item.lancamentos_financeiros?.descricao || "-";

  const bancosDisponiveis = useMemo(() => {
    const set = new Set<string>();
    (historico || []).forEach((item) => {
      const banco = getBanco(item);
      if (banco && banco !== "-") set.add(banco);
    });
    return Array.from(set).sort();
  }, [historico]);

  const acoesDisponiveis = useMemo(() => {
    const set = new Set<string>();
    (historico || []).forEach((item) => set.add(item.tipo_acao));
    return Array.from(set).sort();
  }, [historico]);

  const camposDisponiveis = useMemo(() => {
    const set = new Set<string>();
    (historico || []).forEach((item) => {
      if (item.campo_alterado) set.add(item.campo_alterado);
    });
    return Array.from(set).sort();
  }, [historico]);

  const limparFiltros = () => {
    setSearchTerm("");
    setFiltroDataInicio("");
    setFiltroDataFim("");
    setFiltroAcao("todos");
    setFiltroDescricao("");
    setFiltroBanco("todos");
    setFiltroCampo("todos");
    setFiltroValorAnterior("");
    setFiltroValorNovo("");
  };

  const historicoFiltrado = useMemo(() => {
    const search = searchTerm.toLowerCase();

    return (historico || []).filter((item) => {
      const descricao = getDescricao(item).toLowerCase();
      const tipoAcao = item.tipo_acao.toLowerCase();
      const campoAlterado = getCampoAlterado(item.campo_alterado).toLowerCase();
      const banco = getBanco(item);
      const valorAnterior = formatValor(item.valor_anterior, item.campo_alterado).toLowerCase();
      const valorNovo = formatValor(item.valor_novo, item.campo_alterado).toLowerCase();

      if (
        search &&
        !descricao.includes(search) &&
        !tipoAcao.includes(search) &&
        !campoAlterado.includes(search) &&
        !banco.toLowerCase().includes(search)
      ) {
        return false;
      }

      if (filtroDataInicio && new Date(item.created_at) < new Date(`${filtroDataInicio}T00:00:00`)) {
        return false;
      }
      if (filtroDataFim && new Date(item.created_at) > new Date(`${filtroDataFim}T23:59:59`)) {
        return false;
      }
      if (filtroAcao !== "todos" && item.tipo_acao !== filtroAcao) return false;
      if (filtroDescricao && !descricao.includes(filtroDescricao.toLowerCase())) return false;
      if (filtroBanco !== "todos" && banco !== filtroBanco) return false;
      if (filtroCampo !== "todos" && (item.campo_alterado || "") !== filtroCampo) return false;
      if (filtroValorAnterior && !valorAnterior.includes(filtroValorAnterior.toLowerCase())) return false;
      if (filtroValorNovo && !valorNovo.includes(filtroValorNovo.toLowerCase())) return false;

      return true;
    });
  }, [
    historico,
    searchTerm,
    filtroDataInicio,
    filtroDataFim,
    filtroAcao,
    filtroDescricao,
    filtroBanco,
    filtroCampo,
    filtroValorAnterior,
    filtroValorNovo,
  ]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Histórico de Lançamentos</h1>
            <p className="text-muted-foreground mt-2">
              Visualize todas as alterações realizadas nos lançamentos financeiros
            </p>
          </div>
          <RefreshButton onRefresh={() => refetch()} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Registro de Alterações</CardTitle>
            <CardDescription>
              Histórico completo de criações, edições e exclusões de lançamentos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por descrição, ação, banco ou campo alterado..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={filtroDataInicio}
                  onChange={(e) => setFiltroDataInicio(e.target.value)}
                  className="w-[150px]"
                />
                <span className="text-muted-foreground text-sm">até</span>
                <Input
                  type="date"
                  value={filtroDataFim}
                  onChange={(e) => setFiltroDataFim(e.target.value)}
                  className="w-[150px]"
                />
                <Button variant="outline" size="sm" onClick={limparFiltros}>
                  <X className="h-4 w-4 mr-1" /> Limpar
                </Button>
              </div>
            </div>

            <div className="mb-2 text-sm text-muted-foreground">
              {historicoFiltrado.length} registro(s)
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableTableHead column="created_at">Data/Hora</SortableTableHead>
                    <SortableTableHead column="tipo_acao">Ação</SortableTableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Banco</TableHead>
                    <SortableTableHead column="campo_alterado">Campo Alterado</SortableTableHead>
                    <TableHead>Valor Anterior</TableHead>
                    <TableHead>Valor Novo</TableHead>
                  </TableRow>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="p-2 text-xs text-muted-foreground">
                      Use o filtro de datas
                    </TableHead>
                    <TableHead className="p-2">
                      <Select value={filtroAcao} onValueChange={setFiltroAcao}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Todas" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todas</SelectItem>
                          {acoesDisponiveis.map((a) => (
                            <SelectItem key={a} value={a}>{a}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableHead>
                    <TableHead className="p-2">
                      <Input
                        placeholder="Filtrar..."
                        value={filtroDescricao}
                        onChange={(e) => setFiltroDescricao(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </TableHead>
                    <TableHead className="p-2">
                      <Select value={filtroBanco} onValueChange={setFiltroBanco}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos</SelectItem>
                          {bancosDisponiveis.map((b) => (
                            <SelectItem key={b} value={b}>{b}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableHead>
                    <TableHead className="p-2">
                      <Select value={filtroCampo} onValueChange={setFiltroCampo}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos</SelectItem>
                          {camposDisponiveis.map((c) => (
                            <SelectItem key={c} value={c}>{getCampoAlterado(c)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableHead>
                    <TableHead className="p-2">
                      <Input
                        placeholder="Filtrar..."
                        value={filtroValorAnterior}
                        onChange={(e) => setFiltroValorAnterior(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </TableHead>
                    <TableHead className="p-2">
                      <Input
                        placeholder="Filtrar..."
                        value={filtroValorNovo}
                        onChange={(e) => setFiltroValorNovo(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Carregando histórico...
                      </TableCell>
                    </TableRow>
                  ) : historicoFiltrado.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Nenhum registro encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortData(historicoFiltrado).map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(item.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell>{getTipoAcaoBadge(item.tipo_acao)}</TableCell>
                        <TableCell className="max-w-[260px] whitespace-normal break-words">
                          {getDescricao(item)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{getBanco(item)}</TableCell>
                        <TableCell>{getCampoAlterado(item.campo_alterado)}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          {formatValor(item.valor_anterior, item.campo_alterado)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {formatValor(item.valor_novo, item.campo_alterado)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
