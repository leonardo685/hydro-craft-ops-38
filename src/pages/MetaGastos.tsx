import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Target, Plus, Pencil, Trash2, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useCategoriasFinanceiras } from "@/hooks/use-categorias-financeiras";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface MetaGasto {
  id: string;
  categoriaId: string;
  categoriaNome: string;
  valorMeta: number;
  periodo: 'mensal' | 'trimestral' | 'anual';
  dataInicio: Date;
  dataFim: Date;
  valorGasto: number;
  observacoes?: string;
}

export default function MetaGastos() {
  const { getCategoriasForSelect } = useCategoriasFinanceiras();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editandoMeta, setEditandoMeta] = useState<MetaGasto | null>(null);
  const [filtroCategoria, setFiltroCategoria] = useState("todas");
  const [filtroPeriodo, setFiltroPeriodo] = useState("todos");
  const [filtroStatus, setFiltroStatus] = useState("todos");

  const [metaForm, setMetaForm] = useState({
    categoriaId: '',
    valorMeta: '',
    periodo: 'mensal' as 'mensal' | 'trimestral' | 'anual',
    dataInicio: new Date(),
    dataFim: new Date(),
    observacoes: ''
  });

  // Dados de exemplo
  const [metas, setMetas] = useState<MetaGasto[]>([
    {
      id: '1',
      categoriaId: '1',
      categoriaNome: 'Materiais',
      valorMeta: 50000,
      periodo: 'mensal',
      dataInicio: new Date(2024, 0, 1),
      dataFim: new Date(2024, 0, 31),
      valorGasto: 42500,
      observacoes: 'Meta para compra de materiais'
    },
    {
      id: '2',
      categoriaId: '2',
      categoriaNome: 'Pessoal',
      valorMeta: 80000,
      periodo: 'mensal',
      dataInicio: new Date(2024, 0, 1),
      dataFim: new Date(2024, 0, 31),
      valorGasto: 78000,
      observacoes: 'Folha de pagamento'
    },
    {
      id: '3',
      categoriaId: '3',
      categoriaNome: 'Marketing',
      valorMeta: 15000,
      periodo: 'mensal',
      dataInicio: new Date(2024, 0, 1),
      dataFim: new Date(2024, 0, 31),
      valorGasto: 16200,
      observacoes: 'Campanhas publicitárias'
    }
  ]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getPercentualUtilizado = (valorGasto: number, valorMeta: number) => {
    return (valorGasto / valorMeta) * 100;
  };

  const getStatusMeta = (percentual: number) => {
    if (percentual >= 100) return { label: 'Excedido', variant: 'destructive' as const, icon: TrendingDown };
    if (percentual >= 80) return { label: 'Próximo do Limite', variant: 'default' as const, icon: AlertTriangle };
    return { label: 'Dentro da Meta', variant: 'default' as const, icon: TrendingUp };
  };

  const handleSalvarMeta = () => {
    if (!metaForm.categoriaId || !metaForm.valorMeta) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const categoriaSelecionada = getCategoriasForSelect().find(c => c.value === metaForm.categoriaId);
    
    if (editandoMeta) {
      setMetas(metas.map(m => 
        m.id === editandoMeta.id 
          ? {
              ...m,
              categoriaId: metaForm.categoriaId,
              categoriaNome: categoriaSelecionada?.label || '',
              valorMeta: parseFloat(metaForm.valorMeta),
              periodo: metaForm.periodo,
              dataInicio: metaForm.dataInicio,
              dataFim: metaForm.dataFim,
              observacoes: metaForm.observacoes
            }
          : m
      ));
      toast.success("Meta atualizada com sucesso!");
    } else {
      const novaMeta: MetaGasto = {
        id: String(Date.now()),
        categoriaId: metaForm.categoriaId,
        categoriaNome: categoriaSelecionada?.label || '',
        valorMeta: parseFloat(metaForm.valorMeta),
        periodo: metaForm.periodo,
        dataInicio: metaForm.dataInicio,
        dataFim: metaForm.dataFim,
        valorGasto: 0,
        observacoes: metaForm.observacoes
      };
      setMetas([...metas, novaMeta]);
      toast.success("Meta criada com sucesso!");
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const handleEditarMeta = (meta: MetaGasto) => {
    setEditandoMeta(meta);
    setMetaForm({
      categoriaId: meta.categoriaId,
      valorMeta: String(meta.valorMeta),
      periodo: meta.periodo,
      dataInicio: meta.dataInicio,
      dataFim: meta.dataFim,
      observacoes: meta.observacoes || ''
    });
    setIsDialogOpen(true);
  };

  const handleExcluirMeta = (id: string) => {
    setMetas(metas.filter(m => m.id !== id));
    toast.success("Meta excluída com sucesso!");
  };

  const resetForm = () => {
    setMetaForm({
      categoriaId: '',
      valorMeta: '',
      periodo: 'mensal',
      dataInicio: new Date(),
      dataFim: new Date(),
      observacoes: ''
    });
    setEditandoMeta(null);
  };

  const metasFiltradas = metas.filter(meta => {
    if (filtroCategoria !== 'todas' && meta.categoriaId !== filtroCategoria) return false;
    if (filtroPeriodo !== 'todos' && meta.periodo !== filtroPeriodo) return false;
    if (filtroStatus !== 'todos') {
      const percentual = getPercentualUtilizado(meta.valorGasto, meta.valorMeta);
      if (filtroStatus === 'dentro' && percentual >= 80) return false;
      if (filtroStatus === 'proximo' && (percentual < 80 || percentual >= 100)) return false;
      if (filtroStatus === 'excedido' && percentual < 100) return false;
    }
    return true;
  });

  const totalMetas = metas.reduce((acc, meta) => acc + meta.valorMeta, 0);
  const totalGasto = metas.reduce((acc, meta) => acc + meta.valorGasto, 0);
  const disponivel = totalMetas - totalGasto;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Meta de Gastos</h1>
            <p className="text-muted-foreground">Gerencie suas metas de gastos por categoria</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova Meta
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editandoMeta ? 'Editar Meta' : 'Nova Meta de Gastos'}</DialogTitle>
                <DialogDescription>
                  Defina uma meta de gastos para uma categoria específica
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Categoria *</Label>
                    <Select value={metaForm.categoriaId} onValueChange={(value) => setMetaForm(prev => ({ ...prev, categoriaId: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {getCategoriasForSelect().map(categoria => (
                          <SelectItem key={categoria.value} value={categoria.value}>
                            {categoria.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Valor da Meta *</Label>
                    <Input
                      type="number"
                      placeholder="0,00"
                      value={metaForm.valorMeta}
                      onChange={(e) => setMetaForm(prev => ({ ...prev, valorMeta: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Período</Label>
                  <Select value={metaForm.periodo} onValueChange={(value: 'mensal' | 'trimestral' | 'anual') => setMetaForm(prev => ({ ...prev, periodo: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mensal">Mensal</SelectItem>
                      <SelectItem value="trimestral">Trimestral</SelectItem>
                      <SelectItem value="anual">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data Início</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !metaForm.dataInicio && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {metaForm.dataInicio ? format(metaForm.dataInicio, "dd/MM/yyyy") : "Selecionar"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={metaForm.dataInicio}
                          onSelect={(date) => date && setMetaForm(prev => ({ ...prev, dataInicio: date }))}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label>Data Fim</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !metaForm.dataFim && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {metaForm.dataFim ? format(metaForm.dataFim, "dd/MM/yyyy") : "Selecionar"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={metaForm.dataFim}
                          onSelect={(date) => date && setMetaForm(prev => ({ ...prev, dataFim: date }))}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Textarea
                    placeholder="Adicione observações sobre esta meta..."
                    value={metaForm.observacoes}
                    onChange={(e) => setMetaForm(prev => ({ ...prev, observacoes: e.target.value }))}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                  <Button onClick={handleSalvarMeta}>Salvar Meta</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-l-4 border-l-primary">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                <CardTitle className="text-base font-medium">Total de Metas</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-3xl font-bold text-primary">
                {formatCurrency(totalMetas)}
              </div>
              <p className="text-sm text-muted-foreground">{metas.length} metas cadastradas</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-destructive">
                <TrendingDown className="h-5 w-5" />
                <CardTitle className="text-base font-medium">Total Gasto</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-3xl font-bold text-destructive">
                {formatCurrency(totalGasto)}
              </div>
              <p className="text-sm text-muted-foreground">
                {((totalGasto / totalMetas) * 100).toFixed(1)}% das metas
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-green-600">
                <TrendingUp className="h-5 w-5" />
                <CardTitle className="text-base font-medium">Disponível</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-3xl font-bold text-green-600">
                {formatCurrency(disponivel)}
              </div>
              <p className="text-sm text-muted-foreground">Saldo restante</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Metas de Gastos</CardTitle>
            <div className="flex gap-2 mt-4">
              <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as Categorias</SelectItem>
                  {getCategoriasForSelect().map(categoria => (
                    <SelectItem key={categoria.value} value={categoria.value}>
                      {categoria.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filtroPeriodo} onValueChange={setFiltroPeriodo}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Períodos</SelectItem>
                  <SelectItem value="mensal">Mensal</SelectItem>
                  <SelectItem value="trimestral">Trimestral</SelectItem>
                  <SelectItem value="anual">Anual</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Status</SelectItem>
                  <SelectItem value="dentro">Dentro da Meta</SelectItem>
                  <SelectItem value="proximo">Próximo do Limite</SelectItem>
                  <SelectItem value="excedido">Excedido</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Valor Meta</TableHead>
                  <TableHead>Valor Gasto</TableHead>
                  <TableHead>Progresso</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metasFiltradas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      Nenhuma meta encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  metasFiltradas.map((meta) => {
                    const percentual = getPercentualUtilizado(meta.valorGasto, meta.valorMeta);
                    const status = getStatusMeta(percentual);
                    const StatusIcon = status.icon;

                    return (
                      <TableRow key={meta.id}>
                        <TableCell className="font-medium">{meta.categoriaNome}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {meta.periodo === 'mensal' ? 'Mensal' : meta.periodo === 'trimestral' ? 'Trimestral' : 'Anual'}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatCurrency(meta.valorMeta)}</TableCell>
                        <TableCell className={percentual >= 100 ? 'text-destructive font-medium' : ''}>
                          {formatCurrency(meta.valorGasto)}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Progress 
                              value={Math.min(percentual, 100)} 
                              className={cn(
                                "h-2",
                                percentual >= 100 && "[&>*]:bg-destructive",
                                percentual >= 80 && percentual < 100 && "[&>*]:bg-yellow-500"
                              )}
                            />
                            <p className="text-xs text-muted-foreground">{percentual.toFixed(1)}%</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant} className="flex items-center gap-1 w-fit">
                            <StatusIcon className="h-3 w-3" />
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditarMeta(meta)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleExcluirMeta(meta.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
