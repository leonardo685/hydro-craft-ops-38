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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Target, Plus, Pencil, Trash2, TrendingUp, TrendingDown, AlertTriangle, ArrowUp, ArrowDown, Calculator, DollarSign } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useCategoriasFinanceiras } from "@/hooks/use-categorias-financeiras";
import { useLancamentosFinanceiros } from "@/hooks/use-lancamentos-financeiros";
import { useMetasGastos } from "@/hooks/use-metas-gastos";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

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

interface ItemPlanejamento {
  id: string;
  descricao: string;
  valor: number;
}

interface DadosPlanejamento {
  despesasFixas: ItemPlanejamento[];
  faturamentos: ItemPlanejamento[];
  ajusteFaturamento: number;
  ajusteDespesas: number;
  ajusteMargemContribuicao: number;
}

export default function MetaGastos() {
  const [modeloGestao, setModeloGestao] = useState<'dre' | 'esperado' | 'realizado'>('realizado');
  const { getCategoriasForSelect } = useCategoriasFinanceiras();
  const { lancamentos } = useLancamentosFinanceiros();
  const { metas, loading, adicionarMeta, atualizarMeta, deletarMeta } = useMetasGastos(modeloGestao);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
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

  // Estados para Planejamento Estratégico
  const [planejamento, setPlanejamento] = useState<DadosPlanejamento>({
    despesasFixas: [],
    faturamentos: [],
    ajusteFaturamento: 0,
    ajusteDespesas: 0,
    ajusteMargemContribuicao: 30
  });

  const [formDespesa, setFormDespesa] = useState({ descricao: '', valor: '' });
  const [formFaturamento, setFormFaturamento] = useState({ descricao: '', valor: '' });
  
  // Estados para calculadora
  const [calcOpen, setCalcOpen] = useState(false);
  const [calcTipo, setCalcTipo] = useState<'despesa' | 'faturamento'>('despesa');
  const [calcValorBase, setCalcValorBase] = useState('');
  const [calcMultiplicador, setCalcMultiplicador] = useState('1');

  // Calcular valor gasto para cada meta baseado no modelo de gestão selecionado
  const metasComGastos = useMemo(() => {
    return metas.map(meta => {
      const dataInicio = new Date(meta.dataInicio);
      const dataFim = new Date(meta.dataFim);
      
      const categoriaSelecionada = getCategoriasForSelect().find(c => c.value === meta.categoriaId);
      console.log('🎯 Processando Meta:', {
        categoria: categoriaSelecionada?.label,
        categoriaId: meta.categoriaId,
        periodo: `${dataInicio.toLocaleDateString()} até ${dataFim.toLocaleDateString()}`,
        modelo: modeloGestao
      });
      
      const lancamentosFiltrados = lancamentos.filter(l => {
        // Definir qual data usar baseado no modelo de gestão
        let dataReferencia: Date;
        let deveConsiderar = true;

        if (modeloGestao === 'realizado') {
          // Realizado (DFC): apenas lançamentos pagos com data_realizada
          dataReferencia = l.dataRealizada ? new Date(l.dataRealizada) : new Date(l.dataEsperada);
          deveConsiderar = l.pago === true;
        } else if (modeloGestao === 'esperado') {
          // Esperado: todos os lançamentos pela data esperada
          dataReferencia = new Date(l.dataEsperada);
          deveConsiderar = true;
        } else {
          // DRE: usar data de emissão
          dataReferencia = new Date(l.dataEmissao);
          deveConsiderar = true;
        }
        
        const dentroDoPeríodo = dataReferencia >= dataInicio && dataReferencia <= dataFim;
        const mesmaCategoria = l.categoriaId === meta.categoriaId;
        const ehSaida = l.tipo === 'saida';
        
        if (mesmaCategoria) {
          console.log('✅ Lançamento encontrado:', {
            descricao: l.descricao,
            valor: l.valor,
            dataReferencia: dataReferencia.toLocaleDateString(),
            dataInicio: dataInicio.toLocaleDateString(),
            dataFim: dataFim.toLocaleDateString(),
            dentroDoPeríodo,
            deveConsiderar,
            ehSaida,
            pago: l.pago,
            tipo: l.tipo
          });
        }
        
        // Debug: Log todos os lançamentos de saída para ver o que está disponível
        if (ehSaida && l.descricao.toLowerCase().includes('aluguel')) {
          console.log('🏠 Lançamento de Aluguel:', {
            descricao: l.descricao,
            categoriaLancamento: l.categoriaId,
            categoriaMeta: meta.categoriaId,
            mesmaCategoria,
            dataReferencia: dataReferencia.toLocaleDateString(),
            dentroDoPeríodo
          });
        }
        
        return ehSaida && deveConsiderar && mesmaCategoria && dentroDoPeríodo;
      });
      
      const valorGasto = lancamentosFiltrados.reduce((acc, l) => acc + l.valor, 0);
      
      console.log('💰 Resultado:', {
        categoria: categoriaSelecionada?.label,
        lancamentosEncontrados: lancamentosFiltrados.length,
        totalGasto: valorGasto
      });

      return {
        id: meta.id,
        categoriaId: meta.categoriaId,
        categoriaNome: categoriaSelecionada?.label || 'Sem nome',
        valorMeta: meta.valorMeta,
        periodo: meta.periodo,
        dataInicio: new Date(meta.dataInicio),
        dataFim: new Date(meta.dataFim),
        valorGasto,
        observacoes: meta.observacoes
      };
    });
  }, [metas, lancamentos, getCategoriasForSelect, modeloGestao]);

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

  const handleSalvarMeta = async () => {
    if (!metaForm.categoriaId || !metaForm.valorMeta) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const metaData = {
      categoriaId: metaForm.categoriaId,
      valorMeta: parseFloat(metaForm.valorMeta),
      periodo: metaForm.periodo,
      dataInicio: metaForm.dataInicio,
      dataFim: metaForm.dataFim,
      observacoes: metaForm.observacoes,
      modeloGestao: modeloGestao
    };
    
    let sucesso = false;
    if (editandoId) {
      sucesso = await atualizarMeta(editandoId, metaData);
      if (sucesso) toast.success("Meta atualizada com sucesso!");
    } else {
      sucesso = await adicionarMeta(metaData);
      if (sucesso) toast.success("Meta criada com sucesso!");
    }

    if (sucesso) {
      setIsDialogOpen(false);
      resetForm();
    } else {
      toast.error("Erro ao salvar meta");
    }
  };

  const handleEditarMeta = (meta: MetaGasto) => {
    setEditandoId(meta.id);
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

  const handleExcluirMeta = async (id: string) => {
    const sucesso = await deletarMeta(id);
    if (sucesso) {
      toast.success("Meta excluída com sucesso!");
    } else {
      toast.error("Erro ao excluir meta");
    }
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
    setEditandoId(null);
  };

  const metasFiltradas = metasComGastos.filter(meta => {
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

  const totalMetas = metasComGastos.reduce((acc, meta) => acc + meta.valorMeta, 0);
  const totalGasto = metasComGastos.reduce((acc, meta) => acc + meta.valorGasto, 0);
  const disponivel = totalMetas - totalGasto;

  // Cálculos do Planejamento Estratégico
  const calcularTotais = useMemo(() => {
    const totalFaturamentoBase = planejamento.faturamentos.reduce((acc, f) => acc + f.valor, 0);
    const totalDespesasBase = planejamento.despesasFixas.reduce((acc, d) => acc + d.valor, 0);
    
    const totalFaturamento = totalFaturamentoBase * (1 + planejamento.ajusteFaturamento / 100);
    const totalDespesas = totalDespesasBase * (1 + planejamento.ajusteDespesas / 100);
    
    const metaMargemReais = totalFaturamento * (planejamento.ajusteMargemContribuicao / 100);
    const custosVariaveisMaximo = totalFaturamento - totalDespesas - metaMargemReais;
    const percentualCustosVariaveis = totalFaturamento > 0 ? custosVariaveisMaximo / totalFaturamento : 0;
    const pontoEquilibrio = percentualCustosVariaveis < 1 ? totalDespesas / (1 - percentualCustosVariaveis) : 0;
    const lucroOperacional = totalFaturamento - totalDespesas - custosVariaveisMaximo;
    const margemLucroOperacional = totalFaturamento > 0 ? (lucroOperacional / totalFaturamento) * 100 : 0;
    const indiceLucratividade = totalDespesas > 0 ? lucroOperacional / totalDespesas : 0;
    
    return {
      totalFaturamento,
      totalDespesas,
      metaMargemReais,
      custosVariaveisMaximo,
      percentualCustosVariaveis,
      pontoEquilibrio,
      lucroOperacional,
      margemLucroOperacional,
      indiceLucratividade,
      totalFaturamentoBase,
      totalDespesasBase
    };
  }, [planejamento]);

  // Funções para gerenciar despesas fixas
  const adicionarDespesa = () => {
    if (!formDespesa.descricao || !formDespesa.valor) {
      toast.error("Preencha todos os campos");
      return;
    }
    
    const novaDespesa: ItemPlanejamento = {
      id: Date.now().toString(),
      descricao: formDespesa.descricao,
      valor: parseFloat(formDespesa.valor)
    };
    
    setPlanejamento(prev => ({
      ...prev,
      despesasFixas: [...prev.despesasFixas, novaDespesa]
    }));
    
    setFormDespesa({ descricao: '', valor: '' });
    toast.success("Despesa adicionada");
  };

  const removerDespesa = (id: string) => {
    setPlanejamento(prev => ({
      ...prev,
      despesasFixas: prev.despesasFixas.filter(d => d.id !== id)
    }));
    toast.success("Despesa removida");
  };

  // Funções para gerenciar faturamento
  const adicionarFaturamento = () => {
    if (!formFaturamento.descricao || !formFaturamento.valor) {
      toast.error("Preencha todos os campos");
      return;
    }
    
    const novoFaturamento: ItemPlanejamento = {
      id: Date.now().toString(),
      descricao: formFaturamento.descricao,
      valor: parseFloat(formFaturamento.valor)
    };
    
    setPlanejamento(prev => ({
      ...prev,
      faturamentos: [...prev.faturamentos, novoFaturamento]
    }));
    
    setFormFaturamento({ descricao: '', valor: '' });
    toast.success("Faturamento adicionado");
  };

  const removerFaturamento = (id: string) => {
    setPlanejamento(prev => ({
      ...prev,
      faturamentos: prev.faturamentos.filter(f => f.id !== id)
    }));
    toast.success("Faturamento removido");
  };

  // Funções para ajustar percentuais
  const ajustarPercentual = (tipo: 'faturamento' | 'despesas' | 'margem', incremento: number) => {
    setPlanejamento(prev => {
      if (tipo === 'faturamento') {
        return { ...prev, ajusteFaturamento: prev.ajusteFaturamento + incremento };
      } else if (tipo === 'despesas') {
        return { ...prev, ajusteDespesas: prev.ajusteDespesas + incremento };
      } else {
        const novoValor = prev.ajusteMargemContribuicao + incremento;
        return { ...prev, ajusteMargemContribuicao: Math.max(0, Math.min(100, novoValor)) };
      }
    });
  };

  // Funções da calculadora
  const calcularValor = () => {
    const base = parseFloat(calcValorBase) || 0;
    const mult = parseFloat(calcMultiplicador) || 1;
    return base * mult;
  };

  const aplicarCalculadora = () => {
    const resultado = calcularValor().toString();
    
    if (calcTipo === 'despesa') {
      setFormDespesa(prev => ({ ...prev, valor: resultado }));
    } else {
      setFormFaturamento(prev => ({ ...prev, valor: resultado }));
    }
    
    // Resetar calculadora
    setCalcOpen(false);
    setCalcValorBase('');
    setCalcMultiplicador('1');
  };

  const abrirCalculadora = (tipo: 'despesa' | 'faturamento') => {
    setCalcTipo(tipo);
    setCalcOpen(true);
  };

  // Componente Popover da Calculadora
  const CalculadoraPopover = ({ tipo }: { tipo: 'despesa' | 'faturamento' }) => (
    <Popover open={calcOpen} onOpenChange={setCalcOpen}>
      <PopoverTrigger asChild>
        <Button 
          type="button"
          variant="outline" 
          size="icon"
          className="shrink-0"
          onClick={() => abrirCalculadora(tipo)}
        >
          <Calculator className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Calculadora</h4>
            <p className="text-sm text-muted-foreground">
              Multiplique valores para calcular rapidamente
            </p>
          </div>
          
          <div className="space-y-3">
            <div>
              <Label htmlFor="calc-base">Valor Base (R$)</Label>
              <Input 
                id="calc-base"
                type="number"
                placeholder="0.00"
                value={calcValorBase}
                onChange={(e) => setCalcValorBase(e.target.value)}
                step="0.01"
              />
            </div>
            
            <div>
              <Label htmlFor="calc-mult">Multiplicador</Label>
              <Input 
                id="calc-mult"
                type="number"
                placeholder="1"
                value={calcMultiplicador}
                onChange={(e) => setCalcMultiplicador(e.target.value)}
                step="0.01"
              />
            </div>
            
            <div className="pt-3 border-t">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-medium">Resultado:</span>
                <span className="text-lg font-bold text-primary">
                  {formatCurrency(calcularValor())}
                </span>
              </div>
              
              <Button 
                onClick={aplicarCalculadora} 
                className="w-full"
                disabled={!calcValorBase}
              >
                Aplicar Valor
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Planejamento</h1>
            <p className="text-muted-foreground">Gerencie metas e simulações estratégicas</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={modeloGestao} onValueChange={(value: 'dre' | 'esperado' | 'realizado') => setModeloGestao(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="realizado">Realizado (DFC)</SelectItem>
                <SelectItem value="esperado">Esperado</SelectItem>
                <SelectItem value="dre">DRE</SelectItem>
              </SelectContent>
            </Select>
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
                <DialogTitle>{editandoId ? 'Editar Meta' : 'Nova Meta de Gastos'}</DialogTitle>
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
        </div>

        <Tabs defaultValue="metas" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="metas">Metas de Gastos</TabsTrigger>
            <TabsTrigger value="estrategico">Planejamento Estratégico</TabsTrigger>
          </TabsList>

          {/* ABA 1: METAS DE GASTOS */}
          <TabsContent value="metas" className="space-y-6">
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
                  <p className="text-sm text-muted-foreground">{metasComGastos.length} metas cadastradas</p>
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
          </TabsContent>

          {/* ABA 2: PLANEJAMENTO ESTRATÉGICO */}
          <TabsContent value="estrategico" className="space-y-6">
            {/* Seção 1: Formulários de Entrada */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Formulário Despesas Fixas */}
              <Card>
                <CardHeader>
                  <CardTitle>Despesas Fixas Médias</CardTitle>
                  <p className="text-sm text-muted-foreground">Registre as despesas fixas do último ano</p>
                </CardHeader>
                <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input 
                    placeholder="Descrição (ex: Aluguel)"
                    value={formDespesa.descricao}
                    onChange={(e) => setFormDespesa(prev => ({ ...prev, descricao: e.target.value }))}
                  />
                  <div className="flex gap-1 items-center">
                    <Input 
                      type="number"
                      placeholder="Valor"
                      value={formDespesa.valor}
                      onChange={(e) => setFormDespesa(prev => ({ ...prev, valor: e.target.value }))}
                      className="w-32"
                    />
                    <CalculadoraPopover tipo="despesa" />
                  </div>
                  <Button onClick={adicionarDespesa}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                  
                  {planejamento.despesasFixas.length > 0 && (
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Descrição</TableHead>
                            <TableHead className="text-right">Valor</TableHead>
                            <TableHead className="w-12"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {planejamento.despesasFixas.map(despesa => (
                            <TableRow key={despesa.id}>
                              <TableCell>{despesa.descricao}</TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(despesa.valor)}
                              </TableCell>
                              <TableCell>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => removerDespesa(despesa.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Formulário Faturamento */}
              <Card>
                <CardHeader>
                  <CardTitle>Faturamento do Último Ano</CardTitle>
                  <p className="text-sm text-muted-foreground">Registre o faturamento por fonte</p>
                </CardHeader>
                <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input 
                    placeholder="Descrição (ex: Vendas Produto A)"
                    value={formFaturamento.descricao}
                    onChange={(e) => setFormFaturamento(prev => ({ ...prev, descricao: e.target.value }))}
                  />
                  <div className="flex gap-1 items-center">
                    <Input 
                      type="number"
                      placeholder="Valor"
                      value={formFaturamento.valor}
                      onChange={(e) => setFormFaturamento(prev => ({ ...prev, valor: e.target.value }))}
                      className="w-32"
                    />
                    <CalculadoraPopover tipo="faturamento" />
                  </div>
                  <Button onClick={adicionarFaturamento}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                  
                  {planejamento.faturamentos.length > 0 && (
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Descrição</TableHead>
                            <TableHead className="text-right">Valor</TableHead>
                            <TableHead className="w-12"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {planejamento.faturamentos.map(fat => (
                            <TableRow key={fat.id}>
                              <TableCell>{fat.descricao}</TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(fat.valor)}
                              </TableCell>
                              <TableCell>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => removerFaturamento(fat.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Seção 2: Cards de Simulação com Botões de Ajuste */}
            {(planejamento.despesasFixas.length > 0 || planejamento.faturamentos.length > 0) && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  
                  {/* Card 1: Faturamento com Ajuste */}
                  <Card className="border-l-4 border-l-green-500">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Faturamento Total</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        Base: {formatCurrency(calcularTotais.totalFaturamentoBase)}
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(calcularTotais.totalFaturamento)}
                      </div>
                      
                      <div className="flex items-center justify-between gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => ajustarPercentual('faturamento', -0.5)}
                        >
                          <ArrowDown className="h-3 w-3" />
                        </Button>
                        
                        <div className="text-center">
                          <div className="text-lg font-semibold">
                            {planejamento.ajusteFaturamento > 0 ? '+' : ''}
                            {planejamento.ajusteFaturamento.toFixed(1)}%
                          </div>
                          <div className="text-xs text-muted-foreground">Ajuste</div>
                        </div>
                        
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => ajustarPercentual('faturamento', 0.5)}
                        >
                          <ArrowUp className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Card 2: Despesas Fixas com Ajuste */}
                  <Card className="border-l-4 border-l-red-500">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Despesas Fixas</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        Base: {formatCurrency(calcularTotais.totalDespesasBase)}
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="text-2xl font-bold text-red-600">
                        {formatCurrency(calcularTotais.totalDespesas)}
                      </div>
                      
                      <div className="flex items-center justify-between gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => ajustarPercentual('despesas', -0.5)}
                        >
                          <ArrowDown className="h-3 w-3" />
                        </Button>
                        
                        <div className="text-center">
                          <div className="text-lg font-semibold">
                            {planejamento.ajusteDespesas > 0 ? '+' : ''}
                            {planejamento.ajusteDespesas.toFixed(1)}%
                          </div>
                          <div className="text-xs text-muted-foreground">Ajuste</div>
                        </div>
                        
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => ajustarPercentual('despesas', 0.5)}
                        >
                          <ArrowUp className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Card 3: Meta de Margem de Contribuição */}
                  <Card className="border-l-4 border-l-blue-500">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Meta de Margem</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        Margem de Contribuição
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="text-2xl font-bold text-blue-600">
                        {formatCurrency(calcularTotais.metaMargemReais)}
                      </div>
                      
                      <div className="flex items-center justify-between gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => ajustarPercentual('margem', -0.5)}
                        >
                          <ArrowDown className="h-3 w-3" />
                        </Button>
                        
                        <div className="text-center">
                          <div className="text-lg font-semibold">
                            {planejamento.ajusteMargemContribuicao.toFixed(1)}%
                          </div>
                          <div className="text-xs text-muted-foreground">Meta</div>
                        </div>
                        
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => ajustarPercentual('margem', 0.5)}
                        >
                          <ArrowUp className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Seção 3: Indicadores Financeiros */}
                <Card>
                  <CardHeader>
                    <CardTitle>Indicadores Financeiros</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Análise estratégica baseada nos dados informados
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      
                      {/* Ponto de Equilíbrio */}
                      <div className="space-y-2 p-4 border rounded-lg">
                        <div className="text-sm font-medium text-muted-foreground">
                          Ponto de Equilíbrio
                        </div>
                        <div className="text-2xl font-bold">
                          {formatCurrency(calcularTotais.pontoEquilibrio)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Faturamento mínimo para cobrir custos
                        </p>
                      </div>

                      {/* Margem de Lucro Operacional */}
                      <div className="space-y-2 p-4 border rounded-lg">
                        <div className="text-sm font-medium text-muted-foreground">
                          Margem de Lucro
                        </div>
                        <div className="text-2xl font-bold">
                          {calcularTotais.margemLucroOperacional.toFixed(2)}%
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Lucro sobre faturamento
                        </p>
                      </div>

                      {/* Custos Variáveis Máximo */}
                      <div className="space-y-2 p-4 border rounded-lg">
                        <div className="text-sm font-medium text-muted-foreground">
                          Custos Variáveis Máx.
                        </div>
                        <div className="text-2xl font-bold">
                          {formatCurrency(calcularTotais.custosVariaveisMaximo)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {(calcularTotais.percentualCustosVariaveis * 100).toFixed(1)}% do faturamento
                        </p>
                      </div>

                      {/* Índice de Lucratividade */}
                      <div className="space-y-2 p-4 border rounded-lg">
                        <div className="text-sm font-medium text-muted-foreground">
                          Índice de Lucratividade
                        </div>
                        <div className="text-2xl font-bold">
                          {calcularTotais.indiceLucratividade.toFixed(2)}x
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Lucro / Despesas Fixas
                        </p>
                      </div>
                    </div>

                    {/* Resumo Executivo */}
                    <div className="mt-6 p-4 bg-muted rounded-lg space-y-2">
                      <h4 className="font-semibold">Resumo Executivo</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Lucro Operacional:</span>
                          <span className="ml-2 text-green-600 font-bold">
                            {formatCurrency(calcularTotais.lucroOperacional)}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium">% sobre Faturamento:</span>
                          <span className="ml-2 font-bold">
                            {calcularTotais.margemLucroOperacional.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
