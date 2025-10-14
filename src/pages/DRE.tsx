import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

export default function DRE() {
  const [filtrosDRE, setFiltrosDRE] = useState({
    ano: '2024',
    mes: '08'
  });

  const dreData = [
    { conta: "Receita Bruta", valor: 85000, tipo: "receita" },
    { conta: "(-) Impostos sobre Vendas", valor: -12750, tipo: "deducao" },
    { conta: "Receita Líquida", valor: 72250, tipo: "subtotal" },
    { conta: "(-) CMV - Custo dos Materiais Vendidos", valor: -35000, tipo: "custo" },
    { conta: "Lucro Bruto", valor: 37250, tipo: "subtotal" },
    { conta: "(-) Despesas Operacionais", valor: -18500, tipo: "despesa" },
    { conta: "(-) Despesas Administrativas", valor: -8200, tipo: "despesa" },
    { conta: "(-) Despesas Comerciais", valor: -3500, tipo: "despesa" },
    { conta: "EBITDA", valor: 7050, tipo: "resultado" },
    { conta: "(-) Depreciação", valor: -1200, tipo: "deducao" },
    { conta: "EBIT", valor: 5850, tipo: "resultado" },
    { conta: "(-) Despesas Financeiras", valor: -850, tipo: "despesa" },
    { conta: "(+) Receitas Financeiras", valor: 200, tipo: "receita" },
    { conta: "Lucro Líquido", valor: 5200, tipo: "final" },
  ];

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
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(72250)}
              </div>
              <Badge variant="outline" className="text-xs mt-1">
                Período Atual
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">EBITDA</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(7050)}
              </div>
              <Badge variant="outline" className="text-xs mt-1">
                Margem: 9,8%
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Lucro Líquido</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {formatCurrency(5200)}
              </div>
              <Badge variant="outline" className="text-xs mt-1">
                Margem: 7,2%
              </Badge>
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
                {dreData.map((item, index) => (
                  <TableRow key={index} className={getDreRowStyle(item.tipo)}>
                    <TableCell>{item.conta}</TableCell>
                    <TableCell 
                      className={`text-right ${getDreValueStyle(item.valor, item.tipo)}`}
                    >
                      {formatCurrency(item.valor)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {((item.valor / 85000) * 100).toFixed(1)}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
