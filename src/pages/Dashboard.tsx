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

    const variacaoImpostos = impostosPagosMes > 0 ? 0 : 0; // Sem comparação por enquanto
    const variacaoInvestimentos = investimentosMes > 0 ? 0 : 0; // Sem comparação por enquanto

    return [
      {
        title: "Saldo Atual",
        value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(saldoAtual),
        change: "",
        changeValue: 0,
        icon: DollarSign
      },
      {
        title: "Faturamento Total",
        value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dadosMesAtual.faturamento),
        change: `${variacaoFaturamento >= 0 ? '+' : ''}${variacaoFaturamento.toFixed(1)}%`,
        changeValue: variacaoFaturamento,
        icon: TrendingUp
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
      },
      {
        title: "Impostos Pagos (Mês)",
        value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(impostosPagosMes),
        change: "",
        changeValue: variacaoImpostos,
        icon: Activity
      },
      {
        title: "Investimentos (Mês)",
        value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(investimentosMes),
        change: "",
        changeValue: variacaoInvestimentos,
        icon: Activity
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
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <card.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading || loadingContas ? (
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
