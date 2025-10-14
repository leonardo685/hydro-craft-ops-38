import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { TrendingUp, TrendingDown, DollarSign, Activity, Edit, Plus, ArrowDownLeft, ArrowUpRight, CalendarIcon } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useCategoriasFinanceiras } from "@/hooks/use-categorias-financeiras";
import { MultipleSelector, type Option } from "@/components/ui/multiple-selector";

export default function Financeiro() {
  const { getCategoriasForSelect } = useCategoriasFinanceiras();
  
  // Estados para filtros de data e período
  const [dataInicial, setDataInicial] = useState("");
  const [dataFinal, setDataFinal] = useState("");
  const [periodoSelecionado, setPeriodoSelecionado] = useState("");
  const [contaBancariaFiltro, setContaBancariaFiltro] = useState("todas");
  const [movimentacoesFiltradas, setMovimentacoesFiltradas] = useState<any[]>([]);

  // Estados para valores dinâmicos dos cards financeiros
  const [valoresFinanceiros, setValoresFinanceiros] = useState({
    aReceber: 142500,
    aPagar: 98700,
    titulosAberto: 25,
    contasVencer: 18
  });

  // Dados mensais para cada indicador
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

  // Dados de geração de caixa por mês
  const [cashFlowData] = useState([
    { mes: 'Jan', operacional: 3800, investimento: -4500, financiamento: 2200, geracaoTotal: 1500 },
    { mes: 'Fev', operacional: 3400, investimento: -1200, financiamento: 800, geracaoTotal: 3000 },
    { mes: 'Mar', operacional: 4500, investimento: -6200, financiamento: 3500, geracaoTotal: 1800 },
    { mes: 'Abr', operacional: 4100, investimento: -2800, financiamento: 1500, geracaoTotal: 2800 },
    { mes: 'Mai', operacional: 4600, investimento: -3200, financiamento: 2100, geracaoTotal: 3500 },
    { mes: 'Jun', operacional: 5200, investimento: -8500, financiamento: 5800, geracaoTotal: 2500 },
    { mes: 'Jul', operacional: 4800, investimento: -1800, financiamento: 1200, geracaoTotal: 4200 },
    { mes: 'Ago', operacional: 5500, investimento: -9200, financiamento: 8650, geracaoTotal: 4950 },
    { mes: 'Set', operacional: 5100, investimento: -2500, financiamento: 900, geracaoTotal: 3500 },
    { mes: 'Out', operacional: 4700, investimento: -3800, financiamento: 1800, geracaoTotal: 2700 },
    { mes: 'Nov', operacional: 5300, investimento: -4200, financiamento: 2800, geracaoTotal: 3900 },
    { mes: 'Dez', operacional: 5800, investimento: -6500, financiamento: 4200, geracaoTotal: 3500 }
  ]);

  // Estado para controlar quais dados mostrar no gráfico
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

  // Estados para o extrato bancário
  const [isLancamentoDialogOpen, setIsLancamentoDialogOpen] = useState(false);
  const [contaSelecionada, setContaSelecionada] = useState('todas');
  const [lancamentoForm, setLancamentoForm] = useState({
    tipo: 'entrada',
    valor: '',
    descricao: '',
    categoria: '',
    conta: 'conta_corrente',
    fornecedor: 'cliente_joao',
    paga: false,
    dataEmissao: new Date(2024, 7, 29), // 29 de agosto de 2024
    dataPagamento: new Date(2024, 7, 29), // 29 de agosto de 2024
    dataRealizada: new Date(2024, 7, 29), // 29 de agosto de 2024
    dataEsperada: new Date(2024, 7, 29) // 29 de agosto de 2024
  });

  // Estados para os filtros do extrato
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

  // Estados para os filtros do DRE
  const [filtrosDRE, setFiltrosDRE] = useState({
    ano: '2024',
    mes: '08'
  });

  // Estado para controlar visibilidade das colunas do extrato
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

  // Lista de fornecedores/clientes
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

  // Dados do extrato do mês atual (com conta bancária)
  const extratoMesAtual = [
    // Entradas do mês
    { id: 1, data: '2024-08-01', tipo: 'entrada', descricao: 'Recebimento à vista', categoria: 'Vendas', valor: 15000.00, conta: 'conta_corrente' },
    { id: 2, data: '2024-08-03', tipo: 'entrada', descricao: 'Transferência PIX', categoria: 'Vendas', valor: 8500.00, conta: 'conta_itau' },
    { id: 3, data: '2024-08-05', tipo: 'entrada', descricao: 'Depósito cartão', categoria: 'Vendas', valor: 12300.00, conta: 'conta_corrente' },
    { id: 4, data: '2024-08-08', tipo: 'entrada', descricao: 'Recebimento duplicata', categoria: 'Vendas', valor: 9800.00, conta: 'conta_poupanca' },
    { id: 5, data: '2024-08-12', tipo: 'entrada', descricao: 'Venda à vista', categoria: 'Vendas', valor: 6700.00, conta: 'conta_caixa' },
    { id: 6, data: '2024-08-15', tipo: 'entrada', descricao: 'Recebimento PIX', categoria: 'Vendas', valor: 4200.00, conta: 'conta_corrente' },
    { id: 7, data: '2024-08-18', tipo: 'entrada', descricao: 'Depósito em dinheiro', categoria: 'Vendas', valor: 3500.00, conta: 'conta_itau' },
    { id: 8, data: '2024-08-22', tipo: 'entrada', descricao: 'Recebimento cartão', categoria: 'Vendas', valor: 7800.00, conta: 'conta_corrente' },
    { id: 9, data: '2024-08-25', tipo: 'entrada', descricao: 'Transferência cliente', categoria: 'Vendas', valor: 5400.00, conta: 'conta_poupanca' },
    { id: 10, data: '2024-08-28', tipo: 'entrada', descricao: 'Venda equipamento', categoria: 'Vendas', valor: 11200.00, conta: 'conta_caixa' },
    
    // Saídas do mês
    { id: 11, data: '2024-08-02', tipo: 'saida', descricao: 'Pagamento fornecedor', categoria: 'Compras', valor: 18500.00, conta: 'conta_corrente' },
    { id: 12, data: '2024-08-04', tipo: 'saida', descricao: 'Folha de pagamento', categoria: 'Folha de Pagamento', valor: 22000.00, conta: 'conta_corrente' },
    { id: 13, data: '2024-08-06', tipo: 'saida', descricao: 'Aluguel escritório', categoria: 'Despesas Operacionais', valor: 3800.00, conta: 'conta_itau' },
    { id: 14, data: '2024-08-09', tipo: 'saida', descricao: 'Combustível veículos', categoria: 'Despesas Operacionais', valor: 1200.00, conta: 'conta_caixa' },
    { id: 15, data: '2024-08-11', tipo: 'saida', descricao: 'Impostos federais', categoria: 'Impostos', valor: 8500.00, conta: 'conta_corrente' },
    { id: 16, data: '2024-08-14', tipo: 'saida', descricao: 'Energia elétrica', categoria: 'Despesas Operacionais', valor: 950.00, conta: 'conta_poupanca' },
    { id: 17, data: '2024-08-16', tipo: 'saida', descricao: 'Internet/telefone', categoria: 'Despesas Operacionais', valor: 480.00, conta: 'conta_itau' },
    { id: 18, data: '2024-08-19', tipo: 'saida', descricao: 'Manutenção equipamentos', categoria: 'Despesas Operacionais', valor: 2300.00, conta: 'conta_corrente' },
    { id: 19, data: '2024-08-21', tipo: 'saida', descricao: 'Material de escritório', categoria: 'Despesas Operacionais', valor: 650.00, conta: 'conta_caixa' },
    { id: 20, data: '2024-08-24', tipo: 'saida', descricao: 'Seguro veículos', categoria: 'Despesas Operacionais', valor: 1850.00, conta: 'conta_poupanca' },
    { id: 21, data: '2024-08-27', tipo: 'saida', descricao: 'Consultoria jurídica', categoria: 'Despesas Operacionais', valor: 2500.00, conta: 'conta_itau' },
    { id: 22, data: '2024-08-29', tipo: 'saida', descricao: 'Empréstimo parcela', categoria: 'Financeiro', valor: 4200.00, conta: 'conta_corrente' }
  ];

  // Função para calcular status de pagamento
  const getStatusPagamento = (dataEsperada: Date, dataRealizada: Date | null, pago: boolean) => {
    if (pago) return 'pago';
    
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    dataEsperada.setHours(0, 0, 0, 0);
    
    if (dataEsperada < hoje) return 'atrasado';
    return 'no_prazo';
  };

  // Dados do extrato do dia
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

  // Dashboard data
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

  // DRE data
  const dreData = [
    { conta: "Receita Bruta", valor: 85000, tipo: "receita" },
    { conta: "(-) Impostos sobre Vendas", valor: -12750, tipo: "deducao" },
    { conta: "Receita Líquida", valor: 72250, tipo: "subtotal" },
    { conta: "(-) CMV - Custo dos Materiais Vendidos", valor: -35000, tipo: "custo" },
    { conta: "Lucro Bruto", valor: 37250, tipo: "subtotal" },
    { conta: "(-) Despesas Operacionais", valor: -18500, tipo: "despesa" },
    { conta: "(-) Despesas Administrativas", valor: -8200, tipo: "despesa" },
    { conta: "(-) Despesas Comerciais", valor: -3500, tipo: "despesa" },
    { conta: "EBITDA", valor: 7050, tipo: "resultado" },
    { conta: "(-) Depreciação", valor: -1200, tipo: "deducao" },
    { conta: "EBIT", valor: 5850, tipo: "resultado" },
    { conta: "(-) Despesas Financeiras", valor: -850, tipo: "despesa" },
    { conta: "(+) Receitas Financeiras", valor: 200, tipo: "receita" },
    { conta: "Lucro Líquido", valor: 5200, tipo: "final" },
  ];

  // DFC data - Nova estrutura
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

  const margemContribuicao = 85000 + (-39200); // 45800

  const despesasFixas = [
    { item: "Salários e Encargos", valor: -22000 },
    { item: "Aluguel", valor: -3800 },
    { item: "Energia Elétrica", valor: -950 },
    { item: "Telecomunicações", valor: -480 },
    { item: "Outras Despesas Fixas", valor: -2500 },
    { item: "Total Despesas Fixas", valor: -29730, isTotal: true }
  ];

  const lucroOperacional = margemContribuicao + (-29730); // 16070

  const investimentos = [
    { item: "Compra de Equipamentos", valor: -8500 },
    { item: "Aquisição de Software", valor: -2200 },
    { item: "Total Investimentos", valor: -10700, isTotal: true }
  ];

  const jurosAmortizacao = [
    { item: "Juros de Empréstimos", valor: -850 },
    { item: "Amortização de Capital", valor: -3500 },
    { item: "Total Juros e Amortização", valor: -4350, isTotal: true }
  ];

  const lucroLiquido = lucroOperacional + (-10700) + (-4350); // 1020

  const receitasNaoOperacionais = [
    { item: "Receitas Financeiras", valor: 200 },
    { item: "Outras Receitas", valor: 150 },
    { item: "Total Receitas Não Operacionais", valor: 350, isTotal: true }
  ];

  const despesasNaoOperacionais = [
    { item: "Multas e Penalidades", valor: -80 },
    { item: "Perdas Diversas", valor: -120 },
    { item: "Total Despesas Não Operacionais", valor: -200, isTotal: true }
  ];

  const resultadoLiquido = lucroLiquido + 350 + (-200); // 1170

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    });
  };

  const getDreRowStyle = (tipo: string) => {
    switch (tipo) {
      case 'subtotal':
      case 'resultado':
        return "font-semibold bg-muted/50";
      case 'final':
        return "font-bold bg-primary/10 text-primary";
      default:
        return "";
    }
  };

  const getDreValueStyle = (value: number, tipo: string) => {
    if (tipo === 'final') return "text-primary font-bold";
    if (value < 0) return "text-destructive";
    if (tipo === 'receita') return "text-green-600";
    return "";
  };

  const getDfcValueStyle = (value: number, isTotal = false) => {
    if (isTotal) return value >= 0 ? "text-green-600 font-bold" : "text-destructive font-bold";
    return value >= 0 ? "text-green-600" : "text-destructive";
  };

  const FluxoTable = ({ data, title }: { data: any[], title: string }) => (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableBody>
            {data.map((item, index) => (
              <TableRow 
                key={index} 
                className={item.isTotal ? "border-t-2 bg-muted/50" : ""}
              >
                <TableCell className={item.isTotal ? "font-semibold" : ""}>
                  {item.item}
                </TableCell>
                <TableCell 
                  className={`text-right ${getDfcValueStyle(item.valor, item.isTotal)}`}
                >
                  {formatCurrency(item.valor)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );


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

  const variacaoCaixa = 4200 + (-9200) + 8650; // = 3650
  const saldoInicial = 12500;
  const saldoFinal = saldoInicial + variacaoCaixa;

  // Cálculos do extrato
  const totalEntradas = extratoData
    .filter(item => item.tipo === 'entrada')
    .reduce((acc, item) => acc + item.valor, 0);
  
  const totalSaidas = extratoData
    .filter(item => item.tipo === 'saida')
    .reduce((acc, item) => acc + item.valor, 0);

  const saldoDia = totalEntradas - totalSaidas;

  // Cálculos do mês atual
  const entradasMesAtual = extratoMesAtual
    .filter(item => item.tipo === 'entrada')
    .reduce((acc, item) => acc + item.valor, 0);
  
  const saidasMesAtual = extratoMesAtual
    .filter(item => item.tipo === 'saida')
    .reduce((acc, item) => acc + item.valor, 0);

  // Saldo total de todas as contas
  const saldoTotal = contasBancarias.reduce((acc, conta) => acc + conta.saldo, 0);

  // Saldo da conta selecionada
  const contaAtual = contasBancarias.find(conta => conta.id === contaSelecionada);
  const saldoContaSelecionada = contaAtual ? contaAtual.saldo : saldoTotal;

  // Dados de exemplo para movimentações
  const movimentacoesExemplo = [
    {
      id: 1,
      data: '2024-01-15',
      descricao: 'Recebimento Cliente João Silva',
      tipo: 'receita',
      categoria: 'Vendas',
      valor: 2500.00,
      status: 'pago'
    },
    {
      id: 2,
      data: '2024-01-16',
      descricao: 'Pagamento Fornecedor ABC',
      tipo: 'despesa',
      categoria: 'Compras',
      valor: 1800.00,
      status: 'pago'
    },
    {
      id: 3,
      data: '2024-01-20',
      descricao: 'Recebimento Cliente Maria Santos',
      tipo: 'receita',
      categoria: 'Vendas',
      valor: 3200.00,
      status: 'pendente'
    },
    {
      id: 4,
      data: '2024-01-25',
      descricao: 'Pagamento Combustível',
      tipo: 'despesa',
      categoria: 'Despesas Operacionais',
      valor: 450.00,
      status: 'vencido'
    },
    {
      id: 5,
      data: '2024-02-01',
      descricao: 'Recebimento PIX Cliente Pedro',
      tipo: 'receita',
      categoria: 'Vendas',
      valor: 1750.00,
      status: 'pago'
    },
    {
      id: 6,
      data: '2024-02-05',
      descricao: 'Pagamento Energia Elétrica',
      tipo: 'despesa',
      categoria: 'Despesas Fixas',
      valor: 680.00,
      status: 'pendente'
    }
  ];

  // Função para buscar movimentações baseado nos filtros
  const handleBuscarMovimentacoes = () => {
    if (!periodoSelecionado && !dataInicial && !dataFinal) {
      setMovimentacoesFiltradas([]);
      return;
    }

    let dataInicio = new Date();
    let dataFim = new Date();

    if (periodoSelecionado) {
      const hoje = new Date();
      switch (periodoSelecionado) {
        case '1dia':
          dataInicio = hoje;
          dataFim = hoje;
          break;
        case '1semana':
          dataInicio = new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000);
          dataFim = hoje;
          break;
        case '15dias':
          dataInicio = new Date(hoje.getTime() - 15 * 24 * 60 * 60 * 1000);
          dataFim = hoje;
          break;
        case '1mes':
          dataInicio = new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000);
          dataFim = hoje;
          break;
        case '1ano':
          dataInicio = new Date(hoje.getTime() - 365 * 24 * 60 * 60 * 1000);
          dataFim = hoje;
          break;
      }
    } else if (dataInicial && dataFinal) {
      dataInicio = new Date(dataInicial);
      dataFim = new Date(dataFinal);
    }

    // Simular filtro e atualizar valores dos cards baseado na conta bancária selecionada
    let novoAReceber = 142500;
    let novoAPagar = 98700;
    let novoTitulosAberto = 25;
    let novoContasVencer = 18;

    // Aplicar filtro por conta bancária
    if (contaBancariaFiltro !== 'todas') {
      // Simular redução de valores baseado na conta específica
      const fatorReducao = 0.6; // 60% dos valores quando filtrado por conta específica
      novoAReceber = Math.round(novoAReceber * fatorReducao);
      novoAPagar = Math.round(novoAPagar * fatorReducao);
      novoTitulosAberto = Math.round(novoTitulosAberto * fatorReducao);
      novoContasVencer = Math.round(novoContasVencer * fatorReducao);
    }

    // Atualizar os valores dos cards
    setValoresFinanceiros({
      aReceber: novoAReceber,
      aPagar: novoAPagar,
      titulosAberto: novoTitulosAberto,
      contasVencer: novoContasVencer
    });

    // Simular filtro (retorna todas as movimentações de exemplo quando um período é selecionado)
    if (periodoSelecionado) {
      setMovimentacoesFiltradas(movimentacoesExemplo);
    } else {
      setMovimentacoesFiltradas([]);
    }
  };

  // Função para aplicar filtros
  const aplicarFiltros = () => {
    // Filtros já são aplicados automaticamente através do estado
  };

  // Função para limpar filtros
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

  // Dados do extrato filtrados
  const extratoFiltrado = extratoData.filter(item => {
    // Filtro por tipo
    if (filtrosExtrato.tipo !== 'todos' && item.tipo !== filtrosExtrato.tipo) {
      return false;
    }

    // Filtro por conta
    if (filtrosExtrato.conta !== 'todas' && item.conta !== filtrosExtrato.conta) {
      return false;
    }

    // Filtro por categoria
    if (filtrosExtrato.categoria !== 'todas' && item.categoria !== filtrosExtrato.categoria) {
      return false;
    }

    // Filtro por fornecedor
    if (filtrosExtrato.fornecedor !== 'todos' && item.fornecedor !== filtrosExtrato.fornecedor) {
      return false;
    }

    // Filtro por descrição
    if (filtrosExtrato.descricao && !item.descricao.toLowerCase().includes(filtrosExtrato.descricao.toLowerCase())) {
      return false;
    }

    // Filtro por valor mínimo
    if (filtrosExtrato.valorMinimo && item.valor < parseFloat(filtrosExtrato.valorMinimo)) {
      return false;
    }

    // Filtro por valor máximo
    if (filtrosExtrato.valorMaximo && item.valor > parseFloat(filtrosExtrato.valorMaximo)) {
      return false;
    }

    // Filtro por status
    if (filtrosExtrato.status !== 'todos') {
      const status = getStatusPagamento(item.dataEsperada, item.dataRealizada, item.pago);
      if (status !== filtrosExtrato.status) {
        return false;
      }
    }

    // Para filtro de data, vamos assumir que temos uma propriedade data no item
    // Como os dados atuais só têm hora, vamos simular com a data atual
    const itemDate = new Date(2024, 7, 29); // Data fixa para os dados de exemplo
    
    // Filtro por data início
    if (filtrosExtrato.dataInicio && itemDate < filtrosExtrato.dataInicio) {
      return false;
    }

    // Filtro por data fim
    if (filtrosExtrato.dataFim && itemDate > filtrosExtrato.dataFim) {
      return false;
    }

    return true;
  });

  const handleLancamento = () => {
    if (!lancamentoForm.valor || !lancamentoForm.descricao) return;
    
    const novoLancamento = {
      id: extratoData.length + 1,
      hora: new Date(2024, 7, 29).toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
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
      dataEmissao: new Date(2024, 7, 29), // 29 de agosto de 2024
      dataPagamento: new Date(2024, 7, 29), // 29 de agosto de 2024
      dataRealizada: new Date(2024, 7, 29), // 29 de agosto de 2024
      dataEsperada: new Date(2024, 7, 29) // 29 de agosto de 2024
    });
    setIsLancamentoDialogOpen(false);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Financeiro</h1>
          <p className="text-muted-foreground">Gestão financeira e relatórios</p>
        </div>

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="extrato">DRE</TabsTrigger>
            <TabsTrigger value="dfc">DFC</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {dashboardCards.map((card, index) => (
                <Card key={index}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                    <card.icon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{card.value}</div>
                    <p className={`text-xs ${card.changeValue >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                      {card.change}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Gráfico de Colunas Editável */}
            <Card>
              <CardHeader>
                <CardTitle>Indicadores Financeiros - Comparativo Mensal</CardTitle>
                <div className="mt-4">
                  <Label className="text-sm font-medium mb-2 block">Colunas Visíveis</Label>
                  <MultipleSelector
                    value={selectedColumns}
                    onChange={setSelectedColumns}
                    defaultOptions={columnOptions}
                    placeholder="Selecione as colunas..."
                    emptyIndicator={
                      <p className="text-center text-sm text-muted-foreground">Nenhuma coluna encontrada.</p>
                    }
                  />
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <XAxis dataKey="mes" />
                    <YAxis tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`} />
                    <Tooltip 
                      formatter={(value: number, name: string) => [
                        formatCurrency(value), 
                        name === 'faturamento' ? 'Faturamento' :
                        name === 'margemContribuicao' ? 'Margem de Contribuição' :
                        name === 'lucroLiquido' ? 'Lucro Líquido' : 'Despesas Totais'
                      ]}
                      labelStyle={{ color: 'hsl(var(--foreground))' }}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px'
                      }}
                    />
                    <Legend />
                    {visibleData.faturamento && (
                      <Bar 
                        dataKey="faturamento" 
                        fill={colors.faturamento}
                        name="Faturamento" 
                        radius={[2, 2, 0, 0]}
                      />
                    )}
                    {visibleData.margemContribuicao && (
                      <Bar 
                        dataKey="margemContribuicao" 
                        fill={colors.margemContribuicao}
                        name="Margem de Contribuição" 
                        radius={[2, 2, 0, 0]}
                      />
                    )}
                    {visibleData.lucroLiquido && (
                      <Bar 
                        dataKey="lucroLiquido" 
                        fill={colors.lucroLiquido}
                        name="Lucro Líquido" 
                        radius={[2, 2, 0, 0]}
                      />
                    )}
                    {visibleData.despesasTotais && (
                      <Bar 
                        dataKey="despesasTotais" 
                        fill={colors.despesasTotais}
                        name="Despesas Totais" 
                        radius={[2, 2, 0, 0]}
                      />
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Gráfico de Geração de Caixa */}
            <Card>
              <CardHeader>
                <CardTitle>Geração de Caixa por Mês</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Geração total de caixa da empresa
                </p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={cashFlowData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <XAxis dataKey="mes" />
                    <YAxis tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`} />
                    <Tooltip 
                      formatter={(value: number) => [formatCurrency(value), 'Geração Total']}
                      labelStyle={{ color: 'hsl(var(--foreground))' }}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="geracaoTotal" 
                      stroke="#00ff41" 
                      strokeWidth={3}
                      name="Geração Total"
                      dot={{ r: 5, fill: '#00ff41' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dre" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Receita Líquida</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(72250)}
                  </div>
                  <Badge variant="outline" className="text-xs mt-1">
                    Período Atual
                  </Badge>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">EBITDA</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(7050)}
                  </div>
                  <Badge variant="outline" className="text-xs mt-1">
                    Margem: 9,8%
                  </Badge>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Lucro Líquido</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">
                    {formatCurrency(5200)}
                  </div>
                  <Badge variant="outline" className="text-xs mt-1">
                    Margem: 7,2%
                  </Badge>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Demonstração Detalhada do Resultado do Exercício</CardTitle>
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
                    {dreData.map((item, index) => (
                      <TableRow key={index} className={getDreRowStyle(item.tipo)}>
                        <TableCell>{item.conta}</TableCell>
                        <TableCell 
                          className={`text-right ${getDreValueStyle(item.valor, item.tipo)}`}
                        >
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
          </TabsContent>

          <TabsContent value="dfc" className="space-y-6">

            {/* Cards de Resumo Financeiro */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
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
                  <div className="text-xl font-bold text-green-600">
                    {formatCurrency(entradasMesAtual)}
                  </div>
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
                  <div className="text-xl font-bold text-destructive">
                    {formatCurrency(saidasMesAtual)}
                  </div>
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

            <Tabs defaultValue="operacional" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="operacional">DFC</TabsTrigger>
                <TabsTrigger value="investimento">Extrato</TabsTrigger>
                <TabsTrigger value="financiamento">Planejamento</TabsTrigger>
              </TabsList>

              <TabsContent value="operacional" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Demonstração Detalhada do Fluxo de Caixa</CardTitle>
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
                        {/* Receitas Operacionais */}
                        {receitasOperacionais.map((item, index) => (
                          <TableRow key={`receita-${index}`} className={item.isTotal ? "font-semibold bg-muted/50" : ""}>
                            <TableCell>{item.item}</TableCell>
                            <TableCell className={`text-right ${item.valor >= 0 ? "text-green-600" : "text-destructive"} ${item.isTotal ? "font-bold" : ""}`}>
                              {formatCurrency(item.valor)}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {((item.valor / 85000) * 100).toFixed(1)}%
                            </TableCell>
                          </TableRow>
                        ))}
                        
                        {/* Despesas Operacionais */}
                        {despesasOperacionais.map((item, index) => (
                          <TableRow key={`despesa-${index}`} className={item.isTotal ? "font-semibold bg-muted/50" : ""}>
                            <TableCell>(-) {item.item}</TableCell>
                            <TableCell className={`text-right ${item.valor >= 0 ? "text-green-600" : "text-destructive"} ${item.isTotal ? "font-bold" : ""}`}>
                              {formatCurrency(item.valor)}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {((item.valor / 85000) * 100).toFixed(1)}%
                            </TableCell>
                          </TableRow>
                        ))}

                        {/* Margem de Contribuição */}
                        <TableRow className="font-semibold bg-muted/50">
                          <TableCell>Margem de Contribuição</TableCell>
                          <TableCell className="text-right text-green-600 font-bold">
                            {formatCurrency(margemContribuicao)}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {((margemContribuicao / 85000) * 100).toFixed(1)}%
                          </TableCell>
                        </TableRow>

                        {/* Despesas Fixas */}
                        {despesasFixas.map((item, index) => (
                          <TableRow key={`fixa-${index}`} className={item.isTotal ? "font-semibold bg-muted/50" : ""}>
                            <TableCell>(-) {item.item}</TableCell>
                            <TableCell className={`text-right ${item.valor >= 0 ? "text-green-600" : "text-destructive"} ${item.isTotal ? "font-bold" : ""}`}>
                              {formatCurrency(item.valor)}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {((item.valor / 85000) * 100).toFixed(1)}%
                            </TableCell>
                          </TableRow>
                        ))}

                        {/* Lucro Operacional */}
                        <TableRow className="font-semibold bg-muted/50">
                          <TableCell>Lucro Operacional</TableCell>
                          <TableCell className="text-right text-green-600 font-bold">
                            {formatCurrency(lucroOperacional)}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {((lucroOperacional / 85000) * 100).toFixed(1)}%
                          </TableCell>
                        </TableRow>

                        {/* Investimentos */}
                        {investimentos.map((item, index) => (
                          <TableRow key={`invest-${index}`} className={item.isTotal ? "font-semibold bg-muted/50" : ""}>
                            <TableCell>(-) {item.item}</TableCell>
                            <TableCell className={`text-right ${item.valor >= 0 ? "text-green-600" : "text-destructive"} ${item.isTotal ? "font-bold" : ""}`}>
                              {formatCurrency(item.valor)}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {((item.valor / 85000) * 100).toFixed(1)}%
                            </TableCell>
                          </TableRow>
                        ))}

                        {/* Juros e Amortização */}
                        {jurosAmortizacao.map((item, index) => (
                          <TableRow key={`juros-${index}`} className={item.isTotal ? "font-semibold bg-muted/50" : ""}>
                            <TableCell>(-) {item.item}</TableCell>
                            <TableCell className={`text-right ${item.valor >= 0 ? "text-green-600" : "text-destructive"} ${item.isTotal ? "font-bold" : ""}`}>
                              {formatCurrency(item.valor)}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {((item.valor / 85000) * 100).toFixed(1)}%
                            </TableCell>
                          </TableRow>
                        ))}

                        {/* Lucro Líquido */}
                        <TableRow className="font-semibold bg-muted/50">
                          <TableCell>Lucro Líquido</TableCell>
                          <TableCell className="text-right text-green-600 font-bold">
                            {formatCurrency(lucroLiquido)}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {((lucroLiquido / 85000) * 100).toFixed(1)}%
                          </TableCell>
                        </TableRow>

                        {/* Receitas Não Operacionais */}
                        {receitasNaoOperacionais.map((item, index) => (
                          <TableRow key={`rec-nao-op-${index}`} className={item.isTotal ? "font-semibold bg-muted/50" : ""}>
                            <TableCell>(+) {item.item}</TableCell>
                            <TableCell className={`text-right ${item.valor >= 0 ? "text-green-600" : "text-destructive"} ${item.isTotal ? "font-bold" : ""}`}>
                              {formatCurrency(item.valor)}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {((item.valor / 85000) * 100).toFixed(1)}%
                            </TableCell>
                          </TableRow>
                        ))}

                        {/* Despesas Não Operacionais */}
                        {despesasNaoOperacionais.map((item, index) => (
                          <TableRow key={`desp-nao-op-${index}`} className={item.isTotal ? "font-semibold bg-muted/50" : ""}>
                            <TableCell>(-) {item.item}</TableCell>
                            <TableCell className={`text-right ${item.valor >= 0 ? "text-green-600" : "text-destructive"} ${item.isTotal ? "font-bold" : ""}`}>
                              {formatCurrency(item.valor)}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {((item.valor / 85000) * 100).toFixed(1)}%
                            </TableCell>
                          </TableRow>
                        ))}

                        {/* Resultado Líquido Final */}
                        <TableRow className="font-bold bg-primary/10 text-primary">
                          <TableCell>Resultado Líquido</TableCell>
                          <TableCell className="text-right text-primary font-bold">
                            {formatCurrency(resultadoLiquido)}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {((resultadoLiquido / 85000) * 100).toFixed(1)}%
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="investimento" className="space-y-4">
                {/* Resumo do Dia */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <ArrowUpRight className="h-4 w-4 text-green-600" />
                        Entradas
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-lg font-bold text-green-600">
                        {formatCurrency(totalEntradas)}
                      </div>
                      <Badge variant="outline" className="text-xs mt-1">
                        {extratoData.filter(item => item.tipo === 'entrada').length} transações
                      </Badge>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <ArrowDownLeft className="h-4 w-4 text-destructive" />
                        Saídas
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-lg font-bold text-destructive">
                        {formatCurrency(totalSaidas)}
                      </div>
                      <Badge variant="outline" className="text-xs mt-1">
                        {extratoData.filter(item => item.tipo === 'saida').length} transações
                      </Badge>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">
                        Saldo do Dia
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className={`text-lg font-bold ${saldoDia >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                        {formatCurrency(saldoDia)}
                      </div>
                      <Badge variant="outline" className="text-xs mt-1">
                        {saldoDia >= 0 ? 'Positivo' : 'Negativo'}
                      </Badge>
                    </CardContent>
                  </Card>
                </div>

                {/* Extrato Bancário */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Extrato Bancário - {new Date(2024, 7, 29).toLocaleDateString('pt-BR')}</CardTitle>
                      <Dialog open={isLancamentoDialogOpen} onOpenChange={setIsLancamentoDialogOpen}>
                        <DialogTrigger asChild>
                          <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Novo Lançamento
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Novo Lançamento</DialogTitle>
                            <DialogDescription>
                              Adicione uma nova entrada ou saída no extrato do dia.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="tipo">Tipo de Lançamento</Label>
                              <Select 
                                value={lancamentoForm.tipo} 
                                onValueChange={(value) => setLancamentoForm(prev => ({ ...prev, tipo: value }))}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="entrada">Entrada</SelectItem>
                                  <SelectItem value="saida">Saída</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor="valor">Valor</Label>
                              <Input
                                id="valor"
                                type="number"
                                step="0.01"
                                placeholder="0,00"
                                value={lancamentoForm.valor}
                                onChange={(e) => setLancamentoForm(prev => ({ ...prev, valor: e.target.value }))}
                              />
                            </div>
                            <div>
                              <Label htmlFor="descricao">Descrição</Label>
                              <Textarea
                                id="descricao"
                                placeholder="Descrição do lançamento..."
                                value={lancamentoForm.descricao}
                                onChange={(e) => setLancamentoForm(prev => ({ ...prev, descricao: e.target.value }))}
                              />
                            </div>
                            <div>
                              <Label htmlFor="conta">Conta Bancária</Label>
                              <Select 
                                value={lancamentoForm.conta} 
                                onValueChange={(value) => setLancamentoForm(prev => ({ ...prev, conta: value }))}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {contasBancarias.map((conta) => (
                                    <SelectItem key={conta.id} value={conta.id}>
                                      {conta.nome}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor="categoria">Categoria</Label>
                              <Select 
                                value={lancamentoForm.categoria} 
                                onValueChange={(value) => setLancamentoForm(prev => ({ ...prev, categoria: value }))}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione uma categoria" />
                                </SelectTrigger>
                                <SelectContent>
                                  {getCategoriasForSelect().map(categoria => (
                                    <SelectItem key={categoria.value} value={categoria.value}>
                                      <div className="flex items-center gap-2">
                                        <Badge variant={categoria.tipo === 'mae' ? 'default' : 'secondary'} className="text-xs">
                                          {categoria.tipo === 'mae' ? 'Mãe' : 'Filha'}
                                        </Badge>
                                        {categoria.label}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div>
                              <Label htmlFor="fornecedor">Fornecedor/Cliente</Label>
                              <Select 
                                value={lancamentoForm.fornecedor} 
                                onValueChange={(value) => setLancamentoForm(prev => ({ ...prev, fornecedor: value }))}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione um fornecedor/cliente" />
                                </SelectTrigger>
                                <SelectContent>
                                  {fornecedores.map(fornecedor => (
                                    <SelectItem key={fornecedor.id} value={fornecedor.id}>
                                      <div className="flex items-center gap-2">
                                        <Badge variant={fornecedor.tipo === 'cliente' ? 'default' : fornecedor.tipo === 'fornecedor' ? 'secondary' : 'outline'} className="text-xs">
                                          {fornecedor.tipo === 'cliente' ? 'Cliente' : fornecedor.tipo === 'fornecedor' ? 'Fornecedor' : 'Funcionário'}
                                        </Badge>
                                        {fornecedor.nome}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div>
                              <Label htmlFor="paga">Status do Pagamento</Label>
                              <Select 
                                value={lancamentoForm.paga ? 'sim' : 'nao'} 
                                onValueChange={(value) => {
                                  const isPaga = value === 'sim';
                                  setLancamentoForm(prev => ({ 
                                    ...prev, 
                                    paga: isPaga,
                                    dataRealizada: isPaga ? new Date(2024, 7, 29) : prev.dataRealizada
                                  }));
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione se foi pago" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="nao">Não Pago</SelectItem>
                                  <SelectItem value="sim">Pago</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <Label>Data da Emissão</Label>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !lancamentoForm.dataEmissao && "text-muted-foreground"
                                      )}
                                    >
                                      <CalendarIcon className="mr-2 h-4 w-4" />
                                      {lancamentoForm.dataEmissao ? format(lancamentoForm.dataEmissao, "dd/MM/yyyy") : <span>Selecionar data</span>}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                      mode="single"
                                      selected={lancamentoForm.dataEmissao}
                                      onSelect={(date) => setLancamentoForm(prev => ({ ...prev, dataEmissao: date || new Date(2024, 7, 29) }))}
                                      initialFocus
                                      className={cn("p-3 pointer-events-auto")}
                                    />
                                  </PopoverContent>
                                </Popover>
                              </div>

                              <div>
                                <Label>Data do Pagamento</Label>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !lancamentoForm.dataPagamento && "text-muted-foreground"
                                      )}
                                    >
                                      <CalendarIcon className="mr-2 h-4 w-4" />
                                      {lancamentoForm.dataPagamento ? format(lancamentoForm.dataPagamento, "dd/MM/yyyy") : <span>Selecionar data</span>}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                      mode="single"
                                      selected={lancamentoForm.dataPagamento}
                                      onSelect={(date) => setLancamentoForm(prev => ({ ...prev, dataPagamento: date || new Date(2024, 7, 29) }))}
                                      initialFocus
                                      className={cn("p-3 pointer-events-auto")}
                                    />
                                  </PopoverContent>
                                </Popover>
                              </div>

                              <div>
                                <Label>Data Realizada</Label>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      disabled={lancamentoForm.paga}
                                      className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !lancamentoForm.dataRealizada && "text-muted-foreground",
                                        lancamentoForm.paga && "opacity-60"
                                      )}
                                    >
                                      <CalendarIcon className="mr-2 h-4 w-4" />
                                      {lancamentoForm.dataRealizada ? format(lancamentoForm.dataRealizada, "dd/MM/yyyy") : <span>Selecionar data</span>}
                                    </Button>
                                  </PopoverTrigger>
                                  {!lancamentoForm.paga && (
                                    <PopoverContent className="w-auto p-0" align="start">
                                      <Calendar
                                        mode="single"
                                        selected={lancamentoForm.dataRealizada}
                                        onSelect={(date) => setLancamentoForm(prev => ({ ...prev, dataRealizada: date || new Date(2024, 7, 29) }))}
                                        initialFocus
                                        className={cn("p-3 pointer-events-auto")}
                                      />
                                    </PopoverContent>
                                  )}
                                </Popover>
                                {lancamentoForm.paga && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Definida automaticamente como hoje quando marcado como pago
                                  </p>
                                )}
                              </div>

                              <div>
                                <Label>Data Esperada</Label>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !lancamentoForm.dataEsperada && "text-muted-foreground"
                                      )}
                                    >
                                      <CalendarIcon className="mr-2 h-4 w-4" />
                                      {lancamentoForm.dataEsperada ? format(lancamentoForm.dataEsperada, "dd/MM/yyyy") : <span>Selecionar data</span>}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                      mode="single"
                                      selected={lancamentoForm.dataEsperada}
                                      onSelect={(date) => setLancamentoForm(prev => ({ ...prev, dataEsperada: date || new Date(2024, 7, 29) }))}
                                      initialFocus
                                      className={cn("p-3 pointer-events-auto")}
                                    />
                                  </PopoverContent>
                                </Popover>
                              </div>
                            </div>

                            <div className="flex gap-2 pt-4">
                              <Button onClick={handleLancamento}>
                                Adicionar Lançamento
                              </Button>
                              <Button 
                                variant="outline" 
                                onClick={() => setIsLancamentoDialogOpen(false)}
                              >
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardHeader>
                  
                  {/* Controle de Colunas */}
                  <div className="px-6 pb-4 border-b">
                    <div className="space-y-4">
                      <Label className="text-sm font-medium">Colunas Visíveis</Label>
                      <MultipleSelector
                        value={selectedExtratoColumns}
                        onChange={setSelectedExtratoColumns}
                        defaultOptions={extratoColumnOptions}
                        placeholder="Selecione as colunas..."
                        emptyIndicator={
                          <p className="text-center text-sm text-muted-foreground">Nenhuma coluna encontrada.</p>
                        }
                      />
                    </div>
                  </div>

                  {/* Filtros do Extrato */}
                  <div className="px-6 pb-4 border-b">
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium text-muted-foreground">Filtros</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Data Início e Fim */}
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <Label className="text-xs">Data Início</Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full justify-start text-left font-normal text-xs h-8",
                                    !filtrosExtrato.dataInicio && "text-muted-foreground"
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-3 w-3" />
                                  {filtrosExtrato.dataInicio ? format(filtrosExtrato.dataInicio, "dd/MM/yyyy") : <span>Início</span>}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={filtrosExtrato.dataInicio}
                                  onSelect={(date) => setFiltrosExtrato(prev => ({ ...prev, dataInicio: date }))}
                                  initialFocus
                                  className={cn("p-3 pointer-events-auto")}
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                          <div className="flex-1">
                            <Label className="text-xs">Data Fim</Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full justify-start text-left font-normal text-xs h-8",
                                    !filtrosExtrato.dataFim && "text-muted-foreground"
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-3 w-3" />
                                  {filtrosExtrato.dataFim ? format(filtrosExtrato.dataFim, "dd/MM/yyyy") : <span>Fim</span>}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={filtrosExtrato.dataFim}
                                  onSelect={(date) => setFiltrosExtrato(prev => ({ ...prev, dataFim: date }))}
                                  initialFocus
                                  className={cn("p-3 pointer-events-auto")}
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>

                        {/* Valor Mínimo e Máximo */}
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <Label className="text-xs">Valor Mín.</Label>
                            <Input
                              placeholder="R$ 0,00"
                              type="number"
                              step="0.01"
                              className="h-8 text-xs"
                              value={filtrosExtrato.valorMinimo}
                              onChange={(e) => setFiltrosExtrato(prev => ({ ...prev, valorMinimo: e.target.value }))}
                            />
                          </div>
                          <div className="flex-1">
                            <Label className="text-xs">Valor Máx.</Label>
                            <Input
                              placeholder="R$ 0,00"
                              type="number"
                              step="0.01"
                              className="h-8 text-xs"
                              value={filtrosExtrato.valorMaximo}
                              onChange={(e) => setFiltrosExtrato(prev => ({ ...prev, valorMaximo: e.target.value }))}
                            />
                          </div>
                        </div>

                        {/* Conta */}
                        <div>
                          <Label className="text-xs">Conta</Label>
                          <Select value={filtrosExtrato.conta} onValueChange={(value) => setFiltrosExtrato(prev => ({ ...prev, conta: value }))}>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Todas as contas" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="todas">Todas as contas</SelectItem>
                              {contasBancarias.map((conta) => (
                                <SelectItem key={conta.id} value={conta.id}>
                                  {conta.nome}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Categoria */}
                        <div>
                          <Label className="text-xs">Categoria</Label>
                          <Select value={filtrosExtrato.categoria} onValueChange={(value) => setFiltrosExtrato(prev => ({ ...prev, categoria: value }))}>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Todas categorias" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="todas">Todas categorias</SelectItem>
                              {getCategoriasForSelect().map(categoria => (
                                <SelectItem key={categoria.value} value={categoria.value}>
                                  <div className="flex items-center gap-2">
                                    <Badge variant={categoria.tipo === 'mae' ? 'default' : 'secondary'} className="text-xs">
                                      {categoria.tipo === 'mae' ? 'Mãe' : 'Filha'}
                                    </Badge>
                                    <span className="text-xs">{categoria.label}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Descrição */}
                        <div>
                          <Label className="text-xs">Descrição</Label>
                          <Input
                            placeholder="Buscar descrição..."
                            className="h-8 text-xs"
                            value={filtrosExtrato.descricao}
                            onChange={(e) => setFiltrosExtrato(prev => ({ ...prev, descricao: e.target.value }))}
                          />
                        </div>

                        {/* Tipo */}
                        <div>
                          <Label className="text-xs">Tipo</Label>
                          <Select value={filtrosExtrato.tipo} onValueChange={(value) => setFiltrosExtrato(prev => ({ ...prev, tipo: value }))}>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Todos os tipos" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="todos">Todos os tipos</SelectItem>
                              <SelectItem value="entrada">Entrada</SelectItem>
                              <SelectItem value="saida">Saída</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Status */}
                        <div>
                          <Label className="text-xs">Status</Label>
                          <Select value={filtrosExtrato.status} onValueChange={(value) => setFiltrosExtrato(prev => ({ ...prev, status: value }))}>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Todos os status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="todos">Todos os status</SelectItem>
                              <SelectItem value="pago">Pago</SelectItem>
                              <SelectItem value="no_prazo">No Prazo</SelectItem>
                              <SelectItem value="atrasado">Atrasado</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Fornecedor */}
                        <div>
                          <Label className="text-xs">Fornecedor</Label>
                          <Select value={filtrosExtrato.fornecedor} onValueChange={(value) => setFiltrosExtrato(prev => ({ ...prev, fornecedor: value }))}>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Todos fornecedores" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="todos">Todos fornecedores</SelectItem>
                              {fornecedores.map((fornecedor) => (
                                <SelectItem key={fornecedor.id} value={fornecedor.id}>
                                  <div className="flex items-center gap-2">
                                    <Badge 
                                      variant={
                                        fornecedor.tipo === 'cliente' ? 'default' : 
                                        fornecedor.tipo === 'fornecedor' ? 'secondary' : 'outline'
                                      } 
                                      className="text-xs"
                                    >
                                      {fornecedor.tipo === 'cliente' ? 'Cliente' : 
                                       fornecedor.tipo === 'fornecedor' ? 'Fornecedor' : 'Funcionário'}
                                    </Badge>
                                    <span className="text-xs">{fornecedor.nome}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Botões de Ação */}
                        <div className="flex gap-2 items-end">
                          <Button size="sm" className="h-8 text-xs" onClick={aplicarFiltros}>
                            Aplicar Filtros
                          </Button>
                          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={limparFiltros}>
                            Limpar
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {colunasVisiveis.tipo && <TableHead>Tipo</TableHead>}
                          {colunasVisiveis.descricao && <TableHead>Descrição</TableHead>}
                          {colunasVisiveis.categoria && <TableHead>Categoria</TableHead>}
                          {colunasVisiveis.conta && <TableHead>Conta</TableHead>}
                          {colunasVisiveis.valor && <TableHead className="text-right">Valor</TableHead>}
                          {colunasVisiveis.dataEsperada && <TableHead>Data Esperada</TableHead>}
                          {colunasVisiveis.dataRealizada && <TableHead>Data Realizada</TableHead>}
                          {colunasVisiveis.status && <TableHead>Status</TableHead>}
                          {colunasVisiveis.fornecedor && <TableHead>Fornecedor</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {extratoFiltrado
                          .sort((a, b) => b.id - a.id)
                          .map((item) => (
                          <TableRow key={item.id}>
                            {colunasVisiveis.tipo && (
                              <TableCell>
                                <Badge 
                                  variant={item.tipo === 'entrada' ? 'secondary' : 'destructive'}
                                  className={`flex items-center gap-1 w-fit ${
                                    item.tipo === 'entrada' ? 'bg-green-100 text-green-700 border-green-200' : ''
                                  }`}
                                >
                                  {item.tipo === 'entrada' ? (
                                    <ArrowUpRight className="h-3 w-3" />
                                  ) : (
                                    <ArrowDownLeft className="h-3 w-3" />
                                  )}
                                  {item.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                                </Badge>
                              </TableCell>
                            )}
                            {colunasVisiveis.descricao && (
                              <TableCell>{item.descricao}</TableCell>
                            )}
                            {colunasVisiveis.categoria && (
                              <TableCell>
                                <Badge variant="outline">
                                  {item.categoria}
                                </Badge>
                              </TableCell>
                            )}
                            {colunasVisiveis.conta && (
                              <TableCell>
                                <Badge variant="outline" className="text-xs">
                                  {contasBancarias.find(c => c.id === item.conta)?.nome.split(' - ')[1] || 'N/A'}
                                </Badge>
                              </TableCell>
                            )}
                            {colunasVisiveis.valor && (
                              <TableCell 
                                className={`text-right font-semibold ${
                                  item.tipo === 'entrada' ? 'text-green-600' : 'text-destructive'
                                }`}
                              >
                                {item.tipo === 'entrada' ? '+' : '-'} {formatCurrency(item.valor)}
                              </TableCell>
                            )}
                            {colunasVisiveis.dataEsperada && (
                              <TableCell>
                                {item.dataEsperada.toLocaleDateString('pt-BR')}
                              </TableCell>
                            )}
                            {colunasVisiveis.dataRealizada && (
                              <TableCell>
                                {item.dataRealizada ? item.dataRealizada.toLocaleDateString('pt-BR') : '-'}
                              </TableCell>
                            )}
                            {colunasVisiveis.status && (
                              <TableCell>
                                <Badge 
                                  variant={
                                    getStatusPagamento(item.dataEsperada, item.dataRealizada, item.pago) === 'pago' ? 'default' :
                                    getStatusPagamento(item.dataEsperada, item.dataRealizada, item.pago) === 'atrasado' ? 'destructive' : 'secondary'
                                  }
                                  className={`${
                                    getStatusPagamento(item.dataEsperada, item.dataRealizada, item.pago) === 'pago' ? 'bg-green-100 text-green-700 border-green-200' :
                                    getStatusPagamento(item.dataEsperada, item.dataRealizada, item.pago) === 'atrasado' ? '' : 'bg-yellow-100 text-yellow-700 border-yellow-200'
                                  }`}
                                >
                                  {getStatusPagamento(item.dataEsperada, item.dataRealizada, item.pago) === 'pago' ? 'Pago' :
                                   getStatusPagamento(item.dataEsperada, item.dataRealizada, item.pago) === 'atrasado' ? 'Atrasado' : 'No Prazo'}
                                </Badge>
                              </TableCell>
                             )}
                             {colunasVisiveis.fornecedor && (
                               <TableCell>
                                 <div className="flex items-center gap-2">
                                   <Badge 
                                     variant={
                                       fornecedores.find(f => f.id === item.fornecedor)?.tipo === 'cliente' ? 'default' : 
                                       fornecedores.find(f => f.id === item.fornecedor)?.tipo === 'fornecedor' ? 'secondary' : 'outline'
                                     } 
                                     className="text-xs"
                                   >
                                     {(() => {
                                       const fornecedor = fornecedores.find(f => f.id === item.fornecedor);
                                       return fornecedor?.tipo === 'cliente' ? 'Cliente' : 
                                              fornecedor?.tipo === 'fornecedor' ? 'Fornecedor' : 'Funcionário';
                                     })()}
                                   </Badge>
                                   <span className="text-sm">
                                     {fornecedores.find(f => f.id === item.fornecedor)?.nome || 'N/A'}
                                   </span>
                                 </div>
                               </TableCell>
                             )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="financiamento" className="space-y-6">
                {/* Cards de Planejamento Financeiro */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <ArrowUpRight className="h-4 w-4 text-green-600" />
                        A Receber
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(valoresFinanceiros.aReceber)}
                      </div>
                      <Badge variant="outline" className="text-xs mt-1">
                        Próximos 30 dias
                      </Badge>
                      <div className="mt-2 text-xs text-muted-foreground">
                        {valoresFinanceiros.titulosAberto} títulos em aberto
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <ArrowDownLeft className="h-4 w-4 text-destructive" />
                        A Pagar
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-destructive">
                        {formatCurrency(valoresFinanceiros.aPagar)}
                      </div>
                      <Badge variant="outline" className="text-xs mt-1">
                        Próximos 30 dias
                      </Badge>
                      <div className="mt-2 text-xs text-muted-foreground">
                        {valoresFinanceiros.contasVencer} contas a vencer
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-primary" />
                        Saldo Previsto
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-primary">
                        {formatCurrency(valoresFinanceiros.aReceber - valoresFinanceiros.aPagar + saldoTotal)}
                      </div>
                      <Badge variant="outline" className="text-xs mt-1">
                        Saldo final projetado
                      </Badge>
                      <div className="mt-2 text-xs text-muted-foreground">
                        {(((valoresFinanceiros.aReceber - valoresFinanceiros.aPagar) / saldoTotal * 100) || 0).toFixed(1)}% de crescimento
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Filtros de Data e Período */}
                <Card>
                  <CardHeader>
                    <CardTitle>Filtros de Consulta</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      <div>
                        <Label htmlFor="dataInicial">Data Inicial</Label>
                        <Input
                          id="dataInicial"
                          type="date"
                          value={dataInicial}
                          onChange={(e) => setDataInicial(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="dataFinal">Data Final</Label>
                        <Input
                          id="dataFinal"
                          type="date"
                          value={dataFinal}
                          onChange={(e) => setDataFinal(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="periodoRapido">Período Rápido</Label>
                        <Select value={periodoSelecionado} onValueChange={setPeriodoSelecionado}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o período" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1dia">1 Dia</SelectItem>
                            <SelectItem value="1semana">1 Semana</SelectItem>
                            <SelectItem value="15dias">15 Dias</SelectItem>
                            <SelectItem value="1mes">1 Mês</SelectItem>
                            <SelectItem value="1ano">1 Ano</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="contaBancaria">Conta Bancária</Label>
                        <Select value={contaBancariaFiltro} onValueChange={setContaBancariaFiltro}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a conta" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todas">Todas as Contas</SelectItem>
                            <SelectItem value="conta_corrente">001 - Conta Corrente Banco do Brasil</SelectItem>
                            <SelectItem value="conta_poupanca">013 - Poupança Banco do Brasil</SelectItem>
                            <SelectItem value="conta_itau">341 - Conta Corrente Itaú</SelectItem>
                            <SelectItem value="conta_santander">033 - Conta Corrente Santander</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-end">
                        <Button onClick={handleBuscarMovimentacoes} className="w-full">
                          Buscar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Planejamento Financeiro Detalhado */}
                <Card>
                  <CardHeader>
                    <CardTitle>Planejamento Financeiro Detalhado</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Listagem das movimentações financeiras do período selecionado
                    </p>
                  </CardHeader>
                  <CardContent>
                    {movimentacoesFiltradas.length > 0 ? (
                      <div className="space-y-4">
                        <div className="text-sm text-muted-foreground">
                          Exibindo {movimentacoesFiltradas.length} movimentações para o período selecionado
                        </div>
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
                                <TableCell>
                                  {new Date(mov.data).toLocaleDateString('pt-BR')}
                                </TableCell>
                                <TableCell>{mov.descricao}</TableCell>
                                <TableCell>
                                  <Badge variant={mov.tipo === 'receita' ? 'default' : 'secondary'}>
                                    {mov.tipo === 'receita' ? 'Receita' : 'Despesa'}
                                  </Badge>
                                </TableCell>
                                <TableCell>{mov.categoria}</TableCell>
                                <TableCell className={`text-right ${mov.tipo === 'receita' ? 'text-green-600' : 'text-destructive'}`}>
                                  {mov.tipo === 'receita' ? '+' : '-'} {formatCurrency(mov.valor)}
                                </TableCell>
                                <TableCell>
                                  <Badge 
                                    variant={mov.status === 'pago' ? 'default' : 'outline'}
                                    className={mov.status === 'vencido' ? 'border-destructive text-destructive' : ''}
                                  >
                                    {mov.status}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">
                          {periodoSelecionado ? 
                            'Nenhuma movimentação encontrada para o período selecionado' : 
                            'Selecione um período para visualizar as movimentações'
                          }
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

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
                      <TableCell className="text-right font-bold text-primary">
                        {formatCurrency(variacaoCaixa)}
                      </TableCell>
                    </TableRow>
                    <TableRow className="border-t-2 bg-primary/10">
                      <TableCell className="font-bold">Saldo Final de Caixa</TableCell>
                      <TableCell className="text-right font-bold text-primary">
                        {formatCurrency(saldoFinal)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="extrato" className="space-y-6">
            {/* Cards de Resumo DRE */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Receita Líquida</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(72250)}
                  </div>
                  <Badge variant="outline" className="text-xs mt-1">
                    Período Atual
                  </Badge>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">EBITDA</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(7050)}
                  </div>
                  <Badge variant="outline" className="text-xs mt-1">
                    Margem: 9,8%
                  </Badge>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Lucro Líquido</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">
                    {formatCurrency(5200)}
                  </div>
                  <Badge variant="outline" className="text-xs mt-1">
                    Margem: 7,2%
                  </Badge>
                </CardContent>
              </Card>
            </div>

            {/* Filtros DRE */}
            <Card>
              <CardHeader>
                <CardTitle>Filtros de Período</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Label htmlFor="ano-dre">Ano</Label>
                    <Select 
                      value={filtrosDRE.ano} 
                      onValueChange={(value) => setFiltrosDRE(prev => ({ ...prev, ano: value }))}
                    >
                      <SelectTrigger id="ano-dre">
                        <SelectValue placeholder="Selecione o ano" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2022">2022</SelectItem>
                        <SelectItem value="2023">2023</SelectItem>
                        <SelectItem value="2024">2024</SelectItem>
                        <SelectItem value="2025">2025</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="mes-dre">Mês</Label>
                    <Select 
                      value={filtrosDRE.mes} 
                      onValueChange={(value) => setFiltrosDRE(prev => ({ ...prev, mes: value }))}
                    >
                      <SelectTrigger id="mes-dre">
                        <SelectValue placeholder="Selecione o mês" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="01">Janeiro</SelectItem>
                        <SelectItem value="02">Fevereiro</SelectItem>
                        <SelectItem value="03">Março</SelectItem>
                        <SelectItem value="04">Abril</SelectItem>
                        <SelectItem value="05">Maio</SelectItem>
                        <SelectItem value="06">Junho</SelectItem>
                        <SelectItem value="07">Julho</SelectItem>
                        <SelectItem value="08">Agosto</SelectItem>
                        <SelectItem value="09">Setembro</SelectItem>
                        <SelectItem value="10">Outubro</SelectItem>
                        <SelectItem value="11">Novembro</SelectItem>
                        <SelectItem value="12">Dezembro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Demonstrativo de Resultado de Exercício */}
            <Card>
              <CardHeader>
                <CardTitle>
                  Demonstrativo de Resultado de Exercício (DRE) - 
                  {filtrosDRE.mes === '01' && 'Janeiro'}
                  {filtrosDRE.mes === '02' && 'Fevereiro'}
                  {filtrosDRE.mes === '03' && 'Março'}
                  {filtrosDRE.mes === '04' && 'Abril'}
                  {filtrosDRE.mes === '05' && 'Maio'}
                  {filtrosDRE.mes === '06' && 'Junho'}
                  {filtrosDRE.mes === '07' && 'Julho'}
                  {filtrosDRE.mes === '08' && 'Agosto'}
                  {filtrosDRE.mes === '09' && 'Setembro'}
                  {filtrosDRE.mes === '10' && 'Outubro'}
                  {filtrosDRE.mes === '11' && 'Novembro'}
                  {filtrosDRE.mes === '12' && 'Dezembro'} de {filtrosDRE.ano}
                </CardTitle>
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
                    {dreData.map((item, index) => (
                      <TableRow key={index} className={getDreRowStyle(item.tipo)}>
                        <TableCell>{item.conta}</TableCell>
                        <TableCell 
                          className={`text-right ${getDreValueStyle(item.valor, item.tipo)}`}
                        >
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
          </TabsContent>

          <TabsContent value="dfc" className="space-y-6">
            {/* Conteúdo do DFC aqui */}
            <Card>
              <CardHeader>
                <CardTitle>Demonstração do Fluxo de Caixa</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Conteúdo do DFC será implementado aqui.</p>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </div>
    </AppLayout>
  );
};