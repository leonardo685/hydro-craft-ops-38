import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useHistoricoLancamentos } from "@/hooks/use-historico-lancamentos";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Search, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";

export default function HistoricoLancamentos() {
  const { data: historico, isLoading } = useHistoricoLancamentos();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortColumn, setSortColumn] = useState<string | null>("created_at");
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>('desc');

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

  const historicoFiltrado = historico?.filter((item) => {
    const descricao = item.metadados?.descricao?.toLowerCase() || "";
    const tipoAcao = item.tipo_acao.toLowerCase();
    const campoAlterado = getCampoAlterado(item.campo_alterado).toLowerCase();
    const search = searchTerm.toLowerCase();

    return (
      descricao.includes(search) ||
      tipoAcao.includes(search) ||
      campoAlterado.includes(search)
    );
  }) || [];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Histórico de Lançamentos</h1>
          <p className="text-muted-foreground mt-2">
            Visualize todas as alterações realizadas nos lançamentos financeiros
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Registro de Alterações</CardTitle>
            <CardDescription>
              Histórico completo de criações, edições e exclusões de lançamentos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por descrição, ação ou campo alterado..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableTableHead column="created_at">Data/Hora</SortableTableHead>
                    <SortableTableHead column="tipo_acao">Ação</SortableTableHead>
                    <TableHead>Descrição</TableHead>
                    <SortableTableHead column="campo_alterado">Campo Alterado</SortableTableHead>
                    <TableHead>Valor Anterior</TableHead>
                    <TableHead>Valor Novo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Carregando histórico...
                      </TableCell>
                    </TableRow>
                  ) : historicoFiltrado.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
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
                        <TableCell className="max-w-xs truncate">
                          {item.metadados?.descricao || "-"}
                        </TableCell>
                        <TableCell>{getCampoAlterado(item.campo_alterado)}</TableCell>
                        <TableCell>
                          {formatValor(item.valor_anterior, item.campo_alterado)}
                        </TableCell>
                        <TableCell>
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
