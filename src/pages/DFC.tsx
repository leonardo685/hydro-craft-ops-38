import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Demonstração Detalhada do Fluxo de Caixa</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <FileDown className="h-4 w-4 mr-2" />PDF
                    </Button>
                    <Button variant="outline" size="sm">
                      <FileDown className="h-4 w-4 mr-2" />Excel
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
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
            <p className="text-muted-foreground">Conteúdo de Extrato será implementado...</p>
          </TabsContent>

          <TabsContent value="planejamento" className="space-y-6">
            <p className="text-muted-foreground">Conteúdo de Planejamento será implementado...</p>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
