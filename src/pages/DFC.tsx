import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { useState } from "react";

export default function DFC() {
  const [contaSelecionada] = useState('todas');
  
  const saldoTotal = 62450;
  const entradasMesAtual = 84400;
  const saidasMesAtual = 66930;

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const receitasOperacionais = [
    { item: "Vendas de Produtos", valor: 65000 },
    { item: "Prestação de Serviços", valor: 20000 },
    { item: "Total Receitas Operacionais", valor: 85000, isTotal: true }
  ];

  const despesasOperacionais = [
    { item: "Custo dos Materiais Vendidos", valor: -35000 },
    { item: "Comissões sobre Vendas", valor: -4200 },
    { item: "Total Despesas Operacionais", valor: -39200, isTotal: true }
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">DFC</h1>
          <p className="text-muted-foreground">Demonstração do Fluxo de Caixa</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Saldo Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-primary">{formatCurrency(saldoTotal)}</div>
              <Badge variant="outline" className="text-xs mt-1">Todas as contas</Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Entradas do Mês</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-green-600">{formatCurrency(entradasMesAtual)}</div>
              <Badge variant="outline" className="text-xs mt-1">agosto de 2024</Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Saídas do Mês</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-destructive">{formatCurrency(saidasMesAtual)}</div>
              <Badge variant="outline" className="text-xs mt-1">agosto de 2024</Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Resultado do Mês</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-green-600">{formatCurrency(entradasMesAtual - saidasMesAtual)}</div>
              <Badge variant="outline" className="text-xs mt-1">Positivo</Badge>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="dfc" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="dfc">DFC</TabsTrigger>
            <TabsTrigger value="extrato">Extrato</TabsTrigger>
            <TabsTrigger value="planejamento">Planejamento</TabsTrigger>
          </TabsList>

          <TabsContent value="dfc" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Demonstração Detalhada do Fluxo de Caixa</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <FileDown className="h-4 w-4 mr-2" />PDF
                    </Button>
                    <Button variant="outline" size="sm">
                      <FileDown className="h-4 w-4 mr-2" />Excel
                    </Button>
                  </div>
                </div>
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
                    {receitasOperacionais.map((item, index) => (
                      <TableRow key={`receita-${index}`} className={item.isTotal ? "font-semibold bg-muted/50" : ""}>
                        <TableCell>{item.item}</TableCell>
                        <TableCell className={`text-right text-green-600 ${item.isTotal ? "font-bold" : ""}`}>
                          {formatCurrency(item.valor)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {((item.valor / 85000) * 100).toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    ))}
                    {despesasOperacionais.map((item, index) => (
                      <TableRow key={`despesa-${index}`} className={item.isTotal ? "font-semibold bg-muted/50" : ""}>
                        <TableCell>(-) {item.item}</TableCell>
                        <TableCell className={`text-right text-destructive ${item.isTotal ? "font-bold" : ""}`}>
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
          </TabsContent>

          <TabsContent value="extrato">
            <Card>
              <CardHeader>
                <CardTitle>Extrato Bancário</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Funcionalidade de extrato em desenvolvimento...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="planejamento">
            <Card>
              <CardHeader>
                <CardTitle>Planejamento Financeiro</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Funcionalidade de planejamento em desenvolvimento...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
