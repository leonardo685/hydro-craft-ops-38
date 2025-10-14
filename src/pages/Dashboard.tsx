import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, TrendingUp, TrendingDown, DollarSign, Activity } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useState } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { MultipleSelector, type Option } from "@/components/ui/multiple-selector";

export default function Dashboard() {
  const [dashboardPeriodType, setDashboardPeriodType] = useState<'mes' | 'trimestre' | 'ano'>('mes');
  const [selectedMonth, setSelectedMonth] = useState<Date | undefined>(new Date());
  const [selectedQuarter, setSelectedQuarter] = useState<string>('Q1');
  const [selectedYear, setSelectedYear] = useState<string>('2024');

  const [monthlyData] = useState([
    { mes: 'Jan', faturamento: 75000, margemContribuicao: 32000, lucroLiquido: 4200, despesasTotais: 28500 },
    { mes: 'Fev', faturamento: 68000, margemContribuicao: 29800, lucroLiquido: 3800, despesasTotais: 26200 },
    { mes: 'Mar', faturamento: 82000, margemContribuicao: 35600, lucroLiquido: 4900, despesasTotais: 31100 },
    { mes: 'Abr', faturamento: 79000, margemContribuicao: 34200, lucroLiquido: 4600, despesasTotais: 29600 },
    { mes: 'Mai', faturamento: 85000, margemContribuicao: 37250, lucroLiquido: 5200, despesasTotais: 32050 },
    { mes: 'Jun', faturamento: 92000, margemContribuicao: 40500, lucroLiquido: 5800, despesasTotais: 34700 },
    { mes: 'Jul', faturamento: 88000, margemContribuicao: 38700, lucroLiquido: 5400, despesasTotais: 33300 },
    { mes: 'Ago', faturamento: 95000, margemContribuicao: 42000, lucroLiquido: 6200, despesasTotais: 35800 },
    { mes: 'Set', faturamento: 91000, margemContribuicao: 39800, lucroLiquido: 5700, despesasTotais: 34100 },
    { mes: 'Out', faturamento: 87000, margemContribuicao: 38100, lucroLiquido: 5300, despesasTotais: 32800 },
    { mes: 'Nov', faturamento: 93000, margemContribuicao: 41000, lucroLiquido: 5900, despesasTotais: 35100 },
    { mes: 'Dez', faturamento: 98000, margemContribuicao: 43500, lucroLiquido: 6500, despesasTotais: 37000 }
  ]);

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

  const dashboardCards = [
    { title: "Receita Mensal", value: "R$ 98.500", change: "+12.5%", icon: DollarSign },
    { title: "Despesas", value: "R$ 42.300", change: "+8.2%", icon: TrendingDown },
    { title: "Lucro Líquido", value: "R$ 56.200", change: "+15.3%", icon: TrendingUp },
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard Financeiro</h1>
          <p className="text-muted-foreground">Visão geral dos indicadores financeiros</p>
        </div>

        {/* Period Filter */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filtro de Período</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Period Type Selector */}
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

              {/* Month Selector */}
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

              {/* Quarter Selector */}
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

              {/* Year Selector */}
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

              {/* Apply Filter Button */}
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
                <div className="text-2xl font-bold">{card.value}</div>
                <p className="text-xs text-muted-foreground">{card.change} vs mês anterior</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Evolução Mensal</CardTitle>
            <div className="mt-4">
              <MultipleSelector
                value={selectedColumns}
                onChange={setSelectedColumns}
                options={columnOptions}
                placeholder="Selecione as métricas..."
                emptyIndicator={
                  <p className="text-center text-sm text-muted-foreground">Nenhuma opção encontrada.</p>
                }
              />
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="mes" 
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: 'hsl(var(--foreground))' }}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: 'hsl(var(--foreground))' }}
                  tickFormatter={(value) => formatCurrency(value)}
                />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                />
                <Legend />
                {visibleData.faturamento && (
                  <Bar dataKey="faturamento" fill="#8b5cf6" name="Faturamento" />
                )}
                {visibleData.margemContribuicao && (
                  <Bar dataKey="margemContribuicao" fill="#10b981" name="Margem de Contribuição" />
                )}
                {visibleData.lucroLiquido && (
                  <Bar dataKey="lucroLiquido" fill="#3b82f6" name="Lucro Líquido" />
                )}
                {visibleData.despesasTotais && (
                  <Bar dataKey="despesasTotais" fill="#ef4444" name="Despesas Totais" />
                )}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
