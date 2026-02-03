import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DollarSign, Activity, TrendingUp, TrendingDown, CalendarIcon } from "lucide-react";
import { AreaChart } from "@/components/ui/area-chart";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/pie-chart";
import { MultipleSelector, type Option } from "@/components/ui/multiple-selector";
import { useState, useMemo } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useLancamentosFinanceiros } from "@/hooks/use-lancamentos-financeiros";
import { useContasBancarias } from "@/hooks/use-contas-bancarias";
import { useCategoriasFinanceiras } from "@/hooks/use-categorias-financeiras";
import { Label } from "@/components/ui/label";
import { LineChart, Line, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LabelList } from 'recharts';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useEmpresa } from "@/contexts/EmpresaContext";
import { FailureReasonChart } from "@/components/FailureReasonChart";

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
  // Detectar se o valor principal é negativo verificando a string
  const isNegativeValue = value.includes('-');
  
  // Determinar cor baseado no valor negativo OU na variação
  const isNegative = isNegativeValue || changeValue < 0;
  const isPositive = !isNegativeValue && changeValue >= 0;
  
  // Cores neon para positivo/negativo
  const chartColor = isNegative ? '#ef4444' : '#10b981'; // vermelho/verde neon
  const valueColor = isNegativeValue 
    ? 'text-red-500' 
    : isPositive && changeValue > 0 
      ? 'text-green-500' 
      : 'text-foreground';

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
              <p className={`text-2xl font-bold tracking-tighter ${valueColor}`}>{value}</p>
              {change && (
                <div className="flex items-center gap-1 mt-1">
                  {changeValue >= 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-500" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-500" />
                  )}
                  <span className={`text-xs ${changeValue >= 0 ? "text-green-500" : "text-red-500"}`}>
                    {change}
                  </span>
                </div>
              )}
            </div>
            <div className="h-12 w-28">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <defs>
                    <linearGradient id={`gradient-${title.replace(/\s/g, '-')}`} x1="0" y1="0" x2="0" y2="1">
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
                    fill={`url(#gradient-${title.replace(/\s/g, '-')})`}
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
  const { t } = useLanguage();
  const { empresaAtual } = useEmpresa();
  
  const { data: orcamentos = [], isLoading: loadingOrcamentos } = useQuery({
    queryKey: ['orcamentos', empresaAtual?.id],
    queryFn: async () => {
      if (!empresaAtual?.id) return [];
      
      const { data, error } = await supabase
        .from('orcamentos')
        .select('*')
        .eq('empresa_id', empresaAtual.id)
        .order('data_criacao', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!empresaAtual?.id
  });
  
  const [dashboardPeriodType, setDashboardPeriodType] = useState<'mes' | 'trimestre' | 'ano'>('mes');
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [selectedQuarter, setSelectedQuarter] = useState<string>('Q1');
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [showFaturamentoModal, setShowFaturamentoModal] = useState(false);

  // Helper: Filtrar lançamentos por período selecionado
  const getLancamentosFiltrados = useMemo(() => {
    return lancamentos.filter(l => {
      // Mesma lógica do DRE: híbrida de competência
      const ehRecorrencia = !!l.frequenciaRepeticao;
      const dataReferencia = ehRecorrencia ? l.dataEsperada : l.dataEmissao;
      
      // Validar se a data de referência existe
      if (!dataReferencia) return false;
      
      const dataLanc = new Date(dataReferencia);
      
      if (dashboardPeriodType === 'mes') {
        return dataLanc.getMonth() === selectedMonth.getMonth() 
          && dataLanc.getFullYear() === selectedMonth.getFullYear();
      } else if (dashboardPeriodType === 'trimestre') {
        const ano = parseInt(selectedYear);
        const quarterMonths = {
          'Q1': [0, 1, 2],
          'Q2': [3, 4, 5],
          'Q3': [6, 7, 8],
          'Q4': [9, 10, 11]
        };
        return quarterMonths[selectedQuarter as keyof typeof quarterMonths].includes(dataLanc.getMonth())
          && dataLanc.getFullYear() === ano;
      } else { // ano
        return dataLanc.getFullYear() === parseInt(selectedYear);
      }
    });
  }, [lancamentos, dashboardPeriodType, selectedMonth, selectedQuarter, selectedYear]);

  // Helper: Obter cor dinâmica por categoria
  const getCorCategoria = (categoria: any, index: number): string => {
    // Se já tem cor definida no banco e não é null, usar ela
    if (categoria.cor) return categoria.cor;
    
    // Paletas de cores por tipo de categoria
    const paletaReceitas = [
      '#065f46', // verde escuro
      '#047857',
      '#059669',
      '#10b981', // verde médio
      '#34d399',
      '#6ee7b7'  // verde claro
    ];
    
    const paletaDespesas = [
      '#991b1b', // vermelho escuro
      '#dc2626',
      '#ef4444', // vermelho médio
      '#f87171',
      '#fca5a5',
      '#fecaca'  // vermelho claro
    ];
    
    const paletaDespesasFixas = [
      '#ea580c', // laranja escuro
      '#f97316',
      '#fb923c',
      '#fdba74',
      '#fed7aa'
    ];
    
    const paletaInvestimentos = [
      '#ca8a04', // amarelo escuro
      '#eab308',
      '#facc15',
      '#fde047',
      '#fef08a'
    ];
    
    // Identificar tipo pela categoria
    const codigo = categoria.codigo || '';
    if (codigo.startsWith('1')) { // Receitas
      return paletaReceitas[index % paletaReceitas.length];
    } else if (codigo.startsWith('2')) { // Custos Variáveis
      return paletaDespesas[index % paletaDespesas.length];
    } else if (codigo.startsWith('3')) { // Despesas Fixas
      return paletaDespesasFixas[index % paletaDespesasFixas.length];
    } else if (codigo.startsWith('4')) { // Investimentos
      return paletaInvestimentos[index % paletaInvestimentos.length];
    }
    
    // Fallback para cores neutras
    return ['#64748b', '#94a3b8', '#cbd5e1'][index % 3];
  };

  // Helper: Obter label do período selecionado
  const getPeriodoLabel = (): string => {
    if (dashboardPeriodType === 'mes') {
      return selectedMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    } else if (dashboardPeriodType === 'trimestre') {
      return `${selectedQuarter}/${selectedYear}`;
    } else {
      return selectedYear;
    }
  };

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

  // Calcular impostos pagos do período filtrado
  const impostosPagosPeriodo = useMemo(() => {
    return getLancamentosFiltrados
      .filter(l => 
        l.tipo === 'saida'
        && l.pago
        && l.descricao?.toLowerCase().includes('imposto')
      )
      .reduce((acc, l) => acc + l.valor, 0);
  }, [getLancamentosFiltrados]);

  // Calcular investimentos do período filtrado (categoria 4)
  const investimentosPeriodo = useMemo(() => {
    return getLancamentosFiltrados
      .filter(l => 
        l.tipo === 'saida'
        && l.categoriaId 
        && categorias.find(c => c.id === l.categoriaId)?.codigo?.startsWith('4')
      )
      .reduce((acc, l) => acc + l.valor, 0);
  }, [getLancamentosFiltrados, categorias]);

  // Filtrar receitas operacionais no período usando data_emissao
  const receitasOperacionaisPeriodo = useMemo(() => {
    // Encontrar categoria "Receitas Operacionais" (código 1)
    const categoriaReceitasOperacionais = categorias.find(c => c.tipo === 'mae' && c.codigo === '1');
    const categoriasReceitasFilhas = categorias.filter(c => c.tipo === 'filha' && c.categoriaMaeId === categoriaReceitasOperacionais?.id);
    const idsReceitasOperacionais = [
      categoriaReceitasOperacionais?.id,
      ...categoriasReceitasFilhas.map(c => c.id)
    ].filter(Boolean);
    
    // Filtrar lançamentos de entrada (receitas) da categoria 1
    return getLancamentosFiltrados.filter(l => 
      l.tipo === 'entrada' 
      && l.categoriaId 
      && idsReceitasOperacionais.includes(l.categoriaId)
    );
  }, [getLancamentosFiltrados, categorias]);

  // Calcular cards do dashboard com base no período selecionado
  const dashboardCards = useMemo(() => {
    // Receitas Operacionais do período filtrado (APENAS categoria 1 - igual ao DRE)
    const categoriaReceitasOperacionais = categorias.find(c => c.tipo === 'mae' && c.codigo === '1');
    const categoriasReceitasFilhas = categorias.filter(c => c.tipo === 'filha' && c.categoriaMaeId === categoriaReceitasOperacionais?.id);
    const idsReceitasOperacionais = categoriasReceitasFilhas.map(c => c.id);
    
    const receitasPeriodo = getLancamentosFiltrados
      .filter(l => l.tipo === 'entrada' && l.categoriaId && idsReceitasOperacionais.includes(l.categoriaId))
      .reduce((acc, l) => acc + l.valor, 0);
    
    // Custos Variáveis do período filtrado (categoria 2)
    const custosVariaveisPeriodo = getLancamentosFiltrados
      .filter(l => l.tipo === 'saida' && l.categoriaId && categorias.find(c => c.id === l.categoriaId)?.codigo?.startsWith('2'))
      .reduce((acc, l) => acc + l.valor, 0);
    
    // Despesas Fixas do período filtrado (categoria 3)
    const despesasFixasPeriodo = getLancamentosFiltrados
      .filter(l => l.tipo === 'saida' && l.categoriaId && categorias.find(c => c.id === l.categoriaId)?.codigo?.startsWith('3'))
      .reduce((acc, l) => acc + l.valor, 0);
    
    // Margem de Contribuição
    const margemContribuicao = receitasPeriodo - custosVariaveisPeriodo;
    const margemPercentual = receitasPeriodo > 0 ? (margemContribuicao / receitasPeriodo) * 100 : 0;
    
    // Lucro Líquido
    const lucroLiquido = margemContribuicao - despesasFixasPeriodo - investimentosPeriodo;
    
    // Preparar dados dos mini gráficos (últimos 7 meses)
    const last7Months = monthlyData.slice(-7);
    
    return [
      {
        title: t('dashboard.currentBalance'),
        value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(saldoAtual),
        change: "",
        changeValue: 0,
        icon: DollarSign,
        chartData: last7Months.map(m => ({ month: m.mes, value: saldoAtual }))
      },
      {
        title: t('dashboard.revenue'),
        value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(receitasPeriodo),
        change: "",
        changeValue: 0,
        icon: TrendingUp,
        chartData: last7Months.map(m => ({ month: m.mes, value: m.faturamento }))
      },
      {
        title: t('dashboard.contributionMargin'),
        value: `${margemPercentual.toFixed(1)}%`,
        change: "",
        changeValue: 0,
        icon: Activity,
        chartData: last7Months.map(m => ({ month: m.mes, value: m.margemContribuicao }))
      },
      {
        title: t('dashboard.netProfit'),
        value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lucroLiquido),
        change: "",
        changeValue: 0,
        icon: TrendingUp,
        chartData: last7Months.map(m => ({ month: m.mes, value: m.lucroLiquido }))
      },
      {
        title: "Impostos Pagos",
        value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(impostosPagosPeriodo),
        change: "",
        changeValue: 0,
        icon: Activity,
        chartData: last7Months.map(m => ({ month: m.mes, value: 0 }))
      },
      {
        title: "Investimentos",
        value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(investimentosPeriodo),
        change: "",
        changeValue: 0,
        icon: Activity,
        chartData: last7Months.map(m => ({ month: m.mes, value: m.investimentos }))
      }
    ];
  }, [getLancamentosFiltrados, categorias, monthlyData, saldoAtual, impostosPagosPeriodo, investimentosPeriodo, t]);

  // Cards de Vendas (Orçamentos Aprovados)
  const vendasCards = useMemo(() => {
    // Filtrar orçamentos aprovados no período selecionado
    const orcamentosAprovados = orcamentos.filter(orc => {
      // Considerar apenas status aprovado ou finalizado
      if (orc.status !== 'aprovado' && orc.status !== 'finalizado') {
        return false;
      }
      
      // Aplicar filtro de período
      const dataRef = new Date(orc.data_aprovacao || orc.data_criacao);
      
      if (dashboardPeriodType === 'mes') {
        return dataRef.getMonth() === selectedMonth.getMonth() 
          && dataRef.getFullYear() === selectedMonth.getFullYear();
      } else if (dashboardPeriodType === 'trimestre') {
        const ano = parseInt(selectedYear);
        const quarterMonths = {
          'Q1': [0, 1, 2],
          'Q2': [3, 4, 5],
          'Q3': [6, 7, 8],
          'Q4': [9, 10, 11]
        };
        return quarterMonths[selectedQuarter as keyof typeof quarterMonths].includes(dataRef.getMonth())
          && dataRef.getFullYear() === ano;
      } else { // ano
        return dataRef.getFullYear() === parseInt(selectedYear);
      }
    });
    
    // Calcular métricas
    const totalVendas = orcamentosAprovados.reduce((acc, orc) => acc + (orc.valor || 0), 0);
    const quantidadePedidos = orcamentosAprovados.length;
    const ticketMedio = quantidadePedidos > 0 ? totalVendas / quantidadePedidos : 0;
    
    // Preparar dados dos mini gráficos (últimos 7 meses de vendas)
    const last7MonthsVendas = monthlyData.slice(-7).map(m => {
      const mesData = new Date(m.mes);
      const vendasMes = orcamentos
        .filter(orc => {
          if (orc.status !== 'aprovado' && orc.status !== 'finalizado') return false;
          const dataOrc = new Date(orc.data_aprovacao || orc.data_criacao);
          return dataOrc.getMonth() === mesData.getMonth() && dataOrc.getFullYear() === mesData.getFullYear();
        })
        .reduce((acc, orc) => acc + (orc.valor || 0), 0);
      
      return { month: m.mes, value: vendasMes };
    });
    
    return [
      {
        title: "Total de Vendas",
        value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalVendas),
        change: "",
        changeValue: 0,
        icon: DollarSign,
        chartData: last7MonthsVendas
      },
      {
        title: "Quantidade de Pedidos",
        value: quantidadePedidos.toString(),
        change: "",
        changeValue: 0,
        icon: Activity,
        chartData: last7MonthsVendas.map(m => ({ ...m, value: m.value > 0 ? 1 : 0 }))
      },
      {
        title: "Ticket Médio",
        value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(ticketMedio),
        change: "",
        changeValue: 0,
        icon: TrendingUp,
        chartData: last7MonthsVendas
      }
    ];
  }, [orcamentos, dashboardPeriodType, selectedMonth, selectedQuarter, selectedYear, monthlyData]);

  // Dados para gráfico de pizza - Categorias de Faturamento (com filtro de período)
  const faturamentoPorCategoria = useMemo(() => {
    const categoriaMap = new Map<string, { valor: number; categoria: any }>();
    
    getLancamentosFiltrados
      .filter(l => l.tipo === 'entrada' && l.categoriaId)
      .forEach(l => {
        const categoria = categorias.find(c => c.id === l.categoriaId);
        if (categoria) {
          const atual = categoriaMap.get(categoria.nome) || { valor: 0, categoria };
          categoriaMap.set(categoria.nome, { valor: atual.valor + l.valor, categoria });
        }
      });
    
    return Array.from(categoriaMap.entries())
      .map(([name, data], index) => ({ 
        name, 
        value: data.valor,
        fill: getCorCategoria(data.categoria, index)
      }))
      .sort((a, b) => b.value - a.value);
  }, [getLancamentosFiltrados, categorias]);

  // Dados para gráfico de pizza - Categorias de Despesas Variáveis (com filtro de período)
  const despesasVariaveisPorCategoria = useMemo(() => {
    const categoriaMap = new Map<string, { valor: number; categoria: any }>();
    
    // Paleta expandida de tons de vermelho para despesas variáveis
    const paletaVermelho = [
      '#7f1d1d', // vermelho muito escuro
      '#991b1b', // vermelho escuro
      '#b91c1c', // vermelho escuro médio
      '#dc2626', // vermelho
      '#ef4444', // vermelho médio
      '#f87171', // vermelho claro
      '#fca5a5', // vermelho mais claro
      '#fecaca', // vermelho bem claro
      '#fee2e2', // vermelho muito claro
      '#9f1239', // rosa escuro
      '#e11d48', // rosa médio
      '#f43f5e', // rosa
    ];
    
    getLancamentosFiltrados
      .filter(l => {
        const categoria = categorias.find(c => c.id === l.categoriaId);
        return l.tipo === 'saida' && categoria?.codigo?.startsWith('2'); // Categoria 2 = Custos Variáveis
      })
      .forEach(l => {
        const categoria = categorias.find(c => c.id === l.categoriaId);
        if (categoria) {
          const atual = categoriaMap.get(categoria.nome) || { valor: 0, categoria };
          categoriaMap.set(categoria.nome, { valor: atual.valor + l.valor, categoria });
        }
      });
    
    return Array.from(categoriaMap.entries())
      .map(([name, data], index) => ({ 
        name, 
        value: data.valor,
        fill: paletaVermelho[index % paletaVermelho.length] // Usar paleta de vermelhos
      }))
      .sort((a, b) => b.value - a.value); // Ordena do maior para o menor
  }, [getLancamentosFiltrados, categorias]);

  // Configuração de cores para os gráficos de pizza
  const faturamentoChartConfig = useMemo(() => {
    const config: ChartConfig = {
      value: {
        label: "Valor",
      },
    };
    
    faturamentoPorCategoria.forEach((item, index) => {
      config[item.name] = {
        label: item.name,
        color: item.fill,
      };
    });
    
    return config;
  }, [faturamentoPorCategoria]);

  const despesasChartConfig = useMemo(() => {
    const config: ChartConfig = {
      value: {
        label: "Valor",
      },
    };
    
    despesasVariaveisPorCategoria.forEach((item, index) => {
      config[item.name] = {
        label: item.name,
        color: item.fill,
      };
    });
    
    return config;
  }, [despesasVariaveisPorCategoria]);

  const colors = {
    faturamento: '#10b981',        // Verde
    custosVariaveis: '#ef4444',    // Vermelho
    despesasFixas: '#f59e0b',      // Laranja
    margemContribuicao: '#3b82f6', // Azul
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

            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dashboardCards.map((card, index) => (
            <div 
              key={index}
              onClick={() => {
                if (card.title === "Faturamento Total") {
                  setShowFaturamentoModal(true);
                }
              }}
            >
              <StatCard
                title={card.title}
                value={card.value}
                change={card.change}
                changeValue={card.changeValue}
                icon={card.icon}
                chartData={card.chartData}
                loading={loading || loadingContas}
              />
            </div>
          ))}
        </div>

        {/* Cards de Vendas */}
        <Card>
          <CardHeader>
            <CardTitle>Métricas de Vendas - {getPeriodoLabel()}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {vendasCards.map((card, index) => (
                <StatCard
                  key={index}
                  title={card.title}
                  value={card.value}
                  change={card.change}
                  changeValue={card.changeValue}
                  icon={card.icon}
                  chartData={card.chartData}
                  loading={loadingOrcamentos}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Visão Geral Financeira - Últimos 12 Meses</CardTitle>
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
                categories={["faturamento", "custosVariaveis", "despesasFixas", "margemContribuicao"]}
                index="mes"
                colors={[colors.faturamento, colors.custosVariaveis, colors.despesasFixas, colors.margemContribuicao]}
                className="h-80"
              />
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FailureReasonChart />
          <Card>
            <CardHeader>
              <CardTitle>Faturamento por Categoria - {getPeriodoLabel()}</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-80 text-muted-foreground">
                  Carregando dados...
                </div>
              ) : faturamentoPorCategoria.length === 0 ? (
                <div className="flex items-center justify-center h-80 text-muted-foreground">
                  Nenhum dado disponível para o período selecionado.
                </div>
              ) : (
                <ChartContainer
                  config={faturamentoChartConfig}
                  className="mx-auto aspect-square max-h-[350px]"
                >
                  <PieChart>
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          nameKey="name"
                          formatter={(value) => 
                            new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL'
                            }).format(Number(value))
                          }
                        />
                      }
                    />
                    <Pie
                      data={faturamentoPorCategoria}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={60}
                      paddingAngle={4}
                      cornerRadius={8}
                    >
                      {faturamentoPorCategoria.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                      <LabelList
                        dataKey="name"
                        position="outside"
                        className="fill-foreground text-xs"
                        stroke="none"
                        fontSize={12}
                        formatter={(value: any) => {
                          const item = faturamentoPorCategoria.find(i => i.name === value);
                          if (!item) return value;
                          const total = faturamentoPorCategoria.reduce((sum, i) => sum + i.value, 0);
                          const percent = ((item.value / total) * 100).toFixed(0);
                          return `${value} ${percent}%`;
                        }}
                      />
                    </Pie>
                  </PieChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Despesas Variáveis por Categoria - {getPeriodoLabel()}</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-80 text-muted-foreground">
                  Carregando dados...
                </div>
              ) : despesasVariaveisPorCategoria.length === 0 ? (
                <div className="flex items-center justify-center h-80 text-muted-foreground">
                  Nenhum dado disponível para o período selecionado.
                </div>
              ) : (
                <ChartContainer
                  config={despesasChartConfig}
                  className="mx-auto aspect-square max-h-[350px]"
                >
                  <PieChart>
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          nameKey="name"
                          formatter={(value) => 
                            new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL'
                            }).format(Number(value))
                          }
                        />
                      }
                    />
                    <Pie
                      data={despesasVariaveisPorCategoria}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={60}
                      paddingAngle={4}
                      cornerRadius={8}
                    >
                      {despesasVariaveisPorCategoria.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                      <LabelList
                        dataKey="name"
                        position="outside"
                        className="fill-foreground text-xs"
                        stroke="none"
                        fontSize={12}
                        formatter={(value: any) => {
                          const item = despesasVariaveisPorCategoria.find(i => i.name === value);
                          if (!item) return value;
                          const total = despesasVariaveisPorCategoria.reduce((sum, i) => sum + i.value, 0);
                          const percent = ((item.value / total) * 100).toFixed(0);
                          return `${value} ${percent}%`;
                        }}
                      />
                    </Pie>
                  </PieChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Modal de Detalhes de Faturamento */}
        <Dialog open={showFaturamentoModal} onOpenChange={setShowFaturamentoModal}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Receitas Operacionais - {getPeriodoLabel()}</DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              {receitasOperacionaisPeriodo.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma receita operacional neste período.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data Emissão</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Forma Pagamento</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receitasOperacionaisPeriodo.map((lanc) => {
                      const categoria = categorias.find(c => c.id === lanc.categoriaId);
                      return (
                        <TableRow key={lanc.id}>
                          <TableCell>
                            {lanc.dataEmissao ? format(new Date(lanc.dataEmissao), "dd/MM/yyyy") : "-"}
                          </TableCell>
                          <TableCell className="font-medium">{lanc.descricao}</TableCell>
                          <TableCell>{categoria?.nome || "-"}</TableCell>
                          <TableCell>{lanc.formaPagamento || "-"}</TableCell>
                          <TableCell className="text-right font-semibold text-green-600">
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL'
                            }).format(lanc.valor)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </AppLayout>
  );
}
