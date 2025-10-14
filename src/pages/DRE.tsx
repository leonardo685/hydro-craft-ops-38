import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function DRE() {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getDreRowStyle = (tipo: string) => {
    if (tipo === 'total' || tipo === 'subtotal') {
      return "font-semibold bg-background-200";
    }
    return "";
  };

  const getDreValueStyle = (valor: number, tipo: string) => {
    if (tipo === 'total' || tipo === 'subtotal') {
      return "font-bold";
    }
    if (valor < 0) {
      return "text-destructive";
    }
    if (valor > 0 && tipo === 'receita') {
      return "text-green-600";
    }
    return "";
  };

  const dreData = [
    { conta: "Receita Bruta de Vendas", valor: 85000, tipo: "receita" },
    { conta: "(-) Impostos sobre Vendas", valor: -12750, tipo: "deducao" },
    { conta: "Receita Líquida de Vendas", valor: 72250, tipo: "subtotal" },
    { conta: "(-) Custo das Mercadorias Vendidas (CMV)", valor: -34950, tipo: "custo" },
    { conta: "Lucro Bruto", valor: 37300, tipo: "subtotal" },
    { conta: "(-) Despesas Operacionais", valor: -25800, tipo: "despesa" },
    { conta: "Despesas Administrativas", valor: -12500, tipo: "detalhe" },
    { conta: "Despesas com Vendas", valor: -8200, tipo: "detalhe" },
    { conta: "Despesas Gerais", valor: -5100, tipo: "detalhe" },
    { conta: "EBITDA", valor: 11500, tipo: "subtotal" },
    { conta: "(-) Depreciação e Amortização", valor: -4450, tipo: "despesa" },
    { conta: "EBIT (Lucro Operacional)", valor: 7050, tipo: "subtotal" },
    { conta: "(-) Despesas Financeiras", valor: -1350, tipo: "despesa" },
    { conta: "(+) Receitas Financeiras", valor: 500, tipo: "receita" },
    { conta: "Resultado Antes dos Tributos", valor: 6200, tipo: "subtotal" },
    { conta: "(-) Imposto de Renda e CSLL", valor: -1000, tipo: "imposto" },
    { conta: "Lucro Líquido do Exercício", valor: 5200, tipo: "total" }
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">DRE</h1>
          <p className="text-muted-foreground">Demonstração do Resultado do Exercício</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
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
            <table className="w-full overflow-auto min-w-[248px] p-6 rounded-lg relative border border-gray-alpha-400 bg-background-100">
              <thead className="border-b border-gray-alpha-400">
                <tr>
                  <th className="h-10 px-2 align-middle font-medium text-left">Conta</th>
                  <th className="h-10 px-2 align-middle font-medium text-left last:text-right">Valor</th>
                  <th className="h-10 px-2 align-middle font-medium text-left last:text-right">% da Receita</th>
                </tr>
              </thead>
              <tbody className="table-row h-3" />
              <tbody className="[&_tr:where(:nth-child(odd))]:bg-background-200 [&_tr:hover]:bg-gray-100">
                {dreData.map((item, index) => (
                  <tr key={index} className="[&_td:first-child]:rounded-l-[4px] [&_td:last-child]:rounded-r-[4px] transition-colors">
                    <td className={`px-2 py-2.5 align-middle ${getDreRowStyle(item.tipo)}`}>{item.conta}</td>
                    <td className={`px-2 py-2.5 align-middle ${getDreValueStyle(item.valor, item.tipo)} ${getDreRowStyle(item.tipo)}`}>
                      {formatCurrency(item.valor)}
                    </td>
                    <td className={`px-2 py-2.5 align-middle last:text-right text-gray-900 ${getDreRowStyle(item.tipo)}`}>
                      {((item.valor / 85000) * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
