import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DollarSign, Activity, TrendingUp, TrendingDown, CalendarIcon, Edit } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { MultipleSelector, type Option } from "@/components/ui/multiple-selector";
import { useState } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Dashboard() {
  const [dashboardPeriodType, setDashboardPeriodType] = useState<'mes' | 'trimestre' | 'ano'>('mes');
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [selectedQuarter, setSelectedQuarter] = useState<string>('Q1');
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());

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

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingMonth, setEditingMonth] = useState('');
  const [editValues, setEditValues] = useState({
    faturamento: 0,
    margemContribuicao: 0,
    lucroLiquido: 0,
    despesasTotais: 0
  });

  const dashboardCards = [
    {
      title: "Faturamento Total",
      value: "R$ 85.000,00",
      change: "+12.3%",
      changeValue: 12.3,
      icon: DollarSign
    },
    {
      title: "Margem de Contribuição",
      value: "43,8%",
      change: "-2.1%",
      changeValue: -2.1,
      icon: Activity
    },
    {
      title: "Lucro Líquido",
      value: "R$ 5.200,00",
      change: "+8.5%",
      changeValue: 8.5,
      icon: TrendingUp
    }
  ];

  const handleEditMonth = (mes: string) => {
    const monthData = monthlyData.find(m => m.mes === mes);
    if (monthData) {
      setEditingMonth(mes);
      setEditValues({
        faturamento: monthData.faturamento,
        margemContribuicao: monthData.margemContribuicao,
        lucroLiquido: monthData.lucroLiquido,
        despesasTotais: monthData.despesasTotais
      });
      setIsEditDialogOpen(true);
    }
  };

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
                <div className="text-2xl font-bold">{card.value}</div>
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
            </div>
          </CardContent>
        </Card>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Dados - {editingMonth}</DialogTitle>
              <DialogDescription>Atualize os valores financeiros do mês</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="faturamento">Faturamento</Label>
                <Input
                  id="faturamento"
                  type="number"
                  value={editValues.faturamento}
                  onChange={(e) => setEditValues({ ...editValues, faturamento: parseFloat(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="margemContribuicao">Margem de Contribuição</Label>
                <Input
                  id="margemContribuicao"
                  type="number"
                  value={editValues.margemContribuicao}
                  onChange={(e) => setEditValues({ ...editValues, margemContribuicao: parseFloat(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lucroLiquido">Lucro Líquido</Label>
                <Input
                  id="lucroLiquido"
                  type="number"
                  value={editValues.lucroLiquido}
                  onChange={(e) => setEditValues({ ...editValues, lucroLiquido: parseFloat(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="despesasTotais">Despesas Totais</Label>
                <Input
                  id="despesasTotais"
                  type="number"
                  value={editValues.despesasTotais}
                  onChange={(e) => setEditValues({ ...editValues, despesasTotais: parseFloat(e.target.value) })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={() => setIsEditDialogOpen(false)}>
                Salvar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
