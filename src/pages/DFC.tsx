import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { FileDown, Plus, ArrowDownLeft, ArrowUpRight, CalendarIcon, ChevronDown, ChevronUp, X, DollarSign, Check, Minus } from "lucide-react";
import { useState } from "react";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useCategoriasFinanceiras } from "@/hooks/use-categorias-financeiras";
import { useLancamentosFinanceiros } from "@/hooks/use-lancamentos-financeiros";
import { MultipleSelector, type Option } from "@/components/ui/multiple-selector";
import { useMemo, useEffect } from "react";

export default function DFC() {
  const { getCategoriasForSelect, getNomeCategoriaMae } = useCategoriasFinanceiras();
  const { lancamentos, loading, adicionarLancamento, atualizarLancamento } = useLancamentosFinanceiros();

  const [contaSelecionada, setContaSelecionada] = useState('todas');
  const [isLancamentoDialogOpen, setIsLancamentoDialogOpen] = useState(false);
  const [colunasVisiveisExpanded, setColunasVisiveisExpanded] = useState(true);
  const [filtrosExpanded, setFiltrosExpanded] = useState(true);
  const [dataInicial, setDataInicial] = useState("");
  const [dataFinal, setDataFinal] = useState("");
  const [periodoSelecionado, setPeriodoSelecionado] = useState("");
  const [dfcDataInicio, setDfcDataInicio] = useState<Date | null>(null);
  const [dfcDataFim, setDfcDataFim] = useState<Date | null>(null);
  const [contaBancariaFiltro, setContaBancariaFiltro] = useState("todas");
  const [movimentacoesFiltradas, setMovimentacoesFiltradas] = useState<any[]>([]);
  const [planejamentoExpanded, setPlanejamentoExpanded] = useState(true);
  
  // Estados para confirmação de recebimento/pagamento
  const [confirmarPagamentoDialog, setConfirmarPagamentoDialog] = useState<{
    open: boolean;
    lancamentoId: string;
    tipo: 'confirmar' | 'cancelar';
  }>({ open: false, lancamentoId: '', tipo: 'confirmar' });
  const [dataRecebimento, setDataRecebimento] = useState<Date>(new Date());

  const [valoresFinanceiros, setValoresFinanceiros] = useState({
    aReceber: 0,
    aPagar: 0,
    titulosAberto: 0,
    contasVencer: 0
  });

  const [lancamentoForm, setLancamentoForm] = useState({
    tipo: 'entrada',
    valor: '',
    descricao: '',
    categoria: '',
    conta: 'conta_corrente',
    fornecedor: 'cliente_joao',
    paga: false,
    dataEmissao: new Date(),
    dataPagamento: new Date(2024, 7, 29),
    dataRealizada: new Date(2024, 7, 29),
    dataEsperada: new Date(2024, 7, 29)
  });

  const [filtrosExtrato, setFiltrosExtrato] = useState({
    dataInicio: null as Date | null,
    dataFim: null as Date | null,
    valorMinimo: '',
    valorMaximo: '',
    conta: 'todas',
    categoria: 'todas',
    descricao: '',
    tipo: 'todos',
    status: 'todos',
    fornecedor: 'todos'
  });

  const extratoColumnOptions: Option[] = [
    { value: 'tipo', label: 'Tipo' },
    { value: 'descricao', label: 'Descrição' },
    { value: 'categoria', label: 'Categoria' },
    { value: 'conta', label: 'Conta' },
    { value: 'valor', label: 'Valor' },
    { value: 'dataEsperada', label: 'Data Esperada' },
    { value: 'dataRealizada', label: 'Data Realizada' },
    { value: 'status', label: 'Status' },
    { value: 'fornecedor', label: 'Fornecedor' },
  ];

  const [selectedExtratoColumns, setSelectedExtratoColumns] = useState<Option[]>([
    { value: 'tipo', label: 'Tipo' },
    { value: 'descricao', label: 'Descrição' },
    { value: 'categoria', label: 'Categoria' },
    { value: 'conta', label: 'Conta' },
    { value: 'valor', label: 'Valor' },
    { value: 'dataEsperada', label: 'Data Esperada' },
    { value: 'dataRealizada', label: 'Data Realizada' },
    { value: 'status', label: 'Status' },
    { value: 'fornecedor', label: 'Fornecedor' },
  ]);

  const colunasVisiveis = {
    tipo: selectedExtratoColumns.some(col => col.value === 'tipo'),
    descricao: selectedExtratoColumns.some(col => col.value === 'descricao'),
    categoria: selectedExtratoColumns.some(col => col.value === 'categoria'),
    conta: selectedExtratoColumns.some(col => col.value === 'conta'),
    valor: selectedExtratoColumns.some(col => col.value === 'valor'),
    dataEsperada: selectedExtratoColumns.some(col => col.value === 'dataEsperada'),
    dataRealizada: selectedExtratoColumns.some(col => col.value === 'dataRealizada'),
    status: selectedExtratoColumns.some(col => col.value === 'status'),
    fornecedor: selectedExtratoColumns.some(col => col.value === 'fornecedor'),
  };

  const fornecedores = [
    { id: 'cliente_joao', nome: 'João Silva', tipo: 'cliente' },
    { id: 'cliente_maria', nome: 'Maria Santos', tipo: 'cliente' },
    { id: 'cliente_pedro', nome: 'Pedro Costa', tipo: 'cliente' },
    { id: 'fornecedor_hidraulica', nome: 'Hidráulica Central', tipo: 'fornecedor' },
    { id: 'fornecedor_pecas', nome: 'Peças & Equipamentos Ltda', tipo: 'fornecedor' },
    { id: 'fornecedor_manutencao', nome: 'Manutenção Express', tipo: 'fornecedor' },
    { id: 'funcionario', nome: 'Funcionário', tipo: 'funcionario' },
    { id: 'posto_combustivel', nome: 'Posto Combustível', tipo: 'fornecedor' }
  ];

  const contasBancarias = [
    { id: 'conta_corrente', nome: 'Conta Corrente - Banco do Brasil', saldo: 0 },
    { id: 'conta_poupanca', nome: 'Poupança - Banco do Brasil', saldo: 0 },
    { id: 'conta_itau', nome: 'Conta Corrente - Itaú', saldo: 0 },
    { id: 'conta_caixa', nome: 'Conta Corrente - Caixa', saldo: 0 }
  ];

  // Calcular saldos das contas baseado nos lançamentos reais
  const saldosContas = useMemo(() => {
    const saldos: Record<string, number> = {
      conta_corrente: 0,
      conta_poupanca: 0,
      conta_itau: 0,
      conta_caixa: 0
    };

    lancamentos.forEach(lancamento => {
      if (lancamento.pago && lancamento.contaBancaria) {
        const valor = lancamento.tipo === 'entrada' ? lancamento.valor : -lancamento.valor;
        if (saldos.hasOwnProperty(lancamento.contaBancaria)) {
          saldos[lancamento.contaBancaria] += valor;
        }
      }
    });

    return saldos;
  }, [lancamentos]);

  // Atualizar saldos das contas
  const contasBancariasAtualizadas = contasBancarias.map(conta => ({
    ...conta,
    saldo: saldosContas[conta.id] || 0
  }));

  const extratoData = useMemo(() => {
    return lancamentos.map(lancamento => ({
      id: lancamento.id,
      hora: new Date(lancamento.dataEsperada).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      tipo: lancamento.tipo,
      descricao: lancamento.descricao,
      categoria: getNomeCategoriaMae(lancamento.categoriaId || '') || 'Sem categoria',
      valor: lancamento.valor,
      conta: lancamento.contaBancaria,
      dataEsperada: new Date(lancamento.dataEsperada),
      dataRealizada: lancamento.dataRealizada ? new Date(lancamento.dataRealizada) : null,
      pago: lancamento.pago,
      fornecedor: lancamento.fornecedorCliente || ''
    }));
  }, [lancamentos, getNomeCategoriaMae]);

  const saldoTotal = contasBancariasAtualizadas.reduce((acc, conta) => acc + conta.saldo, 0);
  
  // Calcular entradas e saídas do mês atual
  const hoje = new Date();
  const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

  const entradasMesAtual = useMemo(() => {
    return lancamentos
      .filter(l => {
        const data = new Date(l.dataEmissao);
        return l.tipo === 'entrada' && l.pago && l.dataRealizada && data >= primeiroDiaMes && data <= ultimoDiaMes;
      })
      .reduce((acc, l) => acc + l.valor, 0);
  }, [lancamentos]);

  const saidasMesAtual = useMemo(() => {
    return lancamentos
      .filter(l => {
        const data = new Date(l.dataEmissao);
        return l.tipo === 'saida' && l.pago && l.dataRealizada && data >= primeiroDiaMes && data <= ultimoDiaMes;
      })
      .reduce((acc, l) => acc + l.valor, 0);
  }, [lancamentos]);

  const contaAtual = contasBancariasAtualizadas.find(conta => conta.id === contaSelecionada);
  const saldoContaSelecionada = contaAtual ? contaAtual.saldo : saldoTotal;

  // Cálculos dos cards - usando dados reais do banco
  // Apenas lançamentos PAGOS com data realizada são contabilizados
  const totalEntradas = lancamentos
    .filter(item => item.tipo === 'entrada' && item.pago && item.dataRealizada)
    .reduce((acc, item) => acc + item.valor, 0);
  
  const totalSaidas = lancamentos
    .filter(item => item.tipo === 'saida' && item.pago && item.dataRealizada)
    .reduce((acc, item) => acc + item.valor, 0);
  
  const saldoDia = totalEntradas - totalSaidas;

  const getStatusPagamento = (dataEsperada: Date, dataRealizada: Date | null, pago: boolean) => {
    if (pago) return 'pago';
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    dataEsperada.setHours(0, 0, 0, 0);
    if (dataEsperada < hoje) return 'atrasado';
    return 'no_prazo';
  };

  const limparFiltros = () => {
    setFiltrosExtrato({
      dataInicio: null,
      dataFim: null,
      valorMinimo: '',
      valorMaximo: '',
      conta: 'todas',
      categoria: 'todas',
      descricao: '',
      tipo: 'todos',
      status: 'todos',
      fornecedor: 'todos'
    });
  };

  const extratoFiltrado = extratoData.filter(item => {
    // Filtro de tipo
    if (filtrosExtrato.tipo !== 'todos' && item.tipo !== filtrosExtrato.tipo) return false;
    
    // Filtro de conta
    if (filtrosExtrato.conta !== 'todas' && item.conta !== filtrosExtrato.conta) return false;
    
    // Filtro de categoria
    if (filtrosExtrato.categoria !== 'todas' && item.categoria !== filtrosExtrato.categoria) return false;
    
    // Filtro de fornecedor
    if (filtrosExtrato.fornecedor !== 'todos' && item.fornecedor !== filtrosExtrato.fornecedor) return false;
    
    // Filtro de descrição
    if (filtrosExtrato.descricao && !item.descricao.toLowerCase().includes(filtrosExtrato.descricao.toLowerCase())) return false;
    
    // Filtro de valor mínimo
    if (filtrosExtrato.valorMinimo && item.valor < parseFloat(filtrosExtrato.valorMinimo)) return false;
    
    // Filtro de valor máximo
    if (filtrosExtrato.valorMaximo && item.valor > parseFloat(filtrosExtrato.valorMaximo)) return false;
    
    // Filtro de status
    if (filtrosExtrato.status !== 'todos') {
      const status = getStatusPagamento(item.dataEsperada, item.dataRealizada, item.pago);
      if (status !== filtrosExtrato.status) return false;
    }
    
    // Filtro de data início
    if (filtrosExtrato.dataInicio) {
      const dataInicio = new Date(filtrosExtrato.dataInicio);
      dataInicio.setHours(0, 0, 0, 0);
      const dataItem = new Date(item.dataEsperada);
      dataItem.setHours(0, 0, 0, 0);
      if (dataItem < dataInicio) return false;
    }
    
    // Filtro de data fim
    if (filtrosExtrato.dataFim) {
      const dataFim = new Date(filtrosExtrato.dataFim);
      dataFim.setHours(23, 59, 59, 999);
      const dataItem = new Date(item.dataEsperada);
      dataItem.setHours(0, 0, 0, 0);
      if (dataItem > dataFim) return false;
    }
    
    return true;
  });

  const handleLancamento = async () => {
    if (!lancamentoForm.valor || !lancamentoForm.descricao || !lancamentoForm.categoria) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const sucesso = await adicionarLancamento({
      tipo: lancamentoForm.tipo as 'entrada' | 'saida',
      descricao: lancamentoForm.descricao,
      categoriaId: lancamentoForm.categoria,
      valor: parseFloat(lancamentoForm.valor),
      contaBancaria: lancamentoForm.conta,
      dataEsperada: lancamentoForm.dataEsperada,
      dataRealizada: lancamentoForm.paga ? lancamentoForm.dataRealizada : undefined,
      dataEmissao: lancamentoForm.dataEmissao,
      pago: lancamentoForm.paga,
      fornecedorCliente: lancamentoForm.fornecedor,
      formaPagamento: 'a_vista',
    });

    if (sucesso) {
      toast.success("Lançamento adicionado com sucesso!");
      setLancamentoForm({
        tipo: 'entrada',
        valor: '',
        descricao: '',
        categoria: '',
        conta: 'conta_corrente',
        fornecedor: 'cliente_joao',
        paga: false,
        dataEmissao: new Date(),
        dataPagamento: new Date(),
        dataRealizada: new Date(),
        dataEsperada: new Date()
      });
      setIsLancamentoDialogOpen(false);
    } else {
      toast.error("Erro ao adicionar lançamento");
    }
  };

  const handleBuscarMovimentacoes = () => {
    if (!periodoSelecionado && !dataInicial && !dataFinal) {
      setMovimentacoesFiltradas([]);
      calcularValoresFinanceiros([]);
      return;
    }

    // Filtrar lançamentos por período
    const movimentacoes = lancamentos.map(l => ({
      id: l.id,
      data: new Date(l.dataEsperada).toLocaleDateString('pt-BR'),
      descricao: l.descricao,
      tipo: l.tipo === 'entrada' ? 'receita' : 'despesa',
      categoria: getNomeCategoriaMae(l.categoriaId || '') || 'Sem categoria',
      valor: l.valor,
      status: l.pago ? 'pago' : (new Date(l.dataEsperada) < new Date() ? 'vencido' : 'pendente')
    }));
    
    setMovimentacoesFiltradas(movimentacoes);
    calcularValoresFinanceiros(movimentacoes);
  };

  const calcularValoresFinanceiros = (movimentacoes: any[]) => {
    const totalReceber = movimentacoes
      .filter(m => m.tipo === 'receita' && m.status !== 'pago')
      .reduce((acc, m) => acc + m.valor, 0);
    
    const totalPagar = movimentacoes
      .filter(m => m.tipo === 'despesa' && m.status !== 'pago')
      .reduce((acc, m) => acc + m.valor, 0);
    
    const titulosAberto = movimentacoes.filter(m => m.tipo === 'receita' && m.status !== 'pago').length;
    const contasVencer = movimentacoes.filter(m => m.tipo === 'despesa' && m.status !== 'pago').length;

    setValoresFinanceiros({
      aReceber: totalReceber,
      aPagar: totalPagar,
      titulosAberto,
      contasVencer
    });
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Funções para confirmação de recebimento/pagamento
  const handleConfirmarRecebimento = async (lancamentoId: string, dataRecebimento: Date) => {
    const sucesso = await atualizarLancamento(lancamentoId, {
      pago: true,
      dataRealizada: dataRecebimento
    });
    
    if (sucesso) {
      toast.success("Recebimento/Pagamento confirmado!");
      setConfirmarPagamentoDialog({ open: false, lancamentoId: '', tipo: 'confirmar' });
    } else {
      toast.error("Erro ao confirmar recebimento/pagamento");
    }
  };

  const handleCancelarPagamento = async (lancamentoId: string) => {
    const sucesso = await atualizarLancamento(lancamentoId, {
      pago: false,
      dataRealizada: null
    });
    
    if (sucesso) {
      toast.success("Pagamento cancelado. Status atualizado.");
      setConfirmarPagamentoDialog({ open: false, lancamentoId: '', tipo: 'cancelar' });
    } else {
      toast.error("Erro ao cancelar pagamento");
    }
  };

  // Calcular receitas e despesas operacionais a partir dos lançamentos
  const receitasOperacionais = useMemo(() => {
    const totalReceitas = lancamentos
      .filter(l => l.tipo === 'entrada' && l.pago && l.dataRealizada)
      .reduce((acc, l) => acc + l.valor, 0);
    
    return [
      { item: "Total Receitas Operacionais", valor: totalReceitas, isTotal: true }
    ];
  }, [lancamentos]);

  const despesasOperacionais = useMemo(() => {
    const totalDespesas = lancamentos
      .filter(l => l.tipo === 'saida' && l.pago && l.dataRealizada)
      .reduce((acc, l) => acc + l.valor, 0);
    
    return [
      { item: "Total Despesas Operacionais", valor: -totalDespesas, isTotal: true }
    ];
  }, [lancamentos]);

  // Obter o lançamento atual para exibir informações no modal
  const lancamentoAtual = lancamentos.find(l => l.id === confirmarPagamentoDialog.lancamentoId);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">DFC - Fluxo de Caixa</h1>
          <p className="text-muted-foreground">Demonstração do Fluxo de Caixa com Extrato e Planejamento</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Card className="border-2 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                {contaSelecionada === 'todas' ? 'Saldo Total' : 'Saldo da Conta'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-sm text-muted-foreground">Carregando...</div>
              ) : (
                <>
                  <div className={`text-xl font-bold ${
                    (contaSelecionada === 'todas' ? saldoTotal : saldoContaSelecionada) >= 0 
                      ? 'text-green-600' 
                      : 'text-destructive'
                  }`}>
                    {formatCurrency(contaSelecionada === 'todas' ? saldoTotal : saldoContaSelecionada)}
                  </div>
                  <Select value={contaSelecionada} onValueChange={setContaSelecionada}>
                    <SelectTrigger className="w-full mt-2 h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas as contas</SelectItem>
                      {contasBancariasAtualizadas.map(conta => (
                        <SelectItem key={conta.id} value={conta.id}>
                          {conta.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-2 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Entradas do Mês</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-green-600">{formatCurrency(entradasMesAtual)}</div>
              <Badge variant="outline" className="text-xs mt-1">
                {hoje.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </Badge>
            </CardContent>
          </Card>

          <Card className="border-2 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Saídas do Mês</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-destructive">{formatCurrency(saidasMesAtual)}</div>
              <Badge variant="outline" className="text-xs mt-1">
                {hoje.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </Badge>
            </CardContent>
          </Card>

          <Card className="border-2 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Resultado do Mês</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-xl font-bold ${
                (entradasMesAtual - saidasMesAtual) >= 0 
                  ? 'text-green-600' 
                  : 'text-destructive'
              }`}>
                {formatCurrency(entradasMesAtual - saidasMesAtual)}
              </div>
              <Badge variant="outline" className="text-xs mt-1">
                {(entradasMesAtual - saidasMesAtual) >= 0 ? 'Resultado positivo' : 'Resultado negativo'}
              </Badge>
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
              <CardHeader className="space-y-4">
                <CardTitle>Demonstração Detalhada do Fluxo de Caixa</CardTitle>
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Label>Data Início:</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-[200px] justify-start text-left font-normal",
                            !dfcDataInicio && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dfcDataInicio ? format(dfcDataInicio, "dd/MM/yyyy") : "Selecionar data"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dfcDataInicio || undefined}
                          onSelect={(date) => setDfcDataInicio(date || null)}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="flex items-center gap-2">
                    <Label>Data Fim:</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-[200px] justify-start text-left font-normal",
                            !dfcDataFim && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dfcDataFim ? format(dfcDataFim, "dd/MM/yyyy") : "Selecionar data"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dfcDataFim || undefined}
                          onSelect={(date) => setDfcDataFim(date || null)}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
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

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" size="sm" onClick={() => {
                    try {
                      const doc = new jsPDF();
                      const dataInicio = dfcDataInicio ? format(dfcDataInicio, "dd/MM/yyyy") : "Não definida";
                      const dataFim = dfcDataFim ? format(dfcDataFim, "dd/MM/yyyy") : "Não definida";
                      
                      // Título
                      doc.setFontSize(16);
                      doc.text("Demonstracao Detalhada do Fluxo de Caixa", 20, 20);
                      
                      // Período
                      doc.setFontSize(10);
                      doc.text(`Periodo: ${dataInicio} a ${dataFim}`, 20, 30);
                      
                      // Receitas Operacionais
                      doc.setFontSize(12);
                      doc.text("Receitas Operacionais", 20, 45);
                      doc.setFontSize(10);
                      let y = 55;
                      
                      receitasOperacionais.forEach(item => {
                        const valor = formatCurrency(item.valor);
                        const percentual = ((item.valor / 85000) * 100).toFixed(1) + "%";
                        doc.text(item.item, 20, y);
                        doc.text(valor, 120, y);
                        doc.text(percentual, 170, y);
                        y += 8;
                      });
                      
                      // Despesas Operacionais
                      y += 5;
                      doc.setFontSize(12);
                      doc.text("Despesas Operacionais", 20, y);
                      y += 10;
                      doc.setFontSize(10);
                      
                      despesasOperacionais.forEach(item => {
                        const valor = formatCurrency(item.valor);
                        const percentual = ((item.valor / 85000) * 100).toFixed(1) + "%";
                        doc.text(`(-) ${item.item}`, 20, y);
                        doc.text(valor, 120, y);
                        doc.text(percentual, 170, y);
                        y += 8;
                      });
                      
                      doc.save(`DFC_${dataInicio.replace(/\//g, "-")}_${dataFim.replace(/\//g, "-")}.pdf`);
                      toast.success("PDF exportado com sucesso!");
                    } catch (error) {
                      console.error("Erro ao exportar PDF:", error);
                      toast.error("Erro ao exportar PDF");
                    }
                  }}>
                    <FileDown className="h-4 w-4 mr-2" />PDF
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => {
                    try {
                      const dataInicio = dfcDataInicio ? format(dfcDataInicio, "dd/MM/yyyy") : "Não definida";
                      const dataFim = dfcDataFim ? format(dfcDataFim, "dd/MM/yyyy") : "Não definida";
                      
                      // Preparar dados para Excel
                      const dados: any[] = [
                        ["Demonstração Detalhada do Fluxo de Caixa"],
                        [`Período: ${dataInicio} a ${dataFim}`],
                        [],
                        ["Conta", "Valor", "% da Receita"],
                        []
                      ];
                      
                      // Adicionar receitas
                      dados.push(["RECEITAS OPERACIONAIS"]);
                      receitasOperacionais.forEach(item => {
                        dados.push([
                          item.item,
                          item.valor,
                          ((item.valor / 85000) * 100).toFixed(1) + "%"
                        ]);
                      });
                      
                      dados.push([]);
                      
                      // Adicionar despesas
                      dados.push(["DESPESAS OPERACIONAIS"]);
                      despesasOperacionais.forEach(item => {
                        dados.push([
                          `(-) ${item.item}`,
                          item.valor,
                          ((item.valor / 85000) * 100).toFixed(1) + "%"
                        ]);
                      });
                      
                      // Criar planilha
                      const ws = XLSX.utils.aoa_to_sheet(dados);
                      const wb = XLSX.utils.book_new();
                      XLSX.utils.book_append_sheet(wb, ws, "DFC");
                      
                      // Salvar arquivo
                      XLSX.writeFile(wb, `DFC_${dataInicio.replace(/\//g, "-")}_${dataFim.replace(/\//g, "-")}.xlsx`);
                      toast.success("Excel exportado com sucesso!");
                    } catch (error) {
                      console.error("Erro ao exportar Excel:", error);
                      toast.error("Erro ao exportar Excel");
                    }
                  }}>
                    <FileDown className="h-4 w-4 mr-2" />Excel
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resumo da Variação do Caixa</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell>Saldo Inicial de Caixa</TableCell>
                      <TableCell className="text-right">{formatCurrency(0)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>(+) Receitas Operacionais</TableCell>
                      <TableCell className="text-right text-green-600">{formatCurrency(entradasMesAtual)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>(-) Despesas Operacionais</TableCell>
                      <TableCell className="text-right text-destructive">{formatCurrency(saidasMesAtual)}</TableCell>
                    </TableRow>
                    <TableRow className="border-t-2 bg-muted/50">
                      <TableCell className="font-bold">Variação Líquida do Caixa</TableCell>
                      <TableCell className={`text-right font-bold ${
                        (entradasMesAtual - saidasMesAtual) >= 0 
                          ? 'text-green-600' 
                          : 'text-destructive'
                      }`}>
                        {formatCurrency(entradasMesAtual - saidasMesAtual)}
                      </TableCell>
                    </TableRow>
                    <TableRow className="border-t-2 bg-muted/50">
                      <TableCell className="font-bold">Saldo Final de Caixa</TableCell>
                      <TableCell className={`text-right font-bold ${
                        saldoTotal >= 0 
                          ? 'text-green-600' 
                          : 'text-destructive'
                      }`}>
                        {formatCurrency(saldoTotal)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="extrato" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between mb-4">
                  <CardTitle>Extrato do Dia - {new Date(2024, 7, 29).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</CardTitle>
                  <div className="flex gap-2">
                    <Select value={contaSelecionada} onValueChange={setContaSelecionada}>
                      <SelectTrigger className="w-[280px]">
                        <SelectValue placeholder="Selecionar conta" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todas">Todas as contas</SelectItem>
                        {contasBancarias.map(conta => (
                          <SelectItem key={conta.id} value={conta.id}>{conta.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Dialog open={isLancamentoDialogOpen} onOpenChange={setIsLancamentoDialogOpen}>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          Novo Lançamento
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl overflow-hidden p-0">
                        <div className={cn(
                          "h-4 w-full transition-colors duration-300",
                          lancamentoForm.tipo === 'entrada' ? "bg-green-500" : "bg-red-500"
                        )} />
                        <div className="p-6">
                          <DialogHeader>
                            <DialogTitle>Novo Lançamento</DialogTitle>
                            <DialogDescription>Adicione um novo lançamento ao extrato bancário</DialogDescription>
                          </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Tipo de Lançamento</Label>
                              <Select value={lancamentoForm.tipo} onValueChange={(value: 'entrada' | 'saida') => setLancamentoForm(prev => ({ ...prev, tipo: value }))}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="entrada">Entrada</SelectItem>
                                  <SelectItem value="saida">Saída</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Valor</Label>
                              <Input
                                type="number"
                                placeholder="0,00"
                                value={lancamentoForm.valor}
                                onChange={(e) => setLancamentoForm(prev => ({ ...prev, valor: e.target.value }))}
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Data de Emissão</Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !lancamentoForm.dataEmissao && "text-muted-foreground")}>
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {lancamentoForm.dataEmissao ? format(lancamentoForm.dataEmissao, "dd/MM/yyyy") : "Selecionar data"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0">
                                <Calendar
                                  mode="single"
                                  selected={lancamentoForm.dataEmissao}
                                  onSelect={(date) => date && setLancamentoForm(prev => ({ ...prev, dataEmissao: date }))}
                                  initialFocus
                                  className={cn("p-3 pointer-events-auto")}
                                />
                              </PopoverContent>
                            </Popover>
                          </div>

                          <div className="space-y-2">
                            <Label>Descrição</Label>
                            <Textarea
                              placeholder="Descrição do lançamento"
                              value={lancamentoForm.descricao}
                              onChange={(e) => setLancamentoForm(prev => ({ ...prev, descricao: e.target.value }))}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Categoria</Label>
                              <Select value={lancamentoForm.categoria} onValueChange={(value) => setLancamentoForm(prev => ({ ...prev, categoria: value }))}>
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
                              <Label>Conta Bancária</Label>
                              <Select value={lancamentoForm.conta} onValueChange={(value) => setLancamentoForm(prev => ({ ...prev, conta: value }))}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {contasBancarias.map(conta => (
                                    <SelectItem key={conta.id} value={conta.id}>{conta.nome}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Fornecedor/Cliente</Label>
                            <Select value={lancamentoForm.fornecedor} onValueChange={(value) => setLancamentoForm(prev => ({ ...prev, fornecedor: value }))}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {fornecedores.map(fornecedor => (
                                  <SelectItem key={fornecedor.id} value={fornecedor.id}>
                                    {fornecedor.nome} ({fornecedor.tipo})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Data Esperada</Label>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !lancamentoForm.dataEsperada && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {lancamentoForm.dataEsperada ? format(lancamentoForm.dataEsperada, "dd/MM/yyyy") : "Selecionar data"}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                  <Calendar
                                    mode="single"
                                    selected={lancamentoForm.dataEsperada}
                                    onSelect={(date) => date && setLancamentoForm(prev => ({ ...prev, dataEsperada: date }))}
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2 mb-2">
                                <Checkbox
                                  id="paga"
                                  checked={lancamentoForm.paga}
                                  onCheckedChange={(checked) => setLancamentoForm(prev => ({ ...prev, paga: checked as boolean }))}
                                />
                                <Label htmlFor="paga" className="cursor-pointer">Já foi paga/recebida?</Label>
                              </div>
                              {lancamentoForm.paga && (
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !lancamentoForm.dataRealizada && "text-muted-foreground")}>
                                      <CalendarIcon className="mr-2 h-4 w-4" />
                                      {lancamentoForm.dataRealizada ? format(lancamentoForm.dataRealizada, "dd/MM/yyyy") : "Data realizada"}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0">
                                    <Calendar
                                      mode="single"
                                      selected={lancamentoForm.dataRealizada}
                                      onSelect={(date) => date && setLancamentoForm(prev => ({ ...prev, dataRealizada: date }))}
                                      initialFocus
                                    />
                                  </PopoverContent>
                                </Popover>
                              )}
                            </div>
                          </div>
                        </div>
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setIsLancamentoDialogOpen(false)}>Cancelar</Button>
                            <Button onClick={handleLancamento}>Adicionar Lançamento</Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2 cursor-pointer" onClick={() => setColunasVisiveisExpanded(!colunasVisiveisExpanded)}>
                    <Label className="text-sm font-medium">Colunas Visíveis</Label>
                    {colunasVisiveisExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                  {colunasVisiveisExpanded && (
                    <MultipleSelector
                      value={selectedExtratoColumns}
                      onChange={setSelectedExtratoColumns}
                      options={extratoColumnOptions}
                      placeholder="Selecione as colunas para exibir"
                      emptyIndicator={
                        <p className="text-center text-sm text-muted-foreground">Nenhuma coluna encontrada.</p>
                      }
                    />
                  )}
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2 cursor-pointer" onClick={() => setFiltrosExpanded(!filtrosExpanded)}>
                    <Label className="text-sm font-medium">Filtros</Label>
                    {filtrosExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                  {filtrosExpanded && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 border rounded-lg bg-muted/30">
                      <div className="space-y-2">
                        <Label className="text-xs">Data Início</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("w-full h-9 justify-start text-left font-normal", !filtrosExtrato.dataInicio && "text-muted-foreground")}>
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {filtrosExtrato.dataInicio ? format(filtrosExtrato.dataInicio, "dd/MM/yyyy") : "Selecionar"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={filtrosExtrato.dataInicio || undefined}
                              onSelect={(date) => setFiltrosExtrato(prev => ({ ...prev, dataInicio: date || null }))}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs">Data Fim</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("w-full h-9 justify-start text-left font-normal", !filtrosExtrato.dataFim && "text-muted-foreground")}>
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {filtrosExtrato.dataFim ? format(filtrosExtrato.dataFim, "dd/MM/yyyy") : "Selecionar"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={filtrosExtrato.dataFim || undefined}
                              onSelect={(date) => setFiltrosExtrato(prev => ({ ...prev, dataFim: date || null }))}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs">Tipo</Label>
                        <Select value={filtrosExtrato.tipo} onValueChange={(value) => setFiltrosExtrato(prev => ({ ...prev, tipo: value }))}>
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todos">Todos</SelectItem>
                            <SelectItem value="entrada">Entrada</SelectItem>
                            <SelectItem value="saida">Saída</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs">Conta</Label>
                        <Select value={filtrosExtrato.conta} onValueChange={(value) => setFiltrosExtrato(prev => ({ ...prev, conta: value }))}>
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todas">Todas</SelectItem>
                            {contasBancarias.map(conta => (
                              <SelectItem key={conta.id} value={conta.id}>{conta.nome.split(' - ')[1]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs">Categoria</Label>
                        <Select value={filtrosExtrato.categoria} onValueChange={(value) => setFiltrosExtrato(prev => ({ ...prev, categoria: value }))}>
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todas">Todas</SelectItem>
                            {getCategoriasForSelect().map(cat => (
                              <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs">Fornecedor/Cliente</Label>
                        <Select value={filtrosExtrato.fornecedor} onValueChange={(value) => setFiltrosExtrato(prev => ({ ...prev, fornecedor: value }))}>
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todos">Todos</SelectItem>
                            {fornecedores.map(f => (
                              <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs">Status</Label>
                        <Select value={filtrosExtrato.status} onValueChange={(value) => setFiltrosExtrato(prev => ({ ...prev, status: value }))}>
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todos">Todos</SelectItem>
                            <SelectItem value="pago">Pago</SelectItem>
                            <SelectItem value="no_prazo">No Prazo</SelectItem>
                            <SelectItem value="atrasado">Atrasado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs">Descrição</Label>
                        <Input
                          placeholder="Buscar por descrição"
                          value={filtrosExtrato.descricao}
                          onChange={(e) => setFiltrosExtrato(prev => ({ ...prev, descricao: e.target.value }))}
                          className="h-9"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs">Valor Mínimo</Label>
                        <Input
                          type="number"
                          placeholder="R$ 0,00"
                          value={filtrosExtrato.valorMinimo}
                          onChange={(e) => setFiltrosExtrato(prev => ({ ...prev, valorMinimo: e.target.value }))}
                          className="h-9"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs">Valor Máximo</Label>
                        <Input
                          type="number"
                          placeholder="R$ 0,00"
                          value={filtrosExtrato.valorMaximo}
                          onChange={(e) => setFiltrosExtrato(prev => ({ ...prev, valorMaximo: e.target.value }))}
                          className="h-9"
                        />
                      </div>

                       <div className="col-span-full flex gap-2">
                        <Button variant="outline" onClick={limparFiltros} className="flex-1">
                          <X className="h-4 w-4 mr-2" />
                          Limpar Filtros
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent>
                <div className="flex justify-end gap-2 mb-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const doc = new jsPDF();
                      
                      doc.setFontSize(18);
                      doc.text('Extrato Bancário', 14, 20);
                      
                      doc.setFontSize(10);
                      let y = 30;
                      
                      // Informações dos filtros aplicados
                      if (filtrosExtrato.dataInicio || filtrosExtrato.dataFim) {
                        doc.text(`Período: ${filtrosExtrato.dataInicio ? format(filtrosExtrato.dataInicio, "dd/MM/yyyy") : "Início"} até ${filtrosExtrato.dataFim ? format(filtrosExtrato.dataFim, "dd/MM/yyyy") : "Atual"}`, 14, y);
                        y += 6;
                      }
                      if (filtrosExtrato.tipo !== 'todos') {
                        doc.text(`Tipo: ${filtrosExtrato.tipo === 'entrada' ? 'Entrada' : 'Saída'}`, 14, y);
                        y += 6;
                      }
                      if (filtrosExtrato.conta !== 'todas') {
                        const conta = contasBancarias.find(c => c.id === filtrosExtrato.conta);
                        doc.text(`Conta: ${conta?.nome || ''}`, 14, y);
                        y += 6;
                      }
                      
                      y += 5;
                      
                      // Cabeçalhos
                      doc.setFontSize(9);
                      doc.text('Data', 14, y);
                      doc.text('Descrição', 40, y);
                      doc.text('Categoria', 90, y);
                      doc.text('Valor', 140, y);
                      doc.text('Status', 170, y);
                      
                      y += 5;
                      doc.line(14, y, 196, y);
                      y += 5;
                      
                      // Dados
                      extratoFiltrado.forEach((item, index) => {
                        if (y > 270) {
                          doc.addPage();
                          y = 20;
                        }
                        
                        const status = getStatusPagamento(item.dataEsperada, item.dataRealizada, item.pago);
                        
                        doc.text(format(item.dataEsperada, "dd/MM/yyyy"), 14, y);
                        doc.text(item.descricao.substring(0, 25), 40, y);
                        doc.text(item.categoria.substring(0, 20), 90, y);
                        doc.text(formatCurrency(item.valor), 140, y);
                        doc.text(status === 'pago' ? 'Pago' : status === 'atrasado' ? 'Atrasado' : 'No Prazo', 170, y);
                        
                        y += 6;
                      });
                      
                      // Totais
                      y += 5;
                      doc.line(14, y, 196, y);
                      y += 5;
                      
                      const totalEntradas = extratoFiltrado.filter(i => i.tipo === 'entrada').reduce((acc, i) => acc + i.valor, 0);
                      const totalSaidas = extratoFiltrado.filter(i => i.tipo === 'saida').reduce((acc, i) => acc + i.valor, 0);
                      
                      doc.setFontSize(10);
                      doc.text('Total Entradas:', 14, y);
                      doc.text(formatCurrency(totalEntradas), 140, y);
                      y += 6;
                      doc.text('Total Saídas:', 14, y);
                      doc.text(formatCurrency(totalSaidas), 140, y);
                      y += 6;
                      doc.text('Saldo:', 14, y);
                      doc.text(formatCurrency(totalEntradas - totalSaidas), 140, y);
                      
                      doc.save(`extrato-${format(new Date(), "dd-MM-yyyy")}.pdf`);
                      toast.success("PDF exportado com sucesso!");
                    }}
                  >
                    <FileDown className="h-4 w-4 mr-2" />
                    Exportar PDF
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const dadosExcel = extratoFiltrado.map(item => {
                        const status = getStatusPagamento(item.dataEsperada, item.dataRealizada, item.pago);
                        const conta = contasBancarias.find(c => c.id === item.conta);
                        const fornecedor = fornecedores.find(f => f.id === item.fornecedor);
                        
                        return {
                          'Data Esperada': format(item.dataEsperada, "dd/MM/yyyy"),
                          'Data Realizada': item.dataRealizada ? format(item.dataRealizada, "dd/MM/yyyy") : '-',
                          'Tipo': item.tipo === 'entrada' ? 'Entrada' : 'Saída',
                          'Descrição': item.descricao,
                          'Categoria': item.categoria,
                          'Conta': conta?.nome || '-',
                          'Fornecedor/Cliente': fornecedor?.nome || '-',
                          'Valor': item.valor,
                          'Status': status === 'pago' ? 'Pago' : status === 'atrasado' ? 'Atrasado' : 'No Prazo'
                        };
                      });
                      
                      const ws = XLSX.utils.json_to_sheet(dadosExcel);
                      const wb = XLSX.utils.book_new();
                      XLSX.utils.book_append_sheet(wb, ws, "Extrato");
                      
                      // Adicionar totais
                      const totalEntradas = extratoFiltrado.filter(i => i.tipo === 'entrada').reduce((acc, i) => acc + i.valor, 0);
                      const totalSaidas = extratoFiltrado.filter(i => i.tipo === 'saida').reduce((acc, i) => acc + i.valor, 0);
                      
                      XLSX.utils.sheet_add_json(ws, [
                        { 'Descrição': 'Total Entradas', 'Valor': totalEntradas },
                        { 'Descrição': 'Total Saídas', 'Valor': totalSaidas },
                        { 'Descrição': 'Saldo', 'Valor': totalEntradas - totalSaidas }
                      ], { skipHeader: true, origin: -1 });
                      
                      XLSX.writeFile(wb, `extrato-${format(new Date(), "dd-MM-yyyy")}.xlsx`);
                      toast.success("Excel exportado com sucesso!");
                    }}
                  >
                    <FileDown className="h-4 w-4 mr-2" />
                    Exportar Excel
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <Card className="bg-green-50 dark:bg-green-950/20 border-2 shadow-lg">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <ArrowDownLeft className="h-4 w-4 text-green-600" />
                        Total de Entradas
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">{formatCurrency(totalEntradas)}</div>
                      <p className="text-xs text-muted-foreground mt-1">Recebimentos do dia</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-red-50 dark:bg-red-950/20 border-2 shadow-lg">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <ArrowUpRight className="h-4 w-4 text-destructive" />
                        Total de Saídas
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-destructive">{formatCurrency(totalSaidas)}</div>
                      <p className="text-xs text-muted-foreground mt-1">Pagamentos do dia</p>
                    </CardContent>
                  </Card>

                  <Card className={saldoDia >= 0 ? "bg-blue-50 dark:bg-blue-950/20 border-2 shadow-lg" : "bg-amber-50 dark:bg-amber-950/20 border-2 shadow-lg"}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Saldo do Dia
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className={`text-2xl font-bold ${saldoDia >= 0 ? 'text-blue-600' : 'text-amber-600'}`}>
                        {formatCurrency(saldoDia)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {saldoDia >= 0 ? 'Resultado positivo' : 'Resultado negativo'}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {colunasVisiveis.tipo && <TableHead>Tipo</TableHead>}
                        {colunasVisiveis.descricao && <TableHead>Descrição</TableHead>}
                        {colunasVisiveis.categoria && <TableHead>Categoria</TableHead>}
                        {colunasVisiveis.conta && <TableHead>Conta</TableHead>}
                        {colunasVisiveis.fornecedor && <TableHead>Fornecedor/Cliente</TableHead>}
                        {colunasVisiveis.valor && <TableHead className="text-right">Valor</TableHead>}
                        {colunasVisiveis.dataEsperada && <TableHead>Data Esperada</TableHead>}
                        {colunasVisiveis.dataRealizada && <TableHead>Data Realizada</TableHead>}
                        {colunasVisiveis.status && <TableHead>Status</TableHead>}
                        <TableHead className="text-center">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {extratoFiltrado.map((item) => {
                        const status = getStatusPagamento(item.dataEsperada, item.dataRealizada, item.pago);
                        const conta = contasBancarias.find(c => c.id === item.conta);
                        const fornecedor = fornecedores.find(f => f.id === item.fornecedor);
                        
                        return (
                          <TableRow key={item.id}>
                            {colunasVisiveis.tipo && (
                              <TableCell>
                                <Badge 
                                  className="gap-1"
                                  style={{
                                    backgroundColor: item.tipo === 'entrada' 
                                      ? 'hsl(142 76% 36%)' 
                                      : 'hsl(0 84% 60%)',
                                    color: 'white',
                                    borderColor: item.tipo === 'entrada' 
                                      ? 'hsl(142 76% 36%)' 
                                      : 'hsl(0 84% 60%)'
                                  }}
                                >
                                  {item.tipo === 'entrada' ? <ArrowDownLeft className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                                  {item.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                                </Badge>
                              </TableCell>
                            )}
                            {colunasVisiveis.descricao && <TableCell>{item.descricao}</TableCell>}
                            {colunasVisiveis.categoria && <TableCell><Badge variant="outline">{item.categoria}</Badge></TableCell>}
                            {colunasVisiveis.conta && <TableCell>{conta?.nome.split(' - ')[1] || '-'}</TableCell>}
                            {colunasVisiveis.fornecedor && <TableCell>{fornecedor?.nome || '-'}</TableCell>}
                            {colunasVisiveis.valor && (
                              <TableCell className={`text-right font-medium ${item.tipo === 'entrada' ? 'text-green-600' : 'text-destructive'}`}>
                                {formatCurrency(item.valor)}
                              </TableCell>
                            )}
                            {colunasVisiveis.dataEsperada && (
                              <TableCell>{format(item.dataEsperada, "dd/MM/yyyy")}</TableCell>
                            )}
                            {colunasVisiveis.dataRealizada && (
                              <TableCell>{item.dataRealizada ? format(item.dataRealizada, "dd/MM/yyyy") : '-'}</TableCell>
                            )}
                            {colunasVisiveis.status && (
                              <TableCell>
                                <Badge variant={
                                  status === 'pago' ? 'default' : 
                                  status === 'atrasado' ? 'destructive' : 
                                  'outline'
                                }>
                                  {status === 'pago' ? 'Pago' : status === 'atrasado' ? 'Atrasado' : 'No Prazo'}
                                </Badge>
                              </TableCell>
                            )}
                            <TableCell className="text-center">
                              {!item.pago ? (
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="h-8 w-8 border-green-500 text-green-600 hover:bg-green-50 hover:text-green-700 dark:hover:bg-green-950"
                                  onClick={() => {
                                    setConfirmarPagamentoDialog({
                                      open: true,
                                      lancamentoId: item.id,
                                      tipo: 'confirmar'
                                    });
                                    setDataRecebimento(new Date());
                                  }}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                              ) : (
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="h-8 w-8 border-red-500 text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950"
                                  onClick={() => {
                                    setConfirmarPagamentoDialog({
                                      open: true,
                                      lancamentoId: item.id,
                                      tipo: 'cancelar'
                                    });
                                  }}
                                >
                                  <Minus className="h-4 w-4" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="planejamento" className="space-y-6">
            {/* Cards de Consulta */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="border-l-4 border-l-green-500 border-2 shadow-lg">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2 text-green-600">
                    <ArrowDownLeft className="h-5 w-5" />
                    <CardTitle className="text-base font-medium">A Receber</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-3xl font-bold text-green-600">
                    {formatCurrency(valoresFinanceiros.aReceber)}
                  </div>
                  <p className="text-sm text-muted-foreground">Próximos 30 dias</p>
                  <p className="text-xs text-muted-foreground">{valoresFinanceiros.titulosAberto} títulos em aberto</p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-red-500 border-2 shadow-lg">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2 text-destructive">
                    <ArrowUpRight className="h-5 w-5" />
                    <CardTitle className="text-base font-medium">A Pagar</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-3xl font-bold text-destructive">
                    {formatCurrency(valoresFinanceiros.aPagar)}
                  </div>
                  <p className="text-sm text-muted-foreground">Próximos 30 dias</p>
                  <p className="text-xs text-muted-foreground">{valoresFinanceiros.contasVencer} contas a vencer</p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-blue-500 border-2 shadow-lg">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2 text-blue-600">
                    <DollarSign className="h-5 w-5" />
                    <CardTitle className="text-base font-medium">Saldo Previsto</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-3xl font-bold text-blue-600">
                    {formatCurrency(valoresFinanceiros.aReceber - valoresFinanceiros.aPagar)}
                  </div>
                  <p className="text-sm text-muted-foreground">Saldo final projetado</p>
                  <p className="text-xs text-muted-foreground">
                    {(((valoresFinanceiros.aReceber - valoresFinanceiros.aPagar) / valoresFinanceiros.aPagar) * 100).toFixed(1)}% de crescimento
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Planejamento de Fluxo de Caixa</CardTitle>
                    <p className="text-sm text-muted-foreground">Busque e visualize movimentações financeiras por período</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPlanejamentoExpanded(!planejamentoExpanded)}
                  >
                    {planejamentoExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardHeader>
              {planejamentoExpanded && (
                <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Período Pré-definido</Label>
                    <Select value={periodoSelecionado} onValueChange={setPeriodoSelecionado}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar período" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="personalizado">Personalizado</SelectItem>
                        <SelectItem value="hoje">Hoje</SelectItem>
                        <SelectItem value="semana">Esta Semana</SelectItem>
                        <SelectItem value="mes">Este Mês</SelectItem>
                        <SelectItem value="trimestre">Este Trimestre</SelectItem>
                        <SelectItem value="ano">Este Ano</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Data Inicial</Label>
                    <Input
                      type="date"
                      value={dataInicial}
                      onChange={(e) => setDataInicial(e.target.value)}
                      disabled={periodoSelecionado !== ''}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Data Final</Label>
                    <Input
                      type="date"
                      value={dataFinal}
                      onChange={(e) => setDataFinal(e.target.value)}
                      disabled={periodoSelecionado !== ''}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Conta Bancária</Label>
                  <Select value={contaBancariaFiltro} onValueChange={setContaBancariaFiltro}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas as contas</SelectItem>
                      {contasBancarias.map(conta => (
                        <SelectItem key={conta.id} value={conta.id}>{conta.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={handleBuscarMovimentacoes} className="w-full">
                  Buscar Movimentações
                </Button>

                {movimentacoesFiltradas.length > 0 && (
                  <div className="space-y-4 mt-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Resultados da Busca</h3>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <FileDown className="h-4 w-4 mr-2" />
                          Exportar PDF
                        </Button>
                        <Button variant="outline" size="sm">
                          <FileDown className="h-4 w-4 mr-2" />
                          Exportar Excel
                        </Button>
                      </div>
                    </div>

                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Data</TableHead>
                            <TableHead>Descrição</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Categoria</TableHead>
                            <TableHead className="text-right">Valor</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {movimentacoesFiltradas.map((mov) => (
                            <TableRow key={mov.id}>
                              <TableCell>{new Date(mov.data).toLocaleDateString('pt-BR')}</TableCell>
                              <TableCell>{mov.descricao}</TableCell>
                              <TableCell>
                                <Badge 
                                  className="gap-1"
                                  style={{
                                    backgroundColor: mov.tipo === 'receita' 
                                      ? 'hsl(142 76% 36%)' 
                                      : 'hsl(0 84% 60%)',
                                    color: 'white',
                                    borderColor: mov.tipo === 'receita' 
                                      ? 'hsl(142 76% 36%)' 
                                      : 'hsl(0 84% 60%)'
                                  }}
                                >
                                  {mov.tipo === 'receita' ? <ArrowDownLeft className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                                  {mov.tipo === 'receita' ? 'Receita' : 'Despesa'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{mov.categoria}</Badge>
                              </TableCell>
                              <TableCell className={`text-right font-medium ${mov.tipo === 'receita' ? 'text-green-600' : 'text-destructive'}`}>
                                {formatCurrency(mov.valor)}
                              </TableCell>
                              <TableCell>
                                <Badge variant={
                                  mov.status === 'pago' ? 'default' : 
                                  mov.status === 'vencido' ? 'destructive' : 
                                  'outline'
                                }>
                                  {mov.status === 'pago' ? 'Pago' : mov.status === 'vencido' ? 'Vencido' : 'Pendente'}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Total de Receitas</p>
                        <p className="text-2xl font-bold text-green-600">
                          {formatCurrency(movimentacoesFiltradas.filter(m => m.tipo === 'receita').reduce((acc, m) => acc + m.valor, 0))}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Total de Despesas</p>
                        <p className="text-2xl font-bold text-destructive">
                          {formatCurrency(movimentacoesFiltradas.filter(m => m.tipo === 'despesa').reduce((acc, m) => acc + m.valor, 0))}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Saldo Líquido</p>
                        <p className={`text-2xl font-bold ${
                          (movimentacoesFiltradas.filter(m => m.tipo === 'receita').reduce((acc, m) => acc + m.valor, 0) -
                          movimentacoesFiltradas.filter(m => m.tipo === 'despesa').reduce((acc, m) => acc + m.valor, 0)) >= 0
                          ? 'text-blue-600' : 'text-amber-600'
                        }`}>
                          {formatCurrency(
                            movimentacoesFiltradas.filter(m => m.tipo === 'receita').reduce((acc, m) => acc + m.valor, 0) -
                            movimentacoesFiltradas.filter(m => m.tipo === 'despesa').reduce((acc, m) => acc + m.valor, 0)
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal de Confirmação de Recebimento/Pagamento */}
      <Dialog 
        open={confirmarPagamentoDialog.open && confirmarPagamentoDialog.tipo === 'confirmar'} 
        onOpenChange={(open) => !open && setConfirmarPagamentoDialog({ open: false, lancamentoId: '', tipo: 'confirmar' })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {lancamentoAtual?.tipo === 'entrada' ? 'Confirmar Recebimento' : 'Confirmar Pagamento'}
            </DialogTitle>
            <DialogDescription>
              Confirme a data em que o valor foi {lancamentoAtual?.tipo === 'entrada' ? 'recebido' : 'pago'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Descrição</Label>
              <p className="text-sm text-muted-foreground">{lancamentoAtual?.descricao}</p>
            </div>
            <div className="space-y-2">
              <Label>Valor</Label>
              <p className="text-sm font-medium">{lancamentoAtual && formatCurrency(lancamentoAtual.valor)}</p>
            </div>
            <div className="space-y-2">
              <Label>Data de {lancamentoAtual?.tipo === 'entrada' ? 'Recebimento' : 'Pagamento'}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dataRecebimento ? format(dataRecebimento, "dd/MM/yyyy") : "Selecionar data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dataRecebimento}
                    onSelect={(date) => date && setDataRecebimento(date)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => setConfirmarPagamentoDialog({ open: false, lancamentoId: '', tipo: 'confirmar' })}
            >
              Cancelar
            </Button>
            <Button 
              onClick={() => handleConfirmarRecebimento(confirmarPagamentoDialog.lancamentoId, dataRecebimento)}
            >
              Confirmar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Cancelamento de Pagamento */}
      <AlertDialog 
        open={confirmarPagamentoDialog.open && confirmarPagamentoDialog.tipo === 'cancelar'}
        onOpenChange={(open) => !open && setConfirmarPagamentoDialog({ open: false, lancamentoId: '', tipo: 'cancelar' })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Pagamento Não Efetuado?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação marcará o lançamento "{lancamentoAtual?.descricao}" como não pago e removerá a data de realização.
              O status será recalculado com base na data esperada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Não</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleCancelarPagamento(confirmarPagamentoDialog.lancamentoId)}>
              Sim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
