import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DollarSign, Activity, TrendingUp, TrendingDown, CalendarIcon } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { MultipleSelector, type Option } from "@/components/ui/multiple-selector";
import { useState, useMemo } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useLancamentosFinanceiros } from "@/hooks/use-lancamentos-financeiros";
import { Label } from "@/components/ui/label";

export default function Dashboard() {
  const { lancamentos, loading } = useLancamentosFinanceiros();
  
  const [dashboardPeriodType, setDashboardPeriodType] = useState<'mes' | 'trimestre' | 'ano'>('mes');
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [selectedQuarter, setSelectedQuarter] = useState<string>('Q1');
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());

  // Calcular dados mensais a partir dos lançamentos reais
  const monthlyData = useMemo(() => {
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const anoAtual = new Date().getFullYear();
    
    return meses.map((mes, index) => {
      const lancamentosMes = lancamentos.filter(l => {
        const data = new Date(l.dataEsperada);
        return data.getMonth() === index && data.getFullYear() === anoAtual;
      });

      const faturamento = lancamentosMes
        .filter(l => l.tipo === 'entrada')
        .reduce((acc, l) => acc + l.valor, 0);

      const despesasTotais = lancamentosMes
        .filter(l => l.tipo === 'saida')
        .reduce((acc, l) => acc + l.valor, 0);

      const margemContribuicao = faturamento * 0.45; // 45% do faturamento
      const lucroLiquido = faturamento - despesasTotais;

      return {
        mes,
        faturamento,
        margemContribuicao,
        lucroLiquido,
        despesasTotais
      };
    });
  }, [lancamentos]);

  const columnOptions: Option[] = [
    { value: 'faturamento', label: 'Faturamento' },
    { value: 'margemContribuicao', label: 'Margem de Contribuição' },
    { value: 'lucroLiquido', label: 'Lucro Líquido' },
    { value: 'despesasTotais', label: 'Despesas Totais' },
  ];

  const [selectedColumns, setSelectedColumns] = useState<Option[]>([
    { value: 'faturamento', label: 'Faturamento' },
    { value: 'margemContribuicao', label: 'Margem de Contribuição' },
    { value: 'lucroLiquido', label: 'Lucro Líquido' },
  ]);

  const visibleData = {
    faturamento: selectedColumns.some(col => col.value === 'faturamento'),
    margemContribuicao: selectedColumns.some(col => col.value === 'margemContribuicao'),
    lucroLiquido: selectedColumns.some(col => col.value === 'lucroLiquido'),
    despesasTotais: selectedColumns.some(col => col.value === 'despesasTotais'),
  };

  // Calcular cards do dashboard com base no período selecionado
  const dashboardCards = useMemo(() => {
    const mesAtual = new Date().getMonth();
    const dadosMesAtual = monthlyData[mesAtual];
    const dadosMesAnterior = monthlyData[mesAtual > 0 ? mesAtual - 1 : 11];

    const variacaoFaturamento = dadosMesAnterior.faturamento > 0
      ? ((dadosMesAtual.faturamento - dadosMesAnterior.faturamento) / dadosMesAnterior.faturamento) * 100
      : 0;

    const margemPercentual = dadosMesAtual.faturamento > 0
      ? (dadosMesAtual.margemContribuicao / dadosMesAtual.faturamento) * 100
      : 0;

    const variacaoLucro = dadosMesAnterior.lucroLiquido > 0
      ? ((dadosMesAtual.lucroLiquido - dadosMesAnterior.lucroLiquido) / dadosMesAnterior.lucroLiquido) * 100
      : 0;

    return [
      {
        title: "Faturamento Total",
        value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dadosMesAtual.faturamento),
        change: `${variacaoFaturamento >= 0 ? '+' : ''}${variacaoFaturamento.toFixed(1)}%`,
        changeValue: variacaoFaturamento,
        icon: DollarSign
      },
      {
        title: "Margem de Contribuição",
        value: `${margemPercentual.toFixed(1)}%`,
        change: "",
        changeValue: 0,
        icon: Activity
      },
      {
        title: "Lucro Líquido",
        value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dadosMesAtual.lucroLiquido),
        change: `${variacaoLucro >= 0 ? '+' : ''}${variacaoLucro.toFixed(1)}%`,
        changeValue: variacaoLucro,
        icon: TrendingUp
      }
    ];
  }, [monthlyData]);

  const colors = {
    faturamento: 'hsl(var(--primary))',
    margemContribuicao: 'hsl(var(--accent))',
    lucroLiquido: '#10b981',
    despesasTotais: 'hsl(var(--destructive))'
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard Financeiro</h1>
          <p className="text-muted-foreground">Visão geral do desempenho financeiro</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filtro de Período</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo de Período</label>
                <Select value={dashboardPeriodType} onValueChange={(value: 'mes' | 'trimestre' | 'ano') => setDashboardPeriodType(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mes">Mês</SelectItem>
                    <SelectItem value="trimestre">Trimestre</SelectItem>
                    <SelectItem value="ano">Ano</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {dashboardPeriodType === 'mes' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Selecionar Mês</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !selectedMonth && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedMonth ? format(selectedMonth, "MMMM yyyy") : <span>Escolha o mês</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedMonth}
                        onSelect={(date) => date && setSelectedMonth(date)}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              {dashboardPeriodType === 'trimestre' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Selecionar Trimestre</label>
                  <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha o trimestre" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Q1">Q1 (Jan - Mar)</SelectItem>
                      <SelectItem value="Q2">Q2 (Abr - Jun)</SelectItem>
                      <SelectItem value="Q3">Q3 (Jul - Set)</SelectItem>
                      <SelectItem value="Q4">Q4 (Out - Dez)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {(dashboardPeriodType === 'trimestre' || dashboardPeriodType === 'ano') && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Selecionar Ano</label>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha o ano" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2023">2023</SelectItem>
                      <SelectItem value="2024">2024</SelectItem>
                      <SelectItem value="2025">2025</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-transparent">Aplicar</label>
                <Button className="w-full">Aplicar Filtro</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {dashboardCards.map((card, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <card.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-sm text-muted-foreground">Carregando...</div>
                ) : (
                  <>
                    <div className="text-2xl font-bold">{card.value}</div>
                    {card.change && (
                      <div className="flex items-center gap-1 text-sm">
                        {card.changeValue >= 0 ? (
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-destructive" />
                        )}
                        <span className={card.changeValue >= 0 ? "text-green-600" : "text-destructive"}>
                          {card.change}
                        </span>
                        <span className="text-muted-foreground">vs período anterior</span>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Desempenho Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <Label>Selecionar Indicadores</Label>
              <MultipleSelector
                value={selectedColumns}
                onChange={setSelectedColumns}
                options={columnOptions}
                placeholder="Selecione os indicadores"
                emptyIndicator={
                  <p className="text-center text-sm text-muted-foreground">Nenhum resultado encontrado.</p>
                }
              />
            </div>
            
            <div className="h-96">
              {loading ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Carregando dados...
                </div>
              ) : monthlyData.every(m => m.faturamento === 0) ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Nenhum dado disponível. Comece adicionando lançamentos financeiros.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number) => 
                      new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      }).format(value)
                    }
                  />
                  <Legend />
                  {visibleData.faturamento && (
                    <Bar dataKey="faturamento" name="Faturamento" fill={colors.faturamento} />
                  )}
                  {visibleData.margemContribuicao && (
                    <Bar dataKey="margemContribuicao" name="Margem de Contribuição" fill={colors.margemContribuicao} />
                  )}
                  {visibleData.lucroLiquido && (
                    <Bar dataKey="lucroLiquido" name="Lucro Líquido" fill={colors.lucroLiquido} />
                  )}
                  {visibleData.despesasTotais && (
                    <Bar dataKey="despesasTotais" name="Despesas Totais" fill={colors.despesasTotais} />
                  )}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

      </div>
    </AppLayout>
  );
}
