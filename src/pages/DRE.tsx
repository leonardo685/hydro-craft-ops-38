import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useMemo } from "react";
import { useLancamentosFinanceiros } from "@/hooks/use-lancamentos-financeiros";
import { useCategoriasFinanceiras } from "@/hooks/use-categorias-financeiras";

export default function DRE() {
  const { lancamentos, loading } = useLancamentosFinanceiros();
  const { getNomeCategoriaMae } = useCategoriasFinanceiras();
  
  const [filtrosDRE, setFiltrosDRE] = useState({
    ano: new Date().getFullYear().toString(),
    mes: (new Date().getMonth() + 1).toString().padStart(2, '0')
  });

  // Calcular DRE dinamicamente a partir dos lançamentos
  const dreData = useMemo(() => {
    // Filtrar lançamentos pelo ano e mês selecionados usando data de emissão
    // INDEPENDENTE se foi pago ou não
    const lancamentosFiltrados = lancamentos.filter(l => {
      const data = new Date(l.dataEmissao);
      const ano = data.getFullYear().toString();
      const mes = (data.getMonth() + 1).toString().padStart(2, '0');
      return ano === filtrosDRE.ano && mes === filtrosDRE.mes;
    });

    const receitaBruta = lancamentosFiltrados
      .filter(l => l.tipo === 'entrada')
      .reduce((acc, l) => acc + l.valor, 0);

    const despesasTotais = lancamentosFiltrados
      .filter(l => l.tipo === 'saida')
      .reduce((acc, l) => acc + l.valor, 0);

    // Simplificação: assumir 15% de impostos sobre vendas
    const impostos = receitaBruta * 0.15;
    const receitaLiquida = receitaBruta - impostos;

    // Simplificação: assumir 40% como CMV
    const cmv = receitaBruta * 0.40;
    const lucroBruto = receitaLiquida - cmv;

    const ebitda = lucroBruto - despesasTotais;
    const depreciacao = receitaBruta * 0.02; // 2% de depreciação
    const ebit = ebitda - depreciacao;
    const lucroLiquido = ebit;

    return [
      { conta: "Receita Bruta", valor: receitaBruta, tipo: "receita" },
      { conta: "(-) Impostos sobre Vendas", valor: -impostos, tipo: "deducao" },
      { conta: "Receita Líquida", valor: receitaLiquida, tipo: "subtotal" },
      { conta: "(-) CMV - Custo dos Materiais Vendidos", valor: -cmv, tipo: "custo" },
      { conta: "Lucro Bruto", valor: lucroBruto, tipo: "subtotal" },
      { conta: "(-) Despesas Operacionais", valor: -despesasTotais, tipo: "despesa" },
      { conta: "EBITDA", valor: ebitda, tipo: "resultado" },
      { conta: "(-) Depreciação", valor: -depreciacao, tipo: "deducao" },
      { conta: "EBIT", valor: ebit, tipo: "resultado" },
      { conta: "Lucro Líquido", valor: lucroLiquido, tipo: "final" },
    ];
  }, [lancamentos, filtrosDRE]);

  const receitaLiquida = dreData.find(d => d.conta === "Receita Líquida")?.valor || 0;
  const ebitda = dreData.find(d => d.conta === "EBITDA")?.valor || 0;
  const lucroLiquido = dreData.find(d => d.conta === "Lucro Líquido")?.valor || 0;
  const receitaBruta = dreData.find(d => d.conta === "Receita Bruta")?.valor || 0;

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    });
  };

  const getDreRowStyle = (tipo: string) => {
    switch (tipo) {
      case 'subtotal':
      case 'resultado':
        return "font-semibold bg-muted/50";
      case 'final':
        return "font-bold bg-primary/10 text-primary";
      default:
        return "";
    }
  };

  const getDreValueStyle = (value: number, tipo: string) => {
    if (tipo === 'final') return "text-primary font-bold";
    if (value < 0) return "text-destructive";
    if (tipo === 'receita') return "text-green-600";
    return "";
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">DRE</h1>
          <p className="text-muted-foreground">Demonstração do Resultado do Exercício</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Ano</label>
                <Select value={filtrosDRE.ano} onValueChange={(value) => setFiltrosDRE({ ...filtrosDRE, ano: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2023">2023</SelectItem>
                    <SelectItem value="2024">2024</SelectItem>
                    <SelectItem value="2025">2025</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Mês</label>
                <Select value={filtrosDRE.mes} onValueChange={(value) => setFiltrosDRE({ ...filtrosDRE, mes: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="01">Janeiro</SelectItem>
                    <SelectItem value="02">Fevereiro</SelectItem>
                    <SelectItem value="03">Março</SelectItem>
                    <SelectItem value="04">Abril</SelectItem>
                    <SelectItem value="05">Maio</SelectItem>
                    <SelectItem value="06">Junho</SelectItem>
                    <SelectItem value="07">Julho</SelectItem>
                    <SelectItem value="08">Agosto</SelectItem>
                    <SelectItem value="09">Setembro</SelectItem>
                    <SelectItem value="10">Outubro</SelectItem>
                    <SelectItem value="11">Novembro</SelectItem>
                    <SelectItem value="12">Dezembro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Receita Líquida</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-sm text-muted-foreground">Carregando...</div>
              ) : (
                <>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(receitaLiquida)}
                  </div>
                  <Badge variant="outline" className="text-xs mt-1">
                    {filtrosDRE.mes}/{filtrosDRE.ano}
                  </Badge>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">EBITDA</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-sm text-muted-foreground">Carregando...</div>
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {formatCurrency(ebitda)}
                  </div>
                  <Badge variant="outline" className="text-xs mt-1">
                    Margem: {receitaBruta > 0 ? ((ebitda / receitaBruta) * 100).toFixed(1) : 0}%
                  </Badge>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Lucro Líquido</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-sm text-muted-foreground">Carregando...</div>
              ) : (
                <>
                  <div className="text-2xl font-bold text-primary">
                    {formatCurrency(lucroLiquido)}
                  </div>
                  <Badge variant="outline" className="text-xs mt-1">
                    Margem: {receitaBruta > 0 ? ((lucroLiquido / receitaBruta) * 100).toFixed(1) : 0}%
                  </Badge>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Demonstração Detalhada do Resultado do Exercício</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Conta</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">% da Receita</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      Carregando dados...
                    </TableCell>
                  </TableRow>
                ) : dreData.length === 0 || receitaBruta === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      Nenhum dado financeiro para o período selecionado. Comece adicionando lançamentos financeiros.
                    </TableCell>
                  </TableRow>
                ) : (
                  dreData.map((item, index) => (
                    <TableRow key={index} className={getDreRowStyle(item.tipo)}>
                      <TableCell>{item.conta}</TableCell>
                      <TableCell 
                        className={`text-right ${getDreValueStyle(item.valor, item.tipo)}`}
                      >
                        {formatCurrency(item.valor)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {receitaBruta > 0 ? ((item.valor / receitaBruta) * 100).toFixed(1) : 0}%
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
