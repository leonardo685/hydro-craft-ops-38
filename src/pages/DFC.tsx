import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { useState } from "react";
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

export default function DFC() {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const receitasOperacionais = [
    { item: "Receita Bruta", valor: 85000, isTotal: false },
    { item: "Total de Receitas Operacionais", valor: 85000, isTotal: true }
  ];

  const despesasOperacionais = [
    { item: "Custo dos Produtos Vendidos", valor: -34950, isTotal: false },
    { item: "Total de Despesas Operacionais", valor: -34950, isTotal: true }
  ];

  const margemContribuicao = 50050;

  const despesasFixas = [
    { item: "Despesas Administrativas", valor: -12500, isTotal: false },
    { item: "Despesas com Vendas", valor: -8200, isTotal: false },
    { item: "Despesas Gerais", valor: -5100, isTotal: false },
    { item: "Total de Despesas Fixas", valor: -25800, isTotal: true }
  ];

  const lucroOperacional = 24250;

  const investimentos = [
    { item: "Equipamentos e Maquinário", valor: -6200, isTotal: false },
    { item: "Total de Investimentos", valor: -6200, isTotal: true }
  ];

  const jurosAmortizacao = [
    { item: "Juros de Empréstimos", valor: -850, isTotal: false },
    { item: "Amortização de Dívidas", valor: -500, isTotal: false },
    { item: "Total de Juros e Amortização", valor: -1350, isTotal: true }
  ];

  const lucroLiquido = 5200;

  const exportarDFCParaPDF = () => {
    const doc = new jsPDF();
    doc.text('Demonstração do Fluxo de Caixa', 20, 20);
    doc.save('dfc.pdf');
  };

  const exportarDFCParaExcel = () => {
    const ws = XLSX.utils.json_to_sheet([]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DFC");
    XLSX.writeFile(wb, "dfc.xlsx");
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">DFC</h1>
          <p className="text-muted-foreground">Demonstração do Fluxo de Caixa</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Saldo Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-primary">
                {formatCurrency(45800)}
              </div>
              <Badge variant="outline" className="text-xs mt-1">
                Todas as contas
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Entradas do Mês</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-green-600">
                {formatCurrency(85000)}
              </div>
              <Badge variant="outline" className="text-xs mt-1">
                Agosto 2024
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Saídas do Mês</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-destructive">
                {formatCurrency(68500)}
              </div>
              <Badge variant="outline" className="text-xs mt-1">
                Agosto 2024
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Resultado do Mês</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-green-600">
                {formatCurrency(16500)}
              </div>
              <Badge variant="outline" className="text-xs mt-1">
                Positivo
              </Badge>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Demonstração Detalhada do Fluxo de Caixa</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportarDFCParaPDF}
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportarDFCParaExcel}
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  Excel
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Conta</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>% da Receita</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody striped interactive>
                {/* Receitas Operacionais */}
                {receitasOperacionais.map((item, index) => (
                  <TableRow key={`receita-${index}`}>
                    <TableCell className={item.isTotal ? "font-semibold bg-background-200" : ""}>{item.item}</TableCell>
                    <TableCell className={`${item.valor >= 0 ? "text-green-600" : "text-destructive"} ${item.isTotal ? "font-bold bg-background-200" : ""}`}>
                      {formatCurrency(item.valor)}
                    </TableCell>
                    <TableCell className={`text-gray-900 ${item.isTotal ? "bg-background-200" : ""}`}>
                      {((item.valor / 85000) * 100).toFixed(1)}%
                    </TableCell>
                  </TableRow>
                ))}
                
                {/* Despesas Operacionais */}
                {despesasOperacionais.map((item, index) => (
                  <TableRow key={`despesa-${index}`}>
                    <TableCell className={item.isTotal ? "font-semibold bg-background-200" : ""}>(-) {item.item}</TableCell>
                    <TableCell className={`${item.valor >= 0 ? "text-green-600" : "text-destructive"} ${item.isTotal ? "font-bold bg-background-200" : ""}`}>
                      {formatCurrency(item.valor)}
                    </TableCell>
                    <TableCell className={`text-gray-900 ${item.isTotal ? "bg-background-200" : ""}`}>
                      {((item.valor / 85000) * 100).toFixed(1)}%
                    </TableCell>
                  </TableRow>
                ))}

                {/* Margem de Contribuição */}
                <TableRow>
                  <TableCell className="font-semibold bg-background-200">Margem de Contribuição</TableCell>
                  <TableCell className="text-green-600 font-bold bg-background-200">
                    {formatCurrency(margemContribuicao)}
                  </TableCell>
                  <TableCell className="text-gray-900 bg-background-200">
                    {((margemContribuicao / 85000) * 100).toFixed(1)}%
                  </TableCell>
                </TableRow>

                {/* Despesas Fixas */}
                {despesasFixas.map((item, index) => (
                  <TableRow key={`fixa-${index}`}>
                    <TableCell className={item.isTotal ? "font-semibold bg-background-200" : ""}>(-) {item.item}</TableCell>
                    <TableCell className={`${item.valor >= 0 ? "text-green-600" : "text-destructive"} ${item.isTotal ? "font-bold bg-background-200" : ""}`}>
                      {formatCurrency(item.valor)}
                    </TableCell>
                    <TableCell className={`text-gray-900 ${item.isTotal ? "bg-background-200" : ""}`}>
                      {((item.valor / 85000) * 100).toFixed(1)}%
                    </TableCell>
                  </TableRow>
                ))}

                {/* Lucro Operacional */}
                <TableRow>
                  <TableCell className="font-semibold bg-background-200">Lucro Operacional</TableCell>
                  <TableCell className="text-green-600 font-bold bg-background-200">
                    {formatCurrency(lucroOperacional)}
                  </TableCell>
                  <TableCell className="text-gray-900 bg-background-200">
                    {((lucroOperacional / 85000) * 100).toFixed(1)}%
                  </TableCell>
                </TableRow>

                {/* Investimentos */}
                {investimentos.map((item, index) => (
                  <TableRow key={`invest-${index}`}>
                    <TableCell className={item.isTotal ? "font-semibold bg-background-200" : ""}>(-) {item.item}</TableCell>
                    <TableCell className={`${item.valor >= 0 ? "text-green-600" : "text-destructive"} ${item.isTotal ? "font-bold bg-background-200" : ""}`}>
                      {formatCurrency(item.valor)}
                    </TableCell>
                    <TableCell className={`text-gray-900 ${item.isTotal ? "bg-background-200" : ""}`}>
                      {((item.valor / 85000) * 100).toFixed(1)}%
                    </TableCell>
                  </TableRow>
                ))}

                {/* Juros e Amortização */}
                {jurosAmortizacao.map((item, index) => (
                  <TableRow key={`juros-${index}`}>
                    <TableCell className={item.isTotal ? "font-semibold bg-background-200" : ""}>(-) {item.item}</TableCell>
                    <TableCell className={`${item.valor >= 0 ? "text-green-600" : "text-destructive"} ${item.isTotal ? "font-bold bg-background-200" : ""}`}>
                      {formatCurrency(item.valor)}
                    </TableCell>
                    <TableCell className={`text-gray-900 ${item.isTotal ? "bg-background-200" : ""}`}>
                      {((item.valor / 85000) * 100).toFixed(1)}%
                    </TableCell>
                  </TableRow>
                ))}

                {/* Lucro Líquido */}
                <TableRow>
                  <TableCell className="font-semibold bg-background-200">Lucro Líquido</TableCell>
                  <TableCell className="text-green-600 font-bold bg-background-200">
                    {formatCurrency(lucroLiquido)}
                  </TableCell>
                  <TableCell className="text-gray-900 bg-background-200">
                    {((lucroLiquido / 85000) * 100).toFixed(1)}%
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
