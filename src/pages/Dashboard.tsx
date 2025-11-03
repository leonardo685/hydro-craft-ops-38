import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DollarSign, Activity, TrendingUp, TrendingDown, CalendarIcon } from "lucide-react";
import { AreaChart } from "@/components/ui/area-chart";
import { MultipleSelector, type Option } from "@/components/ui/multiple-selector";
import { useState, useMemo } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useLancamentosFinanceiros } from "@/hooks/use-lancamentos-financeiros";
import { useContasBancarias } from "@/hooks/use-contas-bancarias";
import { useCategoriasFinanceiras } from "@/hooks/use-categorias-financeiras";
import { Label } from "@/components/ui/label";
import { LineChart, Line, Tooltip, ResponsiveContainer } from 'recharts';

// Custom Tooltip for mini charts
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-border bg-background/95 p-2 text-sm shadow-md backdrop-blur-sm">
        <p className="text-foreground">{`Valor: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payload[0].value)}`}</p>
      </div>
    );
  }
  return null;
};

// StatCard Component
interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  changeValue?: number;
  icon: React.ElementType;
  chartData: Array<{ month: string; value: number }>;
  loading?: boolean;
}

function StatCard({ title, value, change, changeValue = 0, icon: Icon, chartData, loading }: StatCardProps) {
  const chartColor = changeValue >= 0 ? 'hsl(var(--primary))' : 'hsl(var(--destructive))';

  return (
    <div
      className="group rounded-2xl border border-border/50
                 bg-card/40 p-5 shadow-lg
                 transition-all duration-300 ease-in-out
                 hover:border-border hover:bg-card/60
                 hover:-translate-y-1 cursor-pointer"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="mt-4 flex items-end justify-between">
        {loading ? (
          <div className="text-sm text-muted-foreground">Carregando...</div>
        ) : (
          <>
            <div className="flex flex-col">
              <p className="text-2xl font-bold tracking-tighter text-foreground">{value}</p>
              {change && (
                <div className="flex items-center gap-1 mt-1">
                  {changeValue >= 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-600" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-destructive" />
                  )}
                  <span className={`text-xs ${changeValue >= 0 ? "text-green-600" : "text-destructive"}`}>
                    {change}
                  </span>
                </div>
              )}
            </div>
            <div className="h-12 w-28">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <defs>
                    <linearGradient id={`gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={chartColor} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{
                      stroke: 'hsl(var(--border))',
                      strokeWidth: 1,
                      strokeDasharray: '3 3',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={chartColor}
                    strokeWidth={2}
                    dot={false}
                    fillOpacity={1}
                    fill={`url(#gradient-${title})`}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { lancamentos, loading } = useLancamentosFinanceiros();
  const { contas, loading: loadingContas } = useContasBancarias();
  const { categorias } = useCategoriasFinanceiras();
  
  const [dashboardPeriodType, setDashboardPeriodType] = useState<'mes' | 'trimestre' | 'ano'>('mes');
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [selectedQuarter, setSelectedQuarter] = useState<string>('Q1');
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());

  // Calcular dados mensais a partir dos lançamentos reais - últimos 12 meses
  const monthlyData = useMemo(() => {
    const hoje = new Date();
    const dados = [];
    
    for (let i = 11; i >= 0; i--) {
      const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const mes = data.toLocaleDateString('pt-BR', { month: 'short' });
      const ano = data.getFullYear();
      const mesIndex = data.getMonth();
      
      const lancamentosMes = lancamentos.filter(l => {
        const dataLanc = new Date(l.dataEsperada);
        return dataLanc.getMonth() === mesIndex && dataLanc.getFullYear() === ano;
      });

      // Receitas Operacionais (categoria 1)
      const receitasOperacionais = lancamentosMes
        .filter(l => l.tipo === 'entrada' && l.categoriaId && categorias.find(c => c.id === l.categoriaId)?.codigo?.startsWith('1'))
        .reduce((acc, l) => acc + l.valor, 0);

      // Custos Variáveis (categoria 2)
      const custosVariaveis = lancamentosMes
        .filter(l => l.tipo === 'saida' && l.categoriaId && categorias.find(c => c.id === l.categoriaId)?.codigo?.startsWith('2'))
        .reduce((acc, l) => acc + l.valor, 0);

      // Despesas Fixas (categoria 3)
      const despesasFixas = lancamentosMes
        .filter(l => l.tipo === 'saida' && l.categoriaId && categorias.find(c => c.id === l.categoriaId)?.codigo?.startsWith('3'))
        .reduce((acc, l) => acc + l.valor, 0);

      // Investimentos (categoria 4)
      const investimentos = lancamentosMes
        .filter(l => l.tipo === 'saida' && l.categoriaId && categorias.find(c => c.id === l.categoriaId)?.codigo?.startsWith('4'))
        .reduce((acc, l) => acc + l.valor, 0);

      // Receitas Não Operacionais (categoria 5)
      const receitasNaoOperacionais = lancamentosMes
        .filter(l => l.tipo === 'entrada' && l.categoriaId && categorias.find(c => c.id === l.categoriaId)?.codigo?.startsWith('5'))
        .reduce((acc, l) => acc + l.valor, 0);

      // Saídas Não Operacionais (categoria 6)
      const saidasNaoOperacionais = lancamentosMes
        .filter(l => l.tipo === 'saida' && l.categoriaId && categorias.find(c => c.id === l.categoriaId)?.codigo?.startsWith('6'))
        .reduce((acc, l) => acc + l.valor, 0);

      const totalReceitas = receitasOperacionais + receitasNaoOperacionais;
      const margemContribuicao = totalReceitas - custosVariaveis;
      const lucroLiquido = margemContribuicao - despesasFixas - investimentos - saidasNaoOperacionais;

      dados.push({
        mes: `${mes}/${ano.toString().slice(2)}`,
        faturamento: receitasOperacionais,
        custosVariaveis,
        despesasFixas,
        investimentos,
        margemContribuicao,
        lucroLiquido,
      });
    }
    
    return dados;
  }, [lancamentos, categorias]);

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

  // Calcular saldo atual somando todas as contas bancárias
  const saldoAtual = useMemo(() => {
    return contas.reduce((acc, conta) => {
      // Somar saldo inicial
      let saldo = conta.saldo_inicial;
      
      // Somar/subtrair lançamentos da conta
      lancamentos.forEach(lanc => {
        if (lanc.contaBancaria === conta.nome && lanc.pago) {
          if (lanc.tipo === 'entrada') {
            saldo += lanc.valor;
          } else {
            saldo -= lanc.valor;
          }
        }
      });
      
      return acc + saldo;
    }, 0);
  }, [contas, lancamentos]);

  // Calcular impostos pagos do mês atual
  const impostosPagosMes = useMemo(() => {
    const hoje = new Date();
    const mesAtual = hoje.getMonth();
    const anoAtual = hoje.getFullYear();
    
    return lancamentos
      .filter(l => {
        const data = new Date(l.dataEsperada);
        return data.getMonth() === mesAtual 
          && data.getFullYear() === anoAtual
          && l.tipo === 'saida'
          && l.pago
          && l.descricao?.toLowerCase().includes('imposto');
      })
      .reduce((acc, l) => acc + l.valor, 0);
  }, [lancamentos]);

  // Calcular investimentos do mês atual (categoria 4)
  const investimentosMes = useMemo(() => {
    const hoje = new Date();
    const mesAtual = hoje.getMonth();
    const anoAtual = hoje.getFullYear();
    
    return lancamentos
      .filter(l => {
        const data = new Date(l.dataEsperada);
        return data.getMonth() === mesAtual 
          && data.getFullYear() === anoAtual
          && l.tipo === 'saida'
          && l.categoriaId 
          && categorias.find(c => c.id === l.categoriaId)?.codigo?.startsWith('4');
      })
      .reduce((acc, l) => acc + l.valor, 0);
  }, [lancamentos, categorias]);

  // Calcular cards do dashboard com base no período selecionado
  const dashboardCards = useMemo(() => {
    const dadosMesAtual = monthlyData[monthlyData.length - 1];
    const dadosMesAnterior = monthlyData[monthlyData.length - 2];

    const variacaoFaturamento = dadosMesAnterior?.faturamento > 0
      ? ((dadosMesAtual.faturamento - dadosMesAnterior.faturamento) / dadosMesAnterior.faturamento) * 100
      : 0;

    const margemPercentual = dadosMesAtual.faturamento > 0
      ? (dadosMesAtual.margemContribuicao / dadosMesAtual.faturamento) * 100
      : 0;

    const variacaoLucro = dadosMesAnterior?.lucroLiquido > 0
      ? ((dadosMesAtual.lucroLiquido - dadosMesAnterior.lucroLiquido) / dadosMesAnterior.lucroLiquido) * 100
      : 0;

    const variacaoImpostos = impostosPagosMes > 0 ? 0 : 0;
    const variacaoInvestimentos = investimentosMes > 0 ? 0 : 0;

    // Preparar dados dos mini gráficos (últimos 7 meses)
    const last7Months = monthlyData.slice(-7);
    
    return [
      {
        title: "Saldo Atual",
        value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(saldoAtual),
        change: "",
        changeValue: 0,
        icon: DollarSign,
        chartData: last7Months.map(m => ({ month: m.mes, value: saldoAtual })) // Simplificado
      },
      {
        title: "Faturamento Total",
        value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dadosMesAtual.faturamento),
        change: `${variacaoFaturamento >= 0 ? '+' : ''}${variacaoFaturamento.toFixed(1)}%`,
        changeValue: variacaoFaturamento,
        icon: TrendingUp,
        chartData: last7Months.map(m => ({ month: m.mes, value: m.faturamento }))
      },
      {
        title: "Margem de Contribuição",
        value: `${margemPercentual.toFixed(1)}%`,
        change: "",
        changeValue: 0,
        icon: Activity,
        chartData: last7Months.map(m => ({ month: m.mes, value: m.margemContribuicao }))
      },
      {
        title: "Lucro Líquido",
        value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dadosMesAtual.lucroLiquido),
        change: `${variacaoLucro >= 0 ? '+' : ''}${variacaoLucro.toFixed(1)}%`,
        changeValue: variacaoLucro,
        icon: TrendingUp,
        chartData: last7Months.map(m => ({ month: m.mes, value: m.lucroLiquido }))
      },
      {
        title: "Impostos Pagos (Mês)",
        value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(impostosPagosMes),
        change: "",
        changeValue: variacaoImpostos,
        icon: Activity,
        chartData: last7Months.map(m => ({ month: m.mes, value: impostosPagosMes })) // Simplificado
      },
      {
        title: "Investimentos (Mês)",
        value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(investimentosMes),
        change: "",
        changeValue: variacaoInvestimentos,
        icon: Activity,
        chartData: last7Months.map(m => ({ month: m.mes, value: m.investimentos }))
      }
    ];
  }, [monthlyData, saldoAtual, impostosPagosMes, investimentosMes]);

  const colors = {
    faturamento: 'hsl(var(--primary))',
    custosVariaveis: 'hsl(var(--destructive))',
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dashboardCards.map((card, index) => (
            <StatCard
              key={index}
              title={card.title}
              value={card.value}
              change={card.change}
              changeValue={card.changeValue}
              icon={card.icon}
              chartData={card.chartData}
              loading={loading || loadingContas}
            />
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Faturamento - Últimos 12 Meses</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-80 text-muted-foreground">
                Carregando dados...
              </div>
            ) : monthlyData.every(m => m.faturamento === 0) ? (
              <div className="flex items-center justify-center h-80 text-muted-foreground">
                Nenhum dado disponível. Comece adicionando lançamentos financeiros.
              </div>
            ) : (
              <AreaChart
                data={monthlyData}
                categories={["faturamento"]}
                index="mes"
                colors={[colors.faturamento]}
                className="h-80"
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Custos Variáveis - Últimos 12 Meses</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-80 text-muted-foreground">
                Carregando dados...
              </div>
            ) : monthlyData.every(m => m.custosVariaveis === 0) ? (
              <div className="flex items-center justify-center h-80 text-muted-foreground">
                Nenhum dado disponível. Comece adicionando lançamentos financeiros.
              </div>
            ) : (
              <AreaChart
                data={monthlyData}
                categories={["custosVariaveis"]}
                index="mes"
                colors={[colors.custosVariaveis]}
                className="h-80"
              />
            )}
          </CardContent>
        </Card>

      </div>
    </AppLayout>
  );
}
