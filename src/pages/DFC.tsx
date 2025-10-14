import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { FileDown, Plus, ArrowDownLeft, ArrowUpRight, CalendarIcon, ChevronDown, ChevronUp, X, DollarSign } from "lucide-react";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useCategoriasFinanceiras } from "@/hooks/use-categorias-financeiras";
import { MultipleSelector, type Option } from "@/components/ui/multiple-selector";

export default function DFC() {
  const { getCategoriasForSelect } = useCategoriasFinanceiras();

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

  const [valoresFinanceiros] = useState({
    aReceber: 142500,
    aPagar: 98700,
    titulosAberto: 25,
    contasVencer: 18
  });

  const [lancamentoForm, setLancamentoForm] = useState({
    tipo: 'entrada',
    valor: '',
    descricao: '',
    categoria: '',
    conta: 'conta_corrente',
    fornecedor: 'cliente_joao',
    paga: false,
    dataEmissao: new Date(2024, 7, 29),
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
    { id: 'conta_corrente', nome: 'Conta Corrente - Banco do Brasil', saldo: 25800.00 },
    { id: 'conta_poupanca', nome: 'Poupança - Banco do Brasil', saldo: 15300.00 },
    { id: 'conta_itau', nome: 'Conta Corrente - Itaú', saldo: 8950.00 },
    { id: 'conta_caixa', nome: 'Conta Corrente - Caixa', saldo: 12400.00 }
  ];

  const [extratoData, setExtratoData] = useState([
    {
      id: 1,
      hora: '08:30',
      tipo: 'entrada',
      descricao: 'Recebimento à vista - Cliente João Silva',
      categoria: 'Vendas',
      valor: 2500.00,
      conta: 'conta_corrente',
      dataEsperada: new Date(2024, 7, 29),
      dataRealizada: new Date(2024, 7, 29),
      pago: true,
      fornecedor: 'cliente_joao'
    },
    {
      id: 2,
      hora: '09:15',
      tipo: 'entrada',
      descricao: 'Transferência PIX - Cliente Maria Santos',
      categoria: 'Vendas',
      valor: 1850.00,
      conta: 'conta_itau',
      dataEsperada: new Date(2024, 7, 30),
      dataRealizada: null,
      pago: false,
      fornecedor: 'cliente_maria'
    },
    {
      id: 3,
      hora: '10:45',
      tipo: 'saida',
      descricao: 'Pagamento fornecedor - Peças hidráulicas',
      categoria: 'Compras',
      valor: 3200.00,
      conta: 'conta_corrente',
      dataEsperada: new Date(2024, 7, 25),
      dataRealizada: null,
      pago: false,
      fornecedor: 'fornecedor_hidraulica'
    },
    {
      id: 4,
      hora: '11:30',
      tipo: 'entrada',
      descricao: 'Recebimento cartão - Cliente Pedro Costa',
      categoria: 'Vendas',
      valor: 980.00,
      conta: 'conta_caixa',
      dataEsperada: new Date(2024, 7, 29),
      dataRealizada: new Date(2024, 7, 29),
      pago: true,
      fornecedor: 'cliente_pedro'
    },
    {
      id: 5,
      hora: '14:20',
      tipo: 'saida',
      descricao: 'Pagamento de combustível',
      categoria: 'Despesas Operacionais',
      valor: 150.00,
      conta: 'conta_poupanca',
      dataEsperada: new Date(2024, 8, 5),
      dataRealizada: null,
      pago: false,
      fornecedor: 'posto_combustivel'
    },
    {
      id: 6,
      hora: '15:10',
      tipo: 'entrada',
      descricao: 'Depósito em dinheiro',
      categoria: 'Vendas',
      valor: 750.00,
      conta: 'conta_corrente',
      dataEsperada: new Date(2024, 7, 29),
      dataRealizada: new Date(2024, 7, 29),
      pago: true,
      fornecedor: 'cliente_joao'
    },
    {
      id: 7,
      hora: '16:45',
      tipo: 'saida',
      descricao: 'Pagamento funcionário - Adiantamento',
      categoria: 'Folha de Pagamento',
      valor: 500.00,
      conta: 'conta_itau',
      dataEsperada: new Date(2024, 7, 27),
      dataRealizada: null,
      pago: false,
      fornecedor: 'funcionario'
    }
  ]);

  const saldoTotal = contasBancarias.reduce((acc, conta) => acc + conta.saldo, 0);
  const entradasMesAtual = 84400;
  const saidasMesAtual = 66930;
  const saldoInicial = 12500;
  const variacaoCaixa = 3650;
  const saldoFinal = saldoInicial + variacaoCaixa;
  const contaAtual = contasBancarias.find(conta => conta.id === contaSelecionada);
  const saldoContaSelecionada = contaAtual ? contaAtual.saldo : saldoTotal;

  const totalEntradas = extratoData.filter(item => item.tipo === 'entrada').reduce((acc, item) => acc + item.valor, 0);
  const totalSaidas = extratoData.filter(item => item.tipo === 'saida').reduce((acc, item) => acc + item.valor, 0);
  const saldoDia = totalEntradas - totalSaidas;

  const getStatusPagamento = (dataEsperada: Date, dataRealizada: Date | null, pago: boolean) => {
    if (pago) return 'pago';
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    dataEsperada.setHours(0, 0, 0, 0);
    if (dataEsperada < hoje) return 'atrasado';
    return 'no_prazo';
  };

  const aplicarFiltros = () => {
    // Implementar lógica de filtros
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
    if (filtrosExtrato.tipo !== 'todos' && item.tipo !== filtrosExtrato.tipo) return false;
    if (filtrosExtrato.conta !== 'todas' && item.conta !== filtrosExtrato.conta) return false;
    if (filtrosExtrato.categoria !== 'todas' && item.categoria !== filtrosExtrato.categoria) return false;
    if (filtrosExtrato.fornecedor !== 'todos' && item.fornecedor !== filtrosExtrato.fornecedor) return false;
    if (filtrosExtrato.descricao && !item.descricao.toLowerCase().includes(filtrosExtrato.descricao.toLowerCase())) return false;
    if (filtrosExtrato.valorMinimo && item.valor < parseFloat(filtrosExtrato.valorMinimo)) return false;
    if (filtrosExtrato.valorMaximo && item.valor > parseFloat(filtrosExtrato.valorMaximo)) return false;
    if (filtrosExtrato.status !== 'todos') {
      const status = getStatusPagamento(item.dataEsperada, item.dataRealizada, item.pago);
      if (status !== filtrosExtrato.status) return false;
    }
    return true;
  });

  const handleLancamento = () => {
    if (!lancamentoForm.valor || !lancamentoForm.descricao) return;

    const novoLancamento = {
      id: extratoData.length + 1,
      hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      tipo: lancamentoForm.tipo,
      descricao: lancamentoForm.descricao,
      categoria: (() => {
        const categoriasSelecionadas = getCategoriasForSelect();
        const categoriaSelecionada = categoriasSelecionadas.find(cat => cat.value === lancamentoForm.categoria);
        return categoriaSelecionada ? categoriaSelecionada.label : 'Outros';
      })(),
      valor: parseFloat(lancamentoForm.valor),
      conta: lancamentoForm.conta,
      dataEsperada: lancamentoForm.dataEsperada,
      dataRealizada: lancamentoForm.paga ? lancamentoForm.dataRealizada : null,
      pago: lancamentoForm.paga,
      fornecedor: lancamentoForm.fornecedor
    };

    setExtratoData(prev => [...prev, novoLancamento]);
    setLancamentoForm({
      tipo: 'entrada',
      valor: '',
      descricao: '',
      categoria: '',
      conta: 'conta_corrente',
      fornecedor: 'cliente_joao',
      paga: false,
      dataEmissao: new Date(2024, 7, 29),
      dataPagamento: new Date(2024, 7, 29),
      dataRealizada: new Date(2024, 7, 29),
      dataEsperada: new Date(2024, 7, 29)
    });
    setIsLancamentoDialogOpen(false);
  };

  const handleBuscarMovimentacoes = () => {
    if (!periodoSelecionado && !dataInicial && !dataFinal) {
      setMovimentacoesFiltradas([]);
      return;
    }

    const movimentacoesExemplo = [
      { id: 1, data: '2024-01-15', descricao: 'Recebimento Cliente João Silva', tipo: 'receita', categoria: 'Vendas', valor: 2500.00, status: 'pago' },
      { id: 2, data: '2024-01-16', descricao: 'Pagamento Fornecedor ABC', tipo: 'despesa', categoria: 'Compras', valor: 1800.00, status: 'pago' },
      { id: 3, data: '2024-01-20', descricao: 'Recebimento Cliente Maria Santos', tipo: 'receita', categoria: 'Vendas', valor: 3200.00, status: 'pendente' },
      { id: 4, data: '2024-01-25', descricao: 'Pagamento Combustível', tipo: 'despesa', categoria: 'Despesas Operacionais', valor: 450.00, status: 'vencido' },
      { id: 5, data: '2024-02-01', descricao: 'Recebimento PIX Cliente Pedro', tipo: 'receita', categoria: 'Vendas', valor: 1750.00, status: 'pago' },
      { id: 6, data: '2024-02-05', descricao: 'Pagamento Energia Elétrica', tipo: 'despesa', categoria: 'Despesas Fixas', valor: 680.00, status: 'pendente' }
    ];
    
    setMovimentacoesFiltradas(movimentacoesExemplo);
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const receitasOperacionais = [
    { item: "Vendas de Produtos", valor: 65000 },
    { item: "Prestação de Serviços", valor: 20000 },
    { item: "Total Receitas Operacionais", valor: 85000, isTotal: true }
  ];

  const despesasOperacionais = [
    { item: "Custo dos Materiais Vendidos", valor: -35000 },
    { item: "Comissões sobre Vendas", valor: -4200 },
    { item: "Total Despesas Operacionais", valor: -39200, isTotal: true }
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">DFC - Fluxo de Caixa</h1>
          <p className="text-muted-foreground">Demonstração do Fluxo de Caixa com Extrato e Planejamento</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                {contaSelecionada === 'todas' ? 'Saldo Total' : 'Saldo da Conta'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-primary">
                {formatCurrency(contaSelecionada === 'todas' ? saldoTotal : saldoContaSelecionada)}
              </div>
              <Badge variant="outline" className="text-xs mt-1">
                {contaSelecionada === 'todas' ? 'Todas as contas' : contaAtual?.nome.split(' - ')[1]}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Entradas do Mês</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-green-600">{formatCurrency(entradasMesAtual)}</div>
              <Badge variant="outline" className="text-xs mt-1">
                {new Date(2024, 7, 29).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Saídas do Mês</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-destructive">{formatCurrency(saidasMesAtual)}</div>
              <Badge variant="outline" className="text-xs mt-1">
                {new Date(2024, 7, 29).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Resultado do Mês</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-xl font-bold ${(entradasMesAtual - saidasMesAtual) >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                {formatCurrency(entradasMesAtual - saidasMesAtual)}
              </div>
              <Badge variant="outline" className="text-xs mt-1">
                {(entradasMesAtual - saidasMesAtual) >= 0 ? 'Positivo' : 'Negativo'}
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
                  <Button variant="outline" size="sm">
                    <FileDown className="h-4 w-4 mr-2" />PDF
                  </Button>
                  <Button variant="outline" size="sm">
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
                      <TableCell className="text-right">{formatCurrency(saldoInicial)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>(+) Fluxo Operacional</TableCell>
                      <TableCell className="text-right text-green-600">{formatCurrency(4200)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>(-) Fluxo de Investimento</TableCell>
                      <TableCell className="text-right text-destructive">{formatCurrency(-9200)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>(+) Fluxo de Financiamento</TableCell>
                      <TableCell className="text-right text-green-600">{formatCurrency(8650)}</TableCell>
                    </TableRow>
                    <TableRow className="border-t-2 bg-muted/50">
                      <TableCell className="font-bold">Variação Líquida do Caixa</TableCell>
                      <TableCell className="text-right font-bold text-primary">{formatCurrency(variacaoCaixa)}</TableCell>
                    </TableRow>
                    <TableRow className="border-t-2 bg-primary/10">
                      <TableCell className="font-bold">Saldo Final de Caixa</TableCell>
                      <TableCell className="text-right font-bold text-primary">{formatCurrency(saldoFinal)}</TableCell>
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
                        <Button onClick={aplicarFiltros} className="flex-1">Aplicar Filtros</Button>
                        <Button variant="outline" onClick={limparFiltros}>
                          <X className="h-4 w-4 mr-2" />
                          Limpar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <Card className="bg-green-50 dark:bg-green-950/20">
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

                  <Card className="bg-red-50 dark:bg-red-950/20">
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

                  <Card className={saldoDia >= 0 ? "bg-blue-50 dark:bg-blue-950/20" : "bg-amber-50 dark:bg-amber-950/20"}>
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
                                <Badge variant={item.tipo === 'entrada' ? 'default' : 'destructive'} className="gap-1">
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
              <Card className="border-l-4 border-l-green-500">
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

              <Card className="border-l-4 border-l-red-500">
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

              <Card className="border-l-4 border-l-blue-500">
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
                <CardTitle>Planejamento de Fluxo de Caixa</CardTitle>
                <p className="text-sm text-muted-foreground">Busque e visualize movimentações financeiras por período</p>
              </CardHeader>
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
                                <Badge variant={mov.tipo === 'receita' ? 'default' : 'destructive'}>
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
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
