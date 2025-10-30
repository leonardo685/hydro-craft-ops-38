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
import { FileDown, Plus, ArrowDownLeft, ArrowUpRight, CalendarIcon, ChevronDown, ChevronUp, X, DollarSign, Check, Minus, ChevronsUpDown, Settings, Pencil, Trash2, ArrowUp, ArrowDown, ArrowUpDown, ArrowRightLeft } from "lucide-react";
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
import { useClientes } from '@/hooks/use-clientes';
import { useFornecedores } from '@/hooks/use-fornecedores';
import { useContasBancarias } from '@/hooks/use-contas-bancarias';
import { MultipleSelector, type Option } from "@/components/ui/multiple-selector";
import { useMemo, useEffect } from "react";
import { gerarDatasParcelamento } from "@/lib/lancamento-utils";
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { FileSpreadsheet, Edit } from "lucide-react";
import { UploadExtratoModal } from "@/components/UploadExtratoModal";
export default function DFC() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    categorias,
    getCategoriasForSelect,
    getNomeCategoriaMae
  } = useCategoriasFinanceiras();
  const {
    lancamentos,
    loading,
    adicionarLancamento,
    atualizarLancamento,
    deletarLancamento,
    deletarRecorrenciaCompleta,
    refetch
  } = useLancamentosFinanceiros();
  const {
    clientes
  } = useClientes();
  const {
    fornecedores: fornecedoresData
  } = useFornecedores();
  const {
    contasAtivas,
    getContasForSelect
  } = useContasBancarias();

  // Inicializar activeTab com base no parâmetro da URL
  const tabParam = searchParams.get('tab');
  const initialTab = tabParam === 'extrato' || tabParam === 'planejamento' || tabParam === 'dfc' ? tabParam : 'dfc';
  const [contaSelecionada, setContaSelecionada] = useState('todas');
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isLancamentoDialogOpen, setIsLancamentoDialogOpen] = useState(false);
  const [isExtratoUploadOpen, setIsExtratoUploadOpen] = useState(false);
  const [colunasVisiveisExpanded, setColunasVisiveisExpanded] = useState(true);
  const [filtrosExpanded, setFiltrosExpanded] = useState(true);
  const [openCategoriaCombobox, setOpenCategoriaCombobox] = useState(false);
  const [openFornecedorCombobox, setOpenFornecedorCombobox] = useState(false);
  const [dataInicial, setDataInicial] = useState("");
  const [dataFinal, setDataFinal] = useState("");
  const [periodoSelecionado, setPeriodoSelecionado] = useState("");
  const [dfcDataInicio, setDfcDataInicio] = useState<Date | null>(null);
  const [dfcDataFim, setDfcDataFim] = useState<Date | null>(null);
  const [contaBancariaFiltro, setContaBancariaFiltro] = useState("todas");
  const [movimentacoesFiltradas, setMovimentacoesFiltradas] = useState<any[]>([]);
  const [planejamentoExpanded, setPlanejamentoExpanded] = useState(true);
  const [buscaAtiva, setBuscaAtiva] = useState(false);

  // Estados para ordenação de colunas
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);

  // Estados para confirmação de recebimento/pagamento
  const [confirmarPagamentoDialog, setConfirmarPagamentoDialog] = useState<{
    open: boolean;
    lancamentoId: string;
    tipo: 'confirmar' | 'cancelar';
  }>({
    open: false,
    lancamentoId: '',
    tipo: 'confirmar'
  });
  const [dataRecebimento, setDataRecebimento] = useState<Date>(new Date());

  // Estados para edição e exclusão
  const [editandoLancamento, setEditandoLancamento] = useState<string | null>(null);
  const [lancamentoEditado, setLancamentoEditado] = useState<any>(null);
  const [confirmarEdicaoDialog, setConfirmarEdicaoDialog] = useState(false);
  const [confirmarExclusaoDialog, setConfirmarExclusaoDialog] = useState<{
    open: boolean;
    lancamentoId: string;
  }>({
    open: false,
    lancamentoId: ''
  });
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
    contaDestino: '',
    fornecedor: '',
    paga: false,
    dataEmissao: new Date(),
    dataPagamento: new Date(2024, 7, 29),
    dataRealizada: new Date(2024, 7, 29),
    dataEsperada: new Date(2024, 7, 29),
    formaPagamento: 'a_vista' as 'a_vista' | 'parcelado' | 'recorrente',
    numeroParcelas: 2,
    frequenciaRepeticao: 'mensal' as 'semanal' | 'quinzenal' | 'mensal' | 'anual',
    mesesRecorrencia: 12
  });

  // Estado para datas customizadas das parcelas
  const [datasParcelasCustom, setDatasParcelasCustom] = useState<Date[]>([]);

  // Recalcula datas quando mudar parcelas ou frequência
  useEffect(() => {
    if (lancamentoForm.formaPagamento === 'parcelado' && lancamentoForm.numeroParcelas > 0) {
      const novasDatas = gerarDatasParcelamento(lancamentoForm.dataEsperada, lancamentoForm.numeroParcelas, lancamentoForm.frequenciaRepeticao);
      setDatasParcelasCustom(novasDatas);
    }
  }, [lancamentoForm.numeroParcelas, lancamentoForm.frequenciaRepeticao, lancamentoForm.dataEsperada, lancamentoForm.formaPagamento]);

  // Verificar parâmetro da URL para abrir tab específica
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'extrato' || tab === 'planejamento' || tab === 'dfc') {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // useEffect para atualizar datas baseado no período pré-definido
  useEffect(() => {
    if (!periodoSelecionado || periodoSelecionado === 'personalizado') {
      return;
    }

    const hoje = new Date();
    let inicio: Date;
    let fim: Date;

    switch (periodoSelecionado) {
      case 'hoje':
        inicio = new Date(hoje);
        fim = new Date(hoje);
        break;
      
      case 'semana':
        // Esta semana = segunda a domingo
        const diaSemana = hoje.getDay(); // 0 = domingo, 1 = segunda, etc
        const diasAteSegunda = diaSemana === 0 ? -6 : 1 - diaSemana; // Se domingo, volta 6 dias
        inicio = new Date(hoje);
        inicio.setDate(hoje.getDate() + diasAteSegunda);
        fim = new Date(inicio);
        fim.setDate(inicio.getDate() + 6); // Domingo
        break;
      
      case 'mes':
        inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
        break;
      
      case 'trimestre':
        const trimestreAtual = Math.floor(hoje.getMonth() / 3);
        inicio = new Date(hoje.getFullYear(), trimestreAtual * 3, 1);
        fim = new Date(hoje.getFullYear(), (trimestreAtual + 1) * 3, 0);
        break;
      
      case 'ano':
        inicio = new Date(hoje.getFullYear(), 0, 1);
        fim = new Date(hoje.getFullYear(), 11, 31);
        break;
      
      default:
        return;
    }

    // Converter para formato YYYY-MM-DD
    setDataInicial(inicio.toISOString().split('T')[0]);
    setDataFinal(fim.toISOString().split('T')[0]);
  }, [periodoSelecionado]);
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
  const extratoColumnOptions: Option[] = [{
    value: 'tipo',
    label: 'Tipo'
  }, {
    value: 'descricao',
    label: 'Descrição'
  }, {
    value: 'categoria',
    label: 'Categoria'
  }, {
    value: 'conta',
    label: 'Conta'
  }, {
    value: 'valor',
    label: 'Valor'
  }, {
    value: 'dataEsperada',
    label: 'Data Esperada'
  }, {
    value: 'dataRealizada',
    label: 'Data Realizada'
  }, {
    value: 'status',
    label: 'Status'
  }, {
    value: 'fornecedor',
    label: 'Fornecedor'
  }];
  const [selectedExtratoColumns, setSelectedExtratoColumns] = useState<Option[]>([{
    value: 'tipo',
    label: 'Tipo'
  }, {
    value: 'descricao',
    label: 'Descrição'
  }, {
    value: 'categoria',
    label: 'Categoria'
  }, {
    value: 'conta',
    label: 'Conta'
  }, {
    value: 'valor',
    label: 'Valor'
  }, {
    value: 'dataEsperada',
    label: 'Data Esperada'
  }, {
    value: 'dataRealizada',
    label: 'Data Realizada'
  }, {
    value: 'status',
    label: 'Status'
  }, {
    value: 'fornecedor',
    label: 'Fornecedor'
  }]);
  const colunasVisiveis = {
    tipo: selectedExtratoColumns.some(col => col.value === 'tipo'),
    descricao: selectedExtratoColumns.some(col => col.value === 'descricao'),
    categoria: selectedExtratoColumns.some(col => col.value === 'categoria'),
    conta: selectedExtratoColumns.some(col => col.value === 'conta'),
    valor: selectedExtratoColumns.some(col => col.value === 'valor'),
    dataEsperada: selectedExtratoColumns.some(col => col.value === 'dataEsperada'),
    dataRealizada: selectedExtratoColumns.some(col => col.value === 'dataRealizada'),
    status: selectedExtratoColumns.some(col => col.value === 'status'),
    fornecedor: selectedExtratoColumns.some(col => col.value === 'fornecedor')
  };

  // Combinar clientes e fornecedores em uma lista
  const fornecedoresClientes = [...clientes.map(c => ({
    id: c.id,
    nome: c.nome,
    tipo: 'cliente' as const
  })), ...fornecedoresData.map(f => ({
    id: f.id,
    nome: f.nome,
    tipo: 'fornecedor' as const
  }))];
  const contasBancarias = contasAtivas.map(conta => ({
    id: conta.nome,
    nome: conta.banco ? `${conta.nome} - ${conta.banco}` : conta.nome,
    saldo: conta.saldo_inicial
  }));

  // Calcular saldos das contas baseado nos lançamentos reais
  const saldosContas = useMemo(() => {
    const saldos: Record<string, number> = {};

    // Inicializar saldos com saldo_inicial das contas
    contasAtivas.forEach(conta => {
      saldos[conta.nome] = conta.saldo_inicial;
    });

    // Adicionar lançamentos pagos aos saldos
    lancamentos.forEach(lancamento => {
      if (lancamento.pago && lancamento.dataRealizada && lancamento.contaBancaria) {
        // Para transferências, processar saída e entrada
        if (lancamento.tipo === 'transferencia' && lancamento.contaDestino) {
          // Saída da conta origem
          if (saldos.hasOwnProperty(lancamento.contaBancaria)) {
            saldos[lancamento.contaBancaria] -= lancamento.valor;
          }
          // Entrada na conta destino
          if (saldos.hasOwnProperty(lancamento.contaDestino)) {
            saldos[lancamento.contaDestino] += lancamento.valor;
          }
        } else {
          // Lançamentos normais (entrada ou saída)
          const valor = lancamento.tipo === 'entrada' ? lancamento.valor : -lancamento.valor;
          if (saldos.hasOwnProperty(lancamento.contaBancaria)) {
            saldos[lancamento.contaBancaria] += valor;
          }
        }
      }
    });
    console.log('💰 Saldos calculados:', saldos);
    return saldos;
  }, [lancamentos, contasAtivas]);

  // Atualizar saldos das contas
  const contasBancariasAtualizadas = contasBancarias.map(conta => ({
    ...conta,
    saldo: saldosContas[conta.id] || 0
  }));
  const extratoData = useMemo(() => {
    // FILTRAR lançamentos ANTES de mapear - excluir lançamentos PAI de parcelamento
    const lancamentosFiltrados = lancamentos.filter(lancamento => {
      // Excluir lançamentos PAI de parcelamento (numeroParcelas > 1 e sem lancamentoPaiId)
      if (!lancamento.lancamentoPaiId && lancamento.numeroParcelas && lancamento.numeroParcelas > 1) {
        return false;
      }
      return true;
    });
    return lancamentosFiltrados.map(lancamento => ({
      id: lancamento.id,
      hora: new Date(lancamento.dataEsperada).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
      }),
      tipo: lancamento.tipo,
      descricao: lancamento.descricao,
      categoria: getNomeCategoriaMae(lancamento.categoriaId || '') || 'Sem categoria',
      categoriaId: lancamento.categoriaId || '',
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
    return lancamentos.filter(l => {
      const data = l.dataRealizada ? new Date(l.dataRealizada) : new Date(l.dataEsperada);
      return l.tipo === 'entrada' && l.pago && data >= primeiroDiaMes && data <= ultimoDiaMes;
    }).reduce((acc, l) => acc + l.valor, 0);
  }, [lancamentos, primeiroDiaMes, ultimoDiaMes]);
  const saidasMesAtual = useMemo(() => {
    return lancamentos.filter(l => {
      const data = l.dataRealizada ? new Date(l.dataRealizada) : new Date(l.dataEsperada);
      return l.tipo === 'saida' && l.pago && data >= primeiroDiaMes && data <= ultimoDiaMes;
    }).reduce((acc, l) => acc + l.valor, 0);
  }, [lancamentos, primeiroDiaMes, ultimoDiaMes]);

  // Cálculo de lançamentos atrasados (não varia com filtros)
  const aReceberAtrasadas = useMemo(() => {
    const dataHoje = new Date();
    dataHoje.setHours(0, 0, 0, 0);
    return lancamentos.filter(l => {
      const dataEsperada = new Date(l.dataEsperada);
      dataEsperada.setHours(0, 0, 0, 0);
      return l.tipo === 'entrada' && !l.pago && dataEsperada < dataHoje;
    }).reduce((acc, l) => acc + l.valor, 0);
  }, [lancamentos]);
  const aPagarAtrasadas = useMemo(() => {
    const dataHoje = new Date();
    dataHoje.setHours(0, 0, 0, 0);
    return lancamentos.filter(l => {
      const dataEsperada = new Date(l.dataEsperada);
      dataEsperada.setHours(0, 0, 0, 0);
      return l.tipo === 'saida' && !l.pago && dataEsperada < dataHoje;
    }).reduce((acc, l) => acc + l.valor, 0);
  }, [lancamentos]);
  const contaAtual = contasBancariasAtualizadas.find(conta => conta.id === contaSelecionada);
  const saldoContaSelecionada = contaAtual ? contaAtual.saldo : saldoTotal;

  // Cálculos dos cards - usando dados reais do banco
  // Apenas lançamentos PAGOS com data realizada são contabilizados
  const totalEntradas = lancamentos.filter(item => item.tipo === 'entrada' && item.pago && item.dataRealizada).reduce((acc, item) => acc + item.valor, 0);
  const totalSaidas = lancamentos.filter(item => item.tipo === 'saida' && item.pago && item.dataRealizada).reduce((acc, item) => acc + item.valor, 0);
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

    // Filtro de categoria (comparando IDs)
    if (filtrosExtrato.categoria !== 'todas' && item.categoriaId !== filtrosExtrato.categoria) return false;

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
    if (!lancamentoForm.valor || !lancamentoForm.descricao) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    // Validação específica para transferências
    if (lancamentoForm.tipo === 'transferencia') {
      if (!lancamentoForm.contaDestino) {
        toast.error("Selecione a conta de destino para transferência");
        return;
      }
      if (lancamentoForm.conta === lancamentoForm.contaDestino) {
        toast.error("Conta de origem e destino devem ser diferentes");
        return;
      }
    } else {
      if (!lancamentoForm.categoria) {
        toast.error("Preencha todos os campos obrigatórios");
        return;
      }
    }
    const valorTotal = parseFloat(lancamentoForm.valor);
    const dataBase = lancamentoForm.dataEsperada;

    // Lógica especial para transferências entre contas
    if (lancamentoForm.tipo === 'transferencia') {
      const contaOrigem = contasBancariasAtualizadas.find(c => c.id === lancamentoForm.conta);
      const contaDestinoObj = contasBancariasAtualizadas.find(c => c.id === lancamentoForm.contaDestino);

      // Criar lançamento de transferência
      const descricaoBase = lancamentoForm.descricao || 'Transferência entre contas';
      await adicionarLancamento({
        tipo: 'transferencia' as any,
        descricao: `${descricaoBase} - Saída de ${contaOrigem?.nome}`,
        categoriaId: lancamentoForm.categoria || undefined,
        valor: valorTotal,
        contaBancaria: lancamentoForm.conta,
        contaDestino: lancamentoForm.contaDestino,
        dataEsperada: dataBase,
        dataRealizada: lancamentoForm.paga ? lancamentoForm.dataRealizada : null,
        dataEmissao: lancamentoForm.dataEmissao,
        pago: lancamentoForm.paga,
        fornecedorCliente: lancamentoForm.fornecedor,
        formaPagamento: 'a_vista'
      });
      toast.success("Transferência registrada com sucesso!");
      resetForm();
      setIsLancamentoDialogOpen(false);
      return;
    }
    if (lancamentoForm.formaPagamento === 'a_vista') {
      // Lançamento único
      const resultado = await adicionarLancamento({
        tipo: lancamentoForm.tipo as 'entrada' | 'saida',
        descricao: lancamentoForm.descricao,
        categoriaId: lancamentoForm.categoria,
        valor: valorTotal,
        contaBancaria: lancamentoForm.conta,
        dataEsperada: dataBase,
        dataRealizada: lancamentoForm.paga ? lancamentoForm.dataRealizada : null,
        dataEmissao: lancamentoForm.dataEmissao,
        pago: lancamentoForm.paga,
        fornecedorCliente: lancamentoForm.fornecedor,
        formaPagamento: 'a_vista'
      });
      if (resultado.success) {
        toast.success("Lançamento adicionado com sucesso!");
        resetForm();
      }
    } else if (lancamentoForm.formaPagamento === 'parcelado') {
      // Criar lançamento pai primeiro
      const resultadoPai = await adicionarLancamento({
        tipo: lancamentoForm.tipo as 'entrada' | 'saida',
        descricao: `${lancamentoForm.descricao} (Parcelado - ${lancamentoForm.numeroParcelas}x)`,
        categoriaId: lancamentoForm.categoria,
        valor: valorTotal,
        contaBancaria: lancamentoForm.conta,
        dataEsperada: dataBase,
        dataRealizada: null,
        dataEmissao: lancamentoForm.dataEmissao,
        pago: false,
        fornecedorCliente: lancamentoForm.fornecedor,
        formaPagamento: 'parcelado',
        numeroParcelas: lancamentoForm.numeroParcelas,
        frequenciaRepeticao: lancamentoForm.frequenciaRepeticao
      });
      if (resultadoPai.success && resultadoPai.id) {
        // Usar datas customizadas das parcelas
        const datas = datasParcelasCustom.length > 0 ? datasParcelasCustom : gerarDatasParcelamento(dataBase, lancamentoForm.numeroParcelas, lancamentoForm.frequenciaRepeticao);
        const valorParcela = valorTotal / lancamentoForm.numeroParcelas;
        for (let i = 0; i < datas.length; i++) {
          await adicionarLancamento({
            tipo: lancamentoForm.tipo as 'entrada' | 'saida',
            descricao: `${lancamentoForm.descricao} - Parcela ${i + 1}/${lancamentoForm.numeroParcelas}`,
            categoriaId: lancamentoForm.categoria,
            valor: valorParcela,
            contaBancaria: lancamentoForm.conta,
            dataEsperada: datas[i],
            dataRealizada: null,
            dataEmissao: lancamentoForm.dataEmissao,
            pago: false,
            fornecedorCliente: lancamentoForm.fornecedor,
            formaPagamento: 'parcelado',
            numeroParcelas: lancamentoForm.numeroParcelas,
            parcelaNumero: i + 1,
            frequenciaRepeticao: lancamentoForm.frequenciaRepeticao,
            lancamentoPaiId: resultadoPai.id
          });
        }
        toast.success(`Lançamento parcelado criado com sucesso! ${lancamentoForm.numeroParcelas} parcelas geradas.`);
        resetForm();
      }
    } else if (lancamentoForm.formaPagamento === 'recorrente') {
      // Gerar lançamentos recorrentes
      const {
        gerarDatasRecorrencia
      } = await import('@/lib/lancamento-utils');
      const datas = gerarDatasRecorrencia(dataBase, lancamentoForm.mesesRecorrencia, lancamentoForm.frequenciaRepeticao);
      for (let i = 0; i < datas.length; i++) {
        await adicionarLancamento({
          tipo: lancamentoForm.tipo as 'entrada' | 'saida',
          descricao: `${lancamentoForm.descricao} - Recorrência ${i + 1}`,
          categoriaId: lancamentoForm.categoria,
          valor: valorTotal,
          contaBancaria: lancamentoForm.conta,
          dataEsperada: datas[i],
          dataRealizada: null,
          dataEmissao: datas[i],
          pago: false,
          fornecedorCliente: lancamentoForm.fornecedor,
          formaPagamento: 'recorrente',
          frequenciaRepeticao: lancamentoForm.frequenciaRepeticao,
          mesesRecorrencia: lancamentoForm.mesesRecorrencia
        });
      }
      toast.success(`Lançamentos recorrentes criados com sucesso! ${datas.length} lançamentos gerados.`);
      resetForm();
    }
  };
  const resetForm = () => {
    setLancamentoForm({
      tipo: 'entrada',
      valor: '',
      descricao: '',
      categoria: '',
      conta: 'conta_corrente',
      contaDestino: '',
      fornecedor: '',
      paga: false,
      dataEmissao: new Date(),
      dataPagamento: new Date(),
      dataRealizada: new Date(),
      dataEsperada: new Date(),
      formaPagamento: 'a_vista',
      numeroParcelas: 2,
      frequenciaRepeticao: 'mensal',
      mesesRecorrencia: 12
    });
    setDatasParcelasCustom([]);
    setIsLancamentoDialogOpen(false);
  };
  const handleBuscarMovimentacoes = () => {
    // Se não há filtro ativo, limpa resultados
    if (!periodoSelecionado && !dataInicial && !dataFinal) {
      setMovimentacoesFiltradas([]);
      calcularValoresFinanceiros([]);
      setBuscaAtiva(false);
      return;
    }

    // Converter datas string para objetos Date
    const dataInicioFiltro = dataInicial ? new Date(dataInicial + 'T00:00:00') : null;
    const dataFimFiltro = dataFinal ? new Date(dataFinal + 'T23:59:59') : null;

    // Filtrar lançamentos por período e conta
    const movimentacoes = lancamentos
      .filter(l => {
        // Filtrar por data
        const dataLancamento = new Date(l.dataEsperada);
        
        if (dataInicioFiltro && dataLancamento < dataInicioFiltro) return false;
        if (dataFimFiltro && dataLancamento > dataFimFiltro) return false;
        
        // Filtrar por conta bancária
        if (contaBancariaFiltro !== 'todas' && l.contaBancaria !== contaBancariaFiltro) {
          return false;
        }
        
        return true;
      })
      .map(l => ({
        id: l.id,
        data: new Date(l.dataEsperada).toLocaleDateString('pt-BR'),
        descricao: l.descricao,
        tipo: l.tipo === 'entrada' ? 'receita' : 'despesa',
        categoria: getNomeCategoriaMae(l.categoriaId || '') || 'Sem categoria',
        valor: l.valor,
        status: l.pago ? 'pago' : new Date(l.dataEsperada) < new Date() ? 'vencido' : 'pendente'
      }));

    setMovimentacoesFiltradas(movimentacoes);
    calcularValoresFinanceiros(movimentacoes);
    setBuscaAtiva(true);
  };

  const limparFiltrosPlanejamento = () => {
    setPeriodoSelecionado('');
    setDataInicial('');
    setDataFinal('');
    setContaBancariaFiltro('todas');
    setMovimentacoesFiltradas([]);
    calcularValoresFinanceiros([]);
    setBuscaAtiva(false);
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const movimentacoesOrdenadas = useMemo(() => {
    if (!sortColumn || !sortDirection) return movimentacoesFiltradas;

    return [...movimentacoesFiltradas].sort((a, b) => {
      let aValue: any = a[sortColumn as keyof typeof a];
      let bValue: any = b[sortColumn as keyof typeof b];

      if (sortColumn === 'data') {
        const [diaA, mesA, anoA] = a.data.split('/');
        const [diaB, mesB, anoB] = b.data.split('/');
        aValue = new Date(`${anoA}-${mesA}-${diaA}`);
        bValue = new Date(`${anoB}-${mesB}-${diaB}`);
      }

      if (sortColumn === 'valor') {
        aValue = a.valor;
        bValue = b.valor;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [movimentacoesFiltradas, sortColumn, sortDirection]);
  const calcularValoresFinanceiros = (movimentacoes: any[]) => {
    const totalReceber = movimentacoes.filter(m => m.tipo === 'receita' && m.status !== 'pago').reduce((acc, m) => acc + m.valor, 0);
    const totalPagar = movimentacoes.filter(m => m.tipo === 'despesa' && m.status !== 'pago').reduce((acc, m) => acc + m.valor, 0);
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
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };
  const sortData = (data: any[]) => {
    if (!sortColumn || !sortDirection) return data;
    return [...data].sort((a, b) => {
      let aVal = a[sortColumn];
      let bVal = b[sortColumn];

      // Tratamento especial para diferentes tipos
      if (sortColumn === 'valor') {
        aVal = parseFloat(aVal) || 0;
        bVal = parseFloat(bVal) || 0;
      } else if (sortColumn === 'dataEsperada' || sortColumn === 'dataRealizada') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      } else if (sortColumn === 'status') {
        // Status tem ordem: pago < pendente < atrasado
        const statusOrder: Record<string, number> = {
          'pago': 1,
          'pendente': 2,
          'atrasado': 3
        };
        aVal = statusOrder[aVal] || 999;
        bVal = statusOrder[bVal] || 999;
      } else {
        // String - case insensitive
        aVal = String(aVal || '').toLowerCase();
        bVal = String(bVal || '').toLowerCase();
      }
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  };

  // Componente de cabeçalho ordenável
  const SortableTableHead = ({
    column,
    children,
    className = ""
  }: {
    column: string;
    children: React.ReactNode;
    className?: string;
  }) => {
    const isActive = sortColumn === column;
    return <TableHead className={className}>
        <button onClick={() => handleSort(column)} className="flex items-center gap-1 hover:text-foreground transition-colors w-full">
          {children}
          <div className="flex flex-col">
            {isActive && sortDirection === 'asc' && <ArrowUp className="h-3 w-3" />}
            {isActive && sortDirection === 'desc' && <ArrowDown className="h-3 w-3" />}
            {(!isActive || sortDirection === null) && <ArrowUpDown className="h-3 w-3 text-muted-foreground" />}
          </div>
        </button>
      </TableHead>;
  };

  // Funções para confirmação de recebimento/pagamento
  const handleConfirmarRecebimento = async (lancamentoId: string, dataRecebimento: Date) => {
    const sucesso = await atualizarLancamento(lancamentoId, {
      pago: true,
      dataRealizada: dataRecebimento
    });
    if (sucesso) {
      toast.success("Recebimento/Pagamento confirmado!");
      setConfirmarPagamentoDialog({
        open: false,
        lancamentoId: '',
        tipo: 'confirmar'
      });
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
      setConfirmarPagamentoDialog({
        open: false,
        lancamentoId: '',
        tipo: 'cancelar'
      });
    } else {
      toast.error("Erro ao cancelar pagamento");
    }
  };

  // Interface para itens do DFC
  interface DFCItem {
    codigo?: string;
    conta: string;
    valor: number;
    percentual: number;
    tipo: 'categoria_mae' | 'categoria_filha' | 'calculo';
    nivel: number;
  }

  // Calcular DFC hierárquico baseado nas categorias (apenas lançamentos PAGOS)
  const dfcData = useMemo(() => {
    const resultado: DFCItem[] = [];

    // 1. Filtrar lançamentos PAGOS dentro do período selecionado
    // EXCLUIR lançamentos PAI de parcelamentos - apenas mostrar as parcelas individuais
    const lancamentosFiltrados = lancamentos.filter(l => {
      // Excluir transferências entre contas do DFC
      if (l.tipo === 'transferencia') return false;

      // Excluir lançamentos PAI de parcelamento
      // (lançamentos que têm filhos, identificados por numeroParcelas > 1 e lancamentoPaiId === null)
      if (!l.lancamentoPaiId && l.numeroParcelas && l.numeroParcelas > 1) {
        return false;
      }

      // Só incluir se estiver pago e tiver data realizada
      if (!l.pago || !l.dataRealizada) return false;
      const dataRealizada = new Date(l.dataRealizada);
      if (dfcDataInicio) {
        const inicio = new Date(dfcDataInicio);
        inicio.setHours(0, 0, 0, 0);
        if (dataRealizada < inicio) return false;
      }
      if (dfcDataFim) {
        const fim = new Date(dfcDataFim);
        fim.setHours(23, 59, 59, 999);
        if (dataRealizada > fim) return false;
      }
      return true;
    });

    // 2. Calcular total de receitas (base para percentuais)
    const totalReceitas = lancamentosFiltrados.filter(l => l.tipo === 'entrada').reduce((acc, l) => acc + l.valor, 0);

    // 3. Função auxiliar para calcular valor de categoria
    const calcularValorCategoria = (categoriaId: string): number => {
      return lancamentosFiltrados.filter(l => l.categoriaId === categoriaId).reduce((acc, l) => acc + l.valor, 0);
    };

    // 4. Função auxiliar para adicionar categoria mãe por código
    const adicionarCategoriaPorCodigo = (codigo: string): number => {
      const categoriaMae = categorias.find(c => c.tipo === 'mae' && c.codigo === codigo);
      if (!categoriaMae) return 0;
      const categoriasFilhas = categorias.filter(c => c.tipo === 'filha' && c.categoriaMaeId === categoriaMae.id);
      let totalMae = 0;

      // Adicionar filhas primeiro
      categoriasFilhas.forEach(filha => {
        const valorFilha = calcularValorCategoria(filha.id);
        totalMae += valorFilha;
        if (valorFilha !== 0) {
          resultado.push({
            codigo: filha.codigo,
            conta: filha.nome,
            valor: valorFilha,
            percentual: totalReceitas > 0 ? valorFilha / totalReceitas * 100 : 0,
            tipo: 'categoria_filha',
            nivel: 2
          });
        }
      });

      // Adicionar mãe se tiver valor
      if (totalMae !== 0) {
        const indexInsert = resultado.length - categoriasFilhas.filter(f => calcularValorCategoria(f.id) !== 0).length;
        resultado.splice(indexInsert, 0, {
          codigo: categoriaMae.codigo,
          conta: categoriaMae.nome,
          valor: totalMae,
          percentual: totalReceitas > 0 ? totalMae / totalReceitas * 100 : 0,
          tipo: 'categoria_mae',
          nivel: 1
        });
      }
      return totalMae;
    };

    // 5. RECEITAS OPERACIONAIS (Código 1)
    const receitasOperacionais = adicionarCategoriaPorCodigo('1');

    // 6. CUSTOS VARIÁVEIS (Código 2)
    const custosVariaveis = adicionarCategoriaPorCodigo('2');

    // 7. MARGEM DE CONTRIBUIÇÃO
    const margemContribuicao = receitasOperacionais - custosVariaveis;
    resultado.push({
      conta: '(=) MARGEM DE CONTRIBUIÇÃO',
      valor: margemContribuicao,
      percentual: totalReceitas > 0 ? margemContribuicao / totalReceitas * 100 : 0,
      tipo: 'calculo',
      nivel: 0
    });

    // 8. DESPESAS FIXAS (Código 3)
    const despesasFixas = adicionarCategoriaPorCodigo('3');

    // 9. LUCRO ANTES DOS INVESTIMENTOS
    const lucroAntesInvestimentos = margemContribuicao - despesasFixas;
    resultado.push({
      conta: '(=) LUCRO ANTES DOS INVESTIMENTOS',
      valor: lucroAntesInvestimentos,
      percentual: totalReceitas > 0 ? lucroAntesInvestimentos / totalReceitas * 100 : 0,
      tipo: 'calculo',
      nivel: 0
    });

    // 10. INVESTIMENTOS (Código 4)
    const investimentos = adicionarCategoriaPorCodigo('4');

    // 11. LUCRO OPERACIONAL
    const lucroOperacional = lucroAntesInvestimentos - investimentos;
    resultado.push({
      conta: '(=) LUCRO OPERACIONAL',
      valor: lucroOperacional,
      percentual: totalReceitas > 0 ? lucroOperacional / totalReceitas * 100 : 0,
      tipo: 'calculo',
      nivel: 0
    });

    // 12. RECEITAS NÃO OPERACIONAIS (Código 5)
    const receitasNaoOperacionais = adicionarCategoriaPorCodigo('5');

    // 13. SAÍDAS NÃO OPERACIONAIS (Código 6)
    const saidasNaoOperacionais = adicionarCategoriaPorCodigo('6');

    // 14. LUCRO LÍQUIDO
    const lucroLiquido = lucroOperacional + receitasNaoOperacionais - saidasNaoOperacionais;
    resultado.push({
      conta: '(=) LUCRO LÍQUIDO',
      valor: lucroLiquido,
      percentual: totalReceitas > 0 ? lucroLiquido / totalReceitas * 100 : 0,
      tipo: 'calculo',
      nivel: 0
    });
    return resultado;
  }, [lancamentos, categorias, dfcDataInicio, dfcDataFim]);

  // Helper para estilo de linhas do DFC
  const getDfcRowStyle = (tipo: string) => {
    switch (tipo) {
      case 'categoria_mae':
        return "font-semibold bg-muted/50";
      case 'calculo':
        return "font-bold bg-primary/10 text-primary";
      case 'categoria_filha':
        return "";
      default:
        return "";
    }
  };
  const getDfcValueStyle = (value: number, tipo: string) => {
    if (tipo === 'calculo') return "text-primary font-bold";
    if (tipo === 'categoria_mae') return "font-semibold";
    return value >= 0 ? "text-green-600" : "text-destructive";
  };

  // Obter o lançamento atual para exibir informações no modal
  const lancamentoAtual = lancamentos.find(l => l.id === confirmarPagamentoDialog.lancamentoId);
  return <AppLayout>
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
              {loading ? <div className="text-sm text-muted-foreground">Carregando...</div> : <>
                  <div className={`text-xl font-bold ${(contaSelecionada === 'todas' ? saldoTotal : saldoContaSelecionada) >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                    {formatCurrency(contaSelecionada === 'todas' ? saldoTotal : saldoContaSelecionada)}
                  </div>
                  <Select value={contaSelecionada} onValueChange={setContaSelecionada}>
                    <SelectTrigger className="w-full mt-2 h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas as contas</SelectItem>
                      {contasBancariasAtualizadas.map(conta => <SelectItem key={conta.id} value={conta.id}>
                          {conta.nome}
                        </SelectItem>)}
                    </SelectContent>
                  </Select>
                </>}
            </CardContent>
          </Card>

          <Card className="border-2 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Entradas do Mês</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-green-600">{formatCurrency(entradasMesAtual)}</div>
              <Badge variant="outline" className="text-xs mt-1">
                {hoje.toLocaleDateString('pt-BR', {
                month: 'long',
                year: 'numeric'
              })}
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
                {hoje.toLocaleDateString('pt-BR', {
                month: 'long',
                year: 'numeric'
              })}
              </Badge>
            </CardContent>
          </Card>

          <Card className="border-2 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Resultado do Mês</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-xl font-bold ${entradasMesAtual - saidasMesAtual >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                {formatCurrency(entradasMesAtual - saidasMesAtual)}
              </div>
              <Badge variant="outline" className="text-xs mt-1">
                {entradasMesAtual - saidasMesAtual >= 0 ? 'Resultado positivo' : 'Resultado negativo'}
              </Badge>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
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
                        <Button variant="outline" className={cn("w-[200px] justify-start text-left font-normal", !dfcDataInicio && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dfcDataInicio ? format(dfcDataInicio, "dd/MM/yyyy") : "Selecionar data"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={dfcDataInicio || undefined} onSelect={date => setDfcDataInicio(date || null)} initialFocus className="pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="flex items-center gap-2">
                    <Label>Data Fim:</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-[200px] justify-start text-left font-normal", !dfcDataFim && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dfcDataFim ? format(dfcDataFim, "dd/MM/yyyy") : "Selecionar data"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={dfcDataFim || undefined} onSelect={date => setDfcDataFim(date || null)} initialFocus className="pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Conta</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-right">% da Receita</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dfcData.map((item, index) => <TableRow key={`dfc-${index}`} className={getDfcRowStyle(item.tipo)}>
                        <TableCell className="text-sm text-muted-foreground">
                          {item.codigo || ''}
                        </TableCell>
                        <TableCell className={cn(item.nivel === 1 && "pl-6", item.nivel === 2 && "pl-12")}>
                          {item.conta}
                        </TableCell>
                        <TableCell className={cn("text-right", getDfcValueStyle(item.valor, item.tipo))}>
                          {formatCurrency(item.valor)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {item.percentual.toFixed(1)}%
                        </TableCell>
                      </TableRow>)}
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
                    doc.text("Demonstracao Detalhada do Fluxo de Caixa", 20, 45);
                    doc.setFontSize(10);
                    let y = 55;
                    dfcData.forEach(item => {
                      const valor = formatCurrency(item.valor);
                      const percentual = item.percentual.toFixed(1) + "%";
                      const indent = item.nivel * 5;
                      doc.text(`${item.codigo || ''} ${item.conta}`, 20 + indent, y);
                      doc.text(valor, 120, y);
                      doc.text(percentual, 170, y);
                      y += 8;
                      if (y > 270) {
                        doc.addPage();
                        y = 20;
                      }
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
                    const dados: any[] = [["Demonstração Detalhada do Fluxo de Caixa"], [`Período: ${dataInicio} a ${dataFim}`], [], ["Código", "Conta", "Valor", "% da Receita"], []];

                    // Adicionar todos os itens do DFC
                    dfcData.forEach(item => {
                      dados.push([item.codigo || '', item.conta, item.valor, item.percentual.toFixed(1) + "%"]);
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
                      <TableCell className={`text-right font-bold ${entradasMesAtual - saidasMesAtual >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                        {formatCurrency(entradasMesAtual - saidasMesAtual)}
                      </TableCell>
                    </TableRow>
                    <TableRow className="border-t-2 bg-muted/50">
                      <TableCell className="font-bold">Saldo Final de Caixa</TableCell>
                      <TableCell className={`text-right font-bold ${saldoTotal >= 0 ? 'text-green-600' : 'text-destructive'}`}>
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
                  <CardTitle>Extrato do Dia - {new Date(2024, 7, 29).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric'
                  })}</CardTitle>
                  <div className="flex gap-2">
                    <Select value={contaSelecionada} onValueChange={setContaSelecionada}>
                      <SelectTrigger className="w-[280px]">
                        <SelectValue placeholder="Selecionar conta" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todas">Todas as contas</SelectItem>
                        {contasBancarias.map(conta => <SelectItem key={conta.id} value={conta.id}>{conta.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          Novo Lançamento
                          <ChevronDown className="h-4 w-4 ml-2" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-64">
                        <DropdownMenuItem onClick={() => setIsLancamentoDialogOpen(true)}>
                          <Edit className="h-4 w-4 mr-2" />
                          <div className="flex flex-col">
                            <span className="font-medium">Lançamento Manual</span>
                            <span className="text-xs text-muted-foreground">Inserir lançamento individual</span>
                          </div>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setIsExtratoUploadOpen(true)}>
                          <FileSpreadsheet className="h-4 w-4 mr-2" />
                          <div className="flex flex-col">
                            <span className="font-medium">Lançamento por Extrato</span>
                            <span className="text-xs text-muted-foreground">Importar PDF ou XLSX</span>
                          </div>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <Dialog open={isLancamentoDialogOpen} onOpenChange={setIsLancamentoDialogOpen}>
                      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden p-0 flex flex-col">
                        <div className={cn("h-4 w-full transition-colors duration-300 flex-shrink-0", lancamentoForm.tipo === 'entrada' ? "bg-green-500" : lancamentoForm.tipo === 'transferencia' ? "bg-blue-500" : "bg-red-500")} />
                        <div className="p-6 overflow-y-auto flex-1">
                          <DialogHeader>
                            <DialogTitle>Novo Lançamento</DialogTitle>
                            <DialogDescription>Adicione um novo lançamento ao extrato bancário</DialogDescription>
                          </DialogHeader>
                          <div className="grid gap-4 py-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Tipo de Lançamento</Label>
                              <Select value={lancamentoForm.tipo} onValueChange={value => setLancamentoForm(prev => ({
                                ...prev,
                                tipo: value
                              }))}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="entrada">Entrada</SelectItem>
                                  <SelectItem value="saida">Saída</SelectItem>
                                  <SelectItem value="transferencia">Transferência entre Contas</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Valor</Label>
                              <Input type="number" placeholder="0,00" value={lancamentoForm.valor} onChange={e => setLancamentoForm(prev => ({
                                ...prev,
                                valor: e.target.value
                              }))} />
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
                                <Calendar mode="single" selected={lancamentoForm.dataEmissao} onSelect={date => date && setLancamentoForm(prev => ({
                                  ...prev,
                                  dataEmissao: date
                                }))} initialFocus className={cn("p-3 pointer-events-auto")} />
                              </PopoverContent>
                            </Popover>
                          </div>

                          <div className="space-y-2">
                            <Label>Descrição</Label>
                            <Textarea placeholder="Descrição do lançamento" value={lancamentoForm.descricao} onChange={e => setLancamentoForm(prev => ({
                              ...prev,
                              descricao: e.target.value
                            }))} />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Categoria</Label>
                              <Popover open={openCategoriaCombobox} onOpenChange={setOpenCategoriaCombobox}>
                                <PopoverTrigger asChild>
                                  <Button variant="outline" role="combobox" aria-expanded={openCategoriaCombobox} className="w-full justify-between">
                                    {lancamentoForm.categoria ? getCategoriasForSelect().find(cat => cat.value === lancamentoForm.categoria)?.label : "Selecionar categoria"}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-full p-0">
                                  <Command>
                                    <CommandInput placeholder="Buscar categoria..." />
                                    <CommandList>
                                      <CommandEmpty>Nenhuma categoria encontrada.</CommandEmpty>
                                      <CommandGroup>
                                        {getCategoriasForSelect().map(categoria => <CommandItem key={categoria.value} value={categoria.label} onSelect={() => {
                                          setLancamentoForm(prev => ({
                                            ...prev,
                                            categoria: categoria.value
                                          }));
                                          setOpenCategoriaCombobox(false);
                                        }}>
                                            <Check className={cn("mr-2 h-4 w-4", lancamentoForm.categoria === categoria.value ? "opacity-100" : "opacity-0")} />
                                            {categoria.label}
                                          </CommandItem>)}
                                      </CommandGroup>
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                              <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => navigate('/cadastros', {
                                state: {
                                  activeTab: 'categorias'
                                }
                              })}>
                                <Plus className="h-4 w-4 mr-2" />
                                Cadastrar Nova Categoria
                              </Button>
                            </div>
                            <div className="space-y-2">
                              <Label>
                                {lancamentoForm.tipo === 'transferencia' ? 'Conta Bancária de Origem' : 'Conta Bancária'}
                              </Label>
                              <Select value={lancamentoForm.conta} onValueChange={value => setLancamentoForm(prev => ({
                                ...prev,
                                conta: value
                              }))}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {contasBancarias.map(conta => <SelectItem key={conta.id} value={conta.id}>{conta.nome}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {/* Campo condicional para Conta de Destino */}
                          {lancamentoForm.tipo === 'transferencia' && <div className="space-y-2">
                              <Label>Conta Bancária de Destino</Label>
                              <Select value={lancamentoForm.contaDestino} onValueChange={value => setLancamentoForm(prev => ({
                              ...prev,
                              contaDestino: value
                            }))}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione a conta de destino" />
                                </SelectTrigger>
                                <SelectContent>
                                  {contasBancarias.filter(conta => conta.id !== lancamentoForm.conta).map(conta => <SelectItem key={conta.id} value={conta.id}>
                                        {conta.nome}
                                      </SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>}

                          <div className="space-y-2">
                            <Label>Fornecedor/Cliente</Label>
                            <Popover open={openFornecedorCombobox} onOpenChange={setOpenFornecedorCombobox}>
                              <PopoverTrigger asChild>
                                <Button variant="outline" role="combobox" aria-expanded={openFornecedorCombobox} className="w-full justify-between">
                                  {lancamentoForm.fornecedor ? (() => {
                                    const item = fornecedoresClientes.find(f => f.id === lancamentoForm.fornecedor);
                                    return item ? <div className="flex items-center gap-2">
                                            <Badge variant={item.tipo === 'cliente' ? 'default' : 'secondary'} className="text-xs">
                                              {item.tipo === 'cliente' ? 'Cliente' : 'Fornecedor'}
                                            </Badge>
                                            {item.nome}
                                          </div> : "Selecione um fornecedor/cliente";
                                  })() : "Selecione um fornecedor/cliente"}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-full p-0">
                                <Command>
                                  <CommandInput placeholder="Buscar fornecedor/cliente..." />
                                  <CommandList>
                                    <CommandEmpty>Nenhum fornecedor/cliente encontrado.</CommandEmpty>
                                    <CommandGroup>
                                      {fornecedoresClientes.map(item => <CommandItem key={item.id} value={item.nome} onSelect={() => {
                                        setLancamentoForm(prev => ({
                                          ...prev,
                                          fornecedor: item.id
                                        }));
                                        setOpenFornecedorCombobox(false);
                                      }}>
                                          <Check className={cn("mr-2 h-4 w-4", lancamentoForm.fornecedor === item.id ? "opacity-100" : "opacity-0")} />
                                          <div className="flex items-center gap-2">
                                            <Badge variant={item.tipo === 'cliente' ? 'default' : 'secondary'} className="text-xs">
                                              {item.tipo === 'cliente' ? 'Cliente' : 'Fornecedor'}
                                            </Badge>
                                            {item.nome}
                                          </div>
                                        </CommandItem>)}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                            <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => {
                              navigate('/cadastros', {
                                state: {
                                  activeTab: lancamentoForm.tipo === 'entrada' ? 'clientes' : 'fornecedores'
                                }
                              });
                            }}>
                              <Plus className="h-4 w-4 mr-2" />
                              Cadastrar Novo
                            </Button>
                          </div>

                          {/* Forma de Pagamento */}
                          <div className="space-y-2">
                            <Label>Forma de Pagamento</Label>
                            <Select value={lancamentoForm.formaPagamento} onValueChange={value => setLancamentoForm(prev => ({
                              ...prev,
                              formaPagamento: value as 'a_vista' | 'parcelado' | 'recorrente'
                            }))}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="a_vista">À Vista</SelectItem>
                                <SelectItem value="parcelado">Parcelado</SelectItem>
                                <SelectItem value="recorrente">Recorrente</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Campos condicionais para PARCELADO */}
                          {lancamentoForm.formaPagamento === 'parcelado' && <>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label>Número de Parcelas</Label>
                                  <Input type="number" min="2" value={lancamentoForm.numeroParcelas} onChange={e => setLancamentoForm(prev => ({
                                  ...prev,
                                  numeroParcelas: parseInt(e.target.value) || 2
                                }))} />
                                </div>
                                <div className="space-y-2">
                                  <Label>Frequência</Label>
                                  <Select value={lancamentoForm.frequenciaRepeticao} onValueChange={value => setLancamentoForm(prev => ({
                                  ...prev,
                                  frequenciaRepeticao: value as 'semanal' | 'quinzenal' | 'mensal' | 'anual'
                                }))}>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="semanal">Semanal</SelectItem>
                                      <SelectItem value="quinzenal">Quinzenal</SelectItem>
                                      <SelectItem value="mensal">Mensal</SelectItem>
                                      <SelectItem value="anual">Anual</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>

                              {/* Prévia das Parcelas */}
                              {lancamentoForm.valor && lancamentoForm.numeroParcelas > 0 && datasParcelasCustom.length > 0 && <div className="space-y-2 p-4 bg-muted/30 rounded-lg border">
                                  <Label className="text-sm font-medium">Prévia das Parcelas (clique na data para editar)</Label>
                                  <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {(() => {
                                  const valorTotal = parseFloat(lancamentoForm.valor);
                                  const valorParcela = valorTotal / lancamentoForm.numeroParcelas;
                                  return datasParcelasCustom.map((data, index) => <div key={index} className="flex items-center justify-between p-2 bg-background rounded border text-sm gap-2">
                                          <span className="font-medium whitespace-nowrap">
                                            Parcela {index + 1}/{lancamentoForm.numeroParcelas}
                                          </span>
                                          <span className="text-primary font-semibold whitespace-nowrap">
                                            R$ {valorParcela.toFixed(2)}
                                          </span>
                                          <Popover>
                                            <PopoverTrigger asChild>
                                              <Button variant="ghost" size="sm" className="h-8 text-muted-foreground hover:text-foreground">
                                                <CalendarIcon className="mr-2 h-3 w-3" />
                                                {format(data, "dd/MM/yyyy")}
                                              </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="end">
                                              <Calendar mode="single" selected={data} onSelect={novaData => {
                                          if (novaData) {
                                            const novasDatas = [...datasParcelasCustom];
                                            novasDatas[index] = novaData;
                                            setDatasParcelasCustom(novasDatas);
                                          }
                                        }} initialFocus className={cn("p-3 pointer-events-auto")} />
                                            </PopoverContent>
                                          </Popover>
                                        </div>);
                                })()}
                                  </div>
                                </div>}
                            </>}

                          {/* Campos condicionais para RECORRENTE */}
                          {lancamentoForm.formaPagamento === 'recorrente' && <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Meses de Recorrência</Label>
                                <Input type="number" min="1" value={lancamentoForm.mesesRecorrencia} onChange={e => setLancamentoForm(prev => ({
                                ...prev,
                                mesesRecorrencia: parseInt(e.target.value) || 12
                              }))} />
                              </div>
                              <div className="space-y-2">
                                <Label>Frequência</Label>
                                <Select value={lancamentoForm.frequenciaRepeticao} onValueChange={value => setLancamentoForm(prev => ({
                                ...prev,
                                frequenciaRepeticao: value as 'semanal' | 'quinzenal' | 'mensal' | 'anual'
                              }))}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="semanal">Semanal</SelectItem>
                                    <SelectItem value="quinzenal">Quinzenal</SelectItem>
                                    <SelectItem value="mensal">Mensal</SelectItem>
                                    <SelectItem value="anual">Anual</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>}

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
                                  <Calendar mode="single" selected={lancamentoForm.dataEsperada} onSelect={date => date && setLancamentoForm(prev => ({
                                    ...prev,
                                    dataEsperada: date
                                  }))} initialFocus />
                                </PopoverContent>
                              </Popover>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2 mb-2">
                                <Checkbox id="paga" checked={lancamentoForm.paga} onCheckedChange={checked => setLancamentoForm(prev => ({
                                  ...prev,
                                  paga: checked as boolean
                                }))} />
                                <Label htmlFor="paga" className="cursor-pointer">Já foi paga/recebida?</Label>
                              </div>
                              {lancamentoForm.paga && <Popover>
                                  <PopoverTrigger asChild>
                                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !lancamentoForm.dataRealizada && "text-muted-foreground")}>
                                      <CalendarIcon className="mr-2 h-4 w-4" />
                                      {lancamentoForm.dataRealizada ? format(lancamentoForm.dataRealizada, "dd/MM/yyyy") : "Data realizada"}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0">
                                    <Calendar mode="single" selected={lancamentoForm.dataRealizada} onSelect={date => date && setLancamentoForm(prev => ({
                                    ...prev,
                                    dataRealizada: date
                                  }))} initialFocus />
                                  </PopoverContent>
                                </Popover>}
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 pt-4">
                            <Button variant="outline" onClick={() => setIsLancamentoDialogOpen(false)}>Cancelar</Button>
                            <Button onClick={handleLancamento}>Adicionar Lançamento</Button>
                          </div>
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
                  {colunasVisiveisExpanded && <MultipleSelector value={selectedExtratoColumns} onChange={setSelectedExtratoColumns} options={extratoColumnOptions} placeholder="Selecione as colunas para exibir" emptyIndicator={<p className="text-center text-sm text-muted-foreground">Nenhuma coluna encontrada.</p>} />}
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2 cursor-pointer" onClick={() => setFiltrosExpanded(!filtrosExpanded)}>
                    <Label className="text-sm font-medium">Filtros</Label>
                    {filtrosExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                  {filtrosExpanded && <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 border rounded-lg bg-muted/30">
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
                            <Calendar mode="single" selected={filtrosExtrato.dataInicio || undefined} onSelect={date => setFiltrosExtrato(prev => ({
                          ...prev,
                          dataInicio: date || null
                        }))} initialFocus />
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
                            <Calendar mode="single" selected={filtrosExtrato.dataFim || undefined} onSelect={date => setFiltrosExtrato(prev => ({
                          ...prev,
                          dataFim: date || null
                        }))} initialFocus />
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs">Tipo</Label>
                        <Select value={filtrosExtrato.tipo} onValueChange={value => setFiltrosExtrato(prev => ({
                      ...prev,
                      tipo: value
                    }))}>
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todos">Todos</SelectItem>
                            <SelectItem value="entrada">Entrada</SelectItem>
                            <SelectItem value="saida">Saída</SelectItem>
                            <SelectItem value="transferencia">Transferência</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs">Conta</Label>
                        <Select value={filtrosExtrato.conta} onValueChange={value => setFiltrosExtrato(prev => ({
                      ...prev,
                      conta: value
                    }))}>
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todas">Todas</SelectItem>
                            {contasBancarias.map(conta => <SelectItem key={conta.id} value={conta.id}>{conta.nome.split(' - ')[1]}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs">Categoria</Label>
                        <Select value={filtrosExtrato.categoria} onValueChange={value => setFiltrosExtrato(prev => ({
                      ...prev,
                      categoria: value
                    }))}>
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todas">Todas</SelectItem>
                            {getCategoriasForSelect().map(cat => <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs">Fornecedor/Cliente</Label>
                        <Select value={filtrosExtrato.fornecedor} onValueChange={value => setFiltrosExtrato(prev => ({
                      ...prev,
                      fornecedor: value
                    }))}>
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todos">Todos</SelectItem>
                            {fornecedoresClientes.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs">Status</Label>
                        <Select value={filtrosExtrato.status} onValueChange={value => setFiltrosExtrato(prev => ({
                      ...prev,
                      status: value
                    }))}>
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
                        <Input placeholder="Buscar por descrição" value={filtrosExtrato.descricao} onChange={e => setFiltrosExtrato(prev => ({
                      ...prev,
                      descricao: e.target.value
                    }))} className="h-9" />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs">Valor Mínimo</Label>
                        <Input type="number" placeholder="R$ 0,00" value={filtrosExtrato.valorMinimo} onChange={e => setFiltrosExtrato(prev => ({
                      ...prev,
                      valorMinimo: e.target.value
                    }))} className="h-9" />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs">Valor Máximo</Label>
                        <Input type="number" placeholder="R$ 0,00" value={filtrosExtrato.valorMaximo} onChange={e => setFiltrosExtrato(prev => ({
                      ...prev,
                      valorMaximo: e.target.value
                    }))} className="h-9" />
                      </div>

                       <div className="col-span-full flex gap-2">
                        <Button variant="outline" onClick={limparFiltros} className="flex-1">
                          <X className="h-4 w-4 mr-2" />
                          Limpar Filtros
                        </Button>
                      </div>
                    </div>}
                </div>
              </CardHeader>

              <CardContent>
                <div className="flex justify-end gap-2 mb-4">
                  <Button variant="outline" size="sm" onClick={() => {
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
                }}>
                    <FileDown className="h-4 w-4 mr-2" />
                    Exportar PDF
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => {
                  const dadosExcel = extratoFiltrado.map(item => {
                    const status = getStatusPagamento(item.dataEsperada, item.dataRealizada, item.pago);
                    const conta = contasBancarias.find(c => c.id === item.conta);
                    const fornecedor = fornecedoresClientes.find(f => f.id === item.fornecedor);
                    return {
                      'Data Esperada': format(item.dataEsperada, "dd/MM/yyyy"),
                      'Data Realizada': item.dataRealizada ? format(item.dataRealizada, "dd/MM/yyyy") : '-',
                      'Tipo': item.tipo === 'transferencia' ? 'Transferência' : item.tipo === 'entrada' ? 'Entrada' : 'Saída',
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
                  XLSX.utils.sheet_add_json(ws, [{
                    'Descrição': 'Total Entradas',
                    'Valor': totalEntradas
                  }, {
                    'Descrição': 'Total Saídas',
                    'Valor': totalSaidas
                  }, {
                    'Descrição': 'Saldo',
                    'Valor': totalEntradas - totalSaidas
                  }], {
                    skipHeader: true,
                    origin: -1
                  });
                  XLSX.writeFile(wb, `extrato-${format(new Date(), "dd-MM-yyyy")}.xlsx`);
                  toast.success("Excel exportado com sucesso!");
                }}>
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
                        {colunasVisiveis.tipo && <SortableTableHead column="tipo">Tipo</SortableTableHead>}
                        {colunasVisiveis.descricao && <SortableTableHead column="descricao">Descrição</SortableTableHead>}
                        {colunasVisiveis.categoria && <SortableTableHead column="categoria">Categoria</SortableTableHead>}
                        {colunasVisiveis.conta && <SortableTableHead column="conta">Conta</SortableTableHead>}
                        {colunasVisiveis.fornecedor && <SortableTableHead column="fornecedor">Fornecedor/Cliente</SortableTableHead>}
                        {colunasVisiveis.valor && <SortableTableHead column="valor" className="text-right">Valor</SortableTableHead>}
                        {colunasVisiveis.dataEsperada && <SortableTableHead column="dataEsperada">Data Esperada</SortableTableHead>}
                        {colunasVisiveis.dataRealizada && <SortableTableHead column="dataRealizada">Data Realizada</SortableTableHead>}
                        {colunasVisiveis.status && <SortableTableHead column="status">Status</SortableTableHead>}
                        <TableHead className="text-center">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortData(extratoFiltrado).map(item => {
                      const status = getStatusPagamento(item.dataEsperada, item.dataRealizada, item.pago);
                      const conta = contasBancarias.find(c => c.id === item.conta);
                      const fornecedor = fornecedoresClientes.find(f => f.id === item.fornecedor);
                      return <TableRow key={item.id}>
                            {colunasVisiveis.tipo && <TableCell>
                                <Badge className="gap-1" style={{
                            backgroundColor: item.tipo === 'transferencia' ? 'hsl(280 80% 50%)' : item.tipo === 'entrada' ? 'hsl(142 76% 36%)' : 'hsl(0 84% 60%)',
                            color: 'white',
                            borderColor: item.tipo === 'transferencia' ? 'hsl(280 80% 50%)' : item.tipo === 'entrada' ? 'hsl(142 76% 36%)' : 'hsl(0 84% 60%)'
                          }}>
                                  {item.tipo === 'transferencia' ? <ArrowRightLeft className="h-3 w-3" /> : item.tipo === 'entrada' ? <ArrowDownLeft className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                                  {item.tipo === 'transferencia' ? 'Transferência' : item.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                                </Badge>
                              </TableCell>}
                            {colunasVisiveis.descricao && <TableCell>
                                {editandoLancamento === item.id ? <Input value={lancamentoEditado?.descricao || ''} onChange={e => setLancamentoEditado({
                            ...lancamentoEditado,
                            descricao: e.target.value
                          })} /> : item.descricao}
                              </TableCell>}
                            {colunasVisiveis.categoria && <TableCell>
                                {editandoLancamento === item.id ? <Select value={lancamentoEditado?.categoriaId || ''} onValueChange={value => setLancamentoEditado({
                            ...lancamentoEditado,
                            categoriaId: value
                          })}>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {getCategoriasForSelect().map(cat => <SelectItem key={cat.value} value={cat.value}>
                                          {cat.label}
                                        </SelectItem>)}
                                    </SelectContent>
                                  </Select> : <Badge variant="outline">{item.categoria}</Badge>}
                              </TableCell>}
                            {colunasVisiveis.conta && <TableCell>
                                {editandoLancamento === item.id ? <Select value={lancamentoEditado?.contaBancaria || ''} onValueChange={value => setLancamentoEditado({
                            ...lancamentoEditado,
                            contaBancaria: value
                          })}>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {contasBancarias.map(conta => <SelectItem key={conta.id} value={conta.id}>
                                          {conta.nome}
                                        </SelectItem>)}
                                    </SelectContent>
                                  </Select> : conta?.nome.split(' - ')[1] || '-'}
                              </TableCell>}
                            {colunasVisiveis.fornecedor && <TableCell>
                                {editandoLancamento === item.id ? <Select value={lancamentoEditado?.fornecedorCliente || ''} onValueChange={value => setLancamentoEditado({
                            ...lancamentoEditado,
                            fornecedorCliente: value
                          })}>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {fornecedoresClientes.map(f => <SelectItem key={f.id} value={f.id}>
                                          {f.nome}
                                        </SelectItem>)}
                                    </SelectContent>
                                  </Select> : fornecedor?.nome || '-'}
                              </TableCell>}
                            {colunasVisiveis.valor && <TableCell className={`text-right font-medium ${item.tipo === 'transferencia' ? 'text-purple-600' : item.tipo === 'entrada' ? 'text-green-600' : 'text-destructive'}`}>
                                {editandoLancamento === item.id ? <Input type="number" value={lancamentoEditado?.valor || 0} onChange={e => setLancamentoEditado({
                            ...lancamentoEditado,
                            valor: parseFloat(e.target.value)
                          })} className="text-right" /> : `${item.tipo === 'transferencia' ? '↔' : item.tipo === 'entrada' ? '+' : '-'} ${formatCurrency(item.valor)}`}
                              </TableCell>}
                            {colunasVisiveis.dataEsperada && <TableCell>
                                {editandoLancamento === item.id ? <Popover>
                                    <PopoverTrigger asChild>
                                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {lancamentoEditado?.dataEsperada ? format(lancamentoEditado.dataEsperada, "dd/MM/yyyy") : "Selecionar"}
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                      <Calendar mode="single" selected={lancamentoEditado?.dataEsperada} onSelect={date => date && setLancamentoEditado({
                                ...lancamentoEditado,
                                dataEsperada: date
                              })} initialFocus />
                                    </PopoverContent>
                                  </Popover> : format(item.dataEsperada, "dd/MM/yyyy")}
                              </TableCell>}
                            {colunasVisiveis.dataRealizada && <TableCell>
                                {editandoLancamento === item.id ? <Popover>
                                    <PopoverTrigger asChild>
                                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {lancamentoEditado?.dataRealizada ? format(lancamentoEditado.dataRealizada, "dd/MM/yyyy") : "-"}
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                      <Calendar mode="single" selected={lancamentoEditado?.dataRealizada} onSelect={date => setLancamentoEditado({
                                ...lancamentoEditado,
                                dataRealizada: date || null
                              })} initialFocus />
                                    </PopoverContent>
                                  </Popover> : item.dataRealizada ? format(item.dataRealizada, "dd/MM/yyyy") : '-'}
                              </TableCell>}
                            {colunasVisiveis.status && <TableCell>
                                {editandoLancamento === item.id ? <Select value={lancamentoEditado?.pago ? 'pago' : 'nao_pago'} onValueChange={value => setLancamentoEditado({
                            ...lancamentoEditado,
                            pago: value === 'pago',
                            dataRealizada: value === 'pago' ? lancamentoEditado?.dataRealizada || new Date() : null
                          })}>
                                    <SelectTrigger className="w-full">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="pago">Pago</SelectItem>
                                      <SelectItem value="nao_pago">Não Pago</SelectItem>
                                    </SelectContent>
                                  </Select> : <Badge variant={status === 'pago' ? 'default' : status === 'atrasado' ? 'destructive' : 'outline'}>
                                    {status === 'pago' ? 'Pago' : status === 'atrasado' ? 'Atrasado' : 'No Prazo'}
                                  </Badge>}
                              </TableCell>}
                            <TableCell className="text-center">
                              {editandoLancamento === item.id ? <div className="flex items-center justify-center gap-2">
                                  <Button size="sm" variant="default" onClick={() => setConfirmarEdicaoDialog(true)}>
                                    Salvar
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => {
                              setEditandoLancamento(null);
                              setLancamentoEditado(null);
                            }}>
                                    Cancelar
                                  </Button>
                                </div> : <Popover>
                                  <PopoverTrigger asChild>
                                    <Button size="icon" variant="outline" className="h-8 w-8">
                                      <Settings className="h-4 w-4" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-48 p-2">
                                    <div className="flex flex-col gap-2">
                                      <Button size="sm" variant="ghost" className="justify-start text-green-600 hover:text-green-700 hover:bg-green-50" onClick={async () => {
                                  await atualizarLancamento(item.id, {
                                    pago: true,
                                    dataRealizada: new Date()
                                  });
                                  toast.success("Lançamento marcado como pago!");
                                }}>
                                        <Check className="h-4 w-4 mr-2" />
                                        Marcar como Pago
                                      </Button>
                                      <Button size="sm" variant="ghost" className="justify-start text-red-600 hover:text-red-700 hover:bg-red-50" onClick={async () => {
                                  await atualizarLancamento(item.id, {
                                    pago: false,
                                    dataRealizada: null
                                  });
                                  toast.success("Lançamento marcado como não pago!");
                                }}>
                                        <X className="h-4 w-4 mr-2" />
                                        Marcar como Não Pago
                                      </Button>
                                      <Button size="sm" variant="ghost" className="justify-start text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => {
                                  setEditandoLancamento(item.id);
                                  setLancamentoEditado({
                                    tipo: item.tipo,
                                    descricao: item.descricao,
                                    categoriaId: item.categoriaId,
                                    valor: item.valor,
                                    contaBancaria: item.conta,
                                    dataEsperada: item.dataEsperada,
                                    dataRealizada: item.dataRealizada,
                                    pago: item.pago,
                                    fornecedorCliente: item.fornecedor
                                  });
                                }}>
                                        <Pencil className="h-4 w-4 mr-2" />
                                        Editar
                                      </Button>
                                      <Button size="sm" variant="ghost" className="justify-start text-destructive hover:bg-destructive/10" onClick={() => {
                                  setConfirmarExclusaoDialog({
                                    open: true,
                                    lancamentoId: item.id
                                  });
                                }}>
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Excluir
                                      </Button>
                                    </div>
                                  </PopoverContent>
                                </Popover>}
                            </TableCell>
                          </TableRow>;
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
                  <div className="flex items-center gap-2 text-green-600 rounded-lg">
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

              {(() => {
                const saldoOperacoes = valoresFinanceiros.aReceber - valoresFinanceiros.aPagar;
                const isNegative = saldoOperacoes < 0;
                return (
                  <Card className={`border-l-4 ${isNegative ? 'border-l-red-500' : 'border-l-green-500'} border-2 shadow-lg`}>
                    <CardHeader className="pb-3">
                      <div className={`flex items-center gap-2 ${isNegative ? 'text-red-600' : 'text-green-600'}`}>
                        <DollarSign className="h-5 w-5" />
                        <CardTitle className="text-base font-medium">Saldo das Operações</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className={`text-3xl font-bold ${isNegative ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrency(saldoOperacoes)}
                      </div>
                      <p className="text-sm text-muted-foreground">Saldo final projetado</p>
                      <p className="text-xs text-muted-foreground">
                        {valoresFinanceiros.aPagar !== 0 ? ((saldoOperacoes / valoresFinanceiros.aPagar * 100).toFixed(1)) : '0.0'}% de crescimento
                      </p>
                    </CardContent>
                  </Card>
                );
              })()}

              {/* Segunda linha de cards */}
              <Card className="border-l-4 border-l-orange-500 border-2 shadow-lg">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2 text-orange-600">
                    <ArrowDownLeft className="h-5 w-5" />
                    <CardTitle className="text-base font-medium">A Receber Atrasadas</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-3xl font-bold text-orange-600">
                    {formatCurrency(aReceberAtrasadas)}
                  </div>
                  <p className="text-sm text-muted-foreground">Total atrasado</p>
                  <p className="text-xs text-muted-foreground">Não varia com filtros</p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-purple-500 border-2 shadow-lg">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2 text-purple-600">
                    <ArrowUpRight className="h-5 w-5" />
                    <CardTitle className="text-base font-medium">A Pagar Atrasadas</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-3xl font-bold text-purple-600">
                    {formatCurrency(aPagarAtrasadas)}
                  </div>
                  <p className="text-sm text-muted-foreground">Total atrasado</p>
                  <p className="text-xs text-muted-foreground">Não varia com filtros</p>
                </CardContent>
              </Card>

              {(() => {
                const saldoPrevistoTotal = saldoTotal + (valoresFinanceiros.aReceber - valoresFinanceiros.aPagar);
                const isNegative = saldoPrevistoTotal < 0;
                return (
                  <Card className={`border-l-4 ${isNegative ? 'border-l-red-500' : 'border-l-green-500'} border-2 shadow-lg`}>
                    <CardHeader className="pb-3">
                      <div className={`flex items-center gap-2 ${isNegative ? 'text-red-600' : 'text-green-600'}`}>
                        <DollarSign className="h-5 w-5" />
                        <CardTitle className="text-base font-medium">Saldo Previsto Total</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className={`text-3xl font-bold ${isNegative ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrency(saldoPrevistoTotal)}
                      </div>
                      <p className="text-sm text-muted-foreground">Saldo atual + previsto</p>
                      <p className="text-xs text-muted-foreground">Varia com filtros</p>
                    </CardContent>
                  </Card>
                );
              })()}
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Planejamento de Fluxo de Caixa</CardTitle>
                    <p className="text-sm text-muted-foreground">Busque e visualize movimentações financeiras por período</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setPlanejamentoExpanded(!planejamentoExpanded)}>
                    {planejamentoExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </div>
              </CardHeader>
              {planejamentoExpanded && <CardContent className="space-y-6">
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
                    <Input type="date" value={dataInicial} onChange={e => setDataInicial(e.target.value)} disabled={periodoSelecionado !== ''} />
                  </div>

                  <div className="space-y-2">
                    <Label>Data Final</Label>
                    <Input type="date" value={dataFinal} onChange={e => setDataFinal(e.target.value)} disabled={periodoSelecionado !== ''} />
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
                      {contasBancarias.map(conta => <SelectItem key={conta.id} value={conta.id}>{conta.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {!buscaAtiva ? (
                  <Button onClick={handleBuscarMovimentacoes} className="w-full">
                    Buscar Movimentações
                  </Button>
                ) : (
                  <Button onClick={limparFiltrosPlanejamento} variant="outline" className="w-full">
                    Limpar Filtros
                  </Button>
                )}

                {movimentacoesFiltradas.length > 0 && <div className="space-y-4 mt-6">
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
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort('data')}
                    >
                      <div className="flex items-center gap-1">
                        Data
                        {sortColumn === 'data' && (
                          sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                        )}
                        {sortColumn !== 'data' && <ArrowUpDown className="h-4 w-4 opacity-30" />}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort('descricao')}
                    >
                      <div className="flex items-center gap-1">
                        Descrição
                        {sortColumn === 'descricao' && (
                          sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                        )}
                        {sortColumn !== 'descricao' && <ArrowUpDown className="h-4 w-4 opacity-30" />}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort('tipo')}
                    >
                      <div className="flex items-center gap-1">
                        Tipo
                        {sortColumn === 'tipo' && (
                          sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                        )}
                        {sortColumn !== 'tipo' && <ArrowUpDown className="h-4 w-4 opacity-30" />}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort('categoria')}
                    >
                      <div className="flex items-center gap-1">
                        Categoria
                        {sortColumn === 'categoria' && (
                          sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                        )}
                        {sortColumn !== 'categoria' && <ArrowUpDown className="h-4 w-4 opacity-30" />}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="text-right cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort('valor')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Valor
                        {sortColumn === 'valor' && (
                          sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                        )}
                        {sortColumn !== 'valor' && <ArrowUpDown className="h-4 w-4 opacity-30" />}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center gap-1">
                        Status
                        {sortColumn === 'status' && (
                          sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                        )}
                        {sortColumn !== 'status' && <ArrowUpDown className="h-4 w-4 opacity-30" />}
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                        <TableBody>
                          {movimentacoesOrdenadas.map(mov => <TableRow key={mov.id}>
                              <TableCell>{mov.data}</TableCell>
                              <TableCell>{mov.descricao}</TableCell>
                              <TableCell>
                                <Badge className="gap-1" style={{
                            backgroundColor: mov.tipo === 'receita' ? 'hsl(142 76% 36%)' : 'hsl(0 84% 60%)',
                            color: 'white',
                            borderColor: mov.tipo === 'receita' ? 'hsl(142 76% 36%)' : 'hsl(0 84% 60%)'
                          }}>
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
                                <Badge variant={mov.status === 'pago' ? 'default' : mov.status === 'vencido' ? 'destructive' : 'outline'}>
                                  {mov.status === 'pago' ? 'Pago' : mov.status === 'vencido' ? 'Vencido' : 'Pendente'}
                                </Badge>
                              </TableCell>
                            </TableRow>)}
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
                        <p className={`text-2xl font-bold ${movimentacoesFiltradas.filter(m => m.tipo === 'receita').reduce((acc, m) => acc + m.valor, 0) - movimentacoesFiltradas.filter(m => m.tipo === 'despesa').reduce((acc, m) => acc + m.valor, 0) >= 0 ? 'text-blue-600' : 'text-amber-600'}`}>
                          {formatCurrency(movimentacoesFiltradas.filter(m => m.tipo === 'receita').reduce((acc, m) => acc + m.valor, 0) - movimentacoesFiltradas.filter(m => m.tipo === 'despesa').reduce((acc, m) => acc + m.valor, 0))}
                        </p>
                      </div>
                    </div>
                  </div>}
              </CardContent>}
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal de Confirmação de Recebimento/Pagamento */}
      <Dialog open={confirmarPagamentoDialog.open && confirmarPagamentoDialog.tipo === 'confirmar'} onOpenChange={open => !open && setConfirmarPagamentoDialog({
      open: false,
      lancamentoId: '',
      tipo: 'confirmar'
    })}>
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
                  <Calendar mode="single" selected={dataRecebimento} onSelect={date => date && setDataRecebimento(date)} initialFocus className="pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmarPagamentoDialog({
            open: false,
            lancamentoId: '',
            tipo: 'confirmar'
          })}>
              Cancelar
            </Button>
            <Button onClick={() => handleConfirmarRecebimento(confirmarPagamentoDialog.lancamentoId, dataRecebimento)}>
              Confirmar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Cancelamento de Pagamento */}
      <AlertDialog open={confirmarPagamentoDialog.open && confirmarPagamentoDialog.tipo === 'cancelar'} onOpenChange={open => !open && setConfirmarPagamentoDialog({
      open: false,
      lancamentoId: '',
      tipo: 'cancelar'
    })}>
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

      {/* Modal de Confirmação de Edição */}
      <AlertDialog open={confirmarEdicaoDialog} onOpenChange={setConfirmarEdicaoDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Edição do Lançamento?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Você está prestes a editar este lançamento.</p>
              <p className="font-semibold text-amber-600">
                ⚠️ ATENÇÃO: Alterar a data realizada pode interferir no cálculo do DRE (Demonstrativo de Resultado do Exercício).
              </p>
              <p>Deseja continuar com a edição?</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
            if (editandoLancamento && lancamentoEditado) {
              await atualizarLancamento(editandoLancamento, {
                tipo: lancamentoEditado.tipo,
                descricao: lancamentoEditado.descricao,
                categoriaId: lancamentoEditado.categoriaId,
                valor: lancamentoEditado.valor,
                contaBancaria: lancamentoEditado.contaBancaria,
                dataEsperada: lancamentoEditado.dataEsperada,
                dataRealizada: lancamentoEditado.dataRealizada,
                pago: lancamentoEditado.pago,
                fornecedorCliente: lancamentoEditado.fornecedorCliente
              });
              toast.success("Lançamento atualizado com sucesso!");
              setEditandoLancamento(null);
              setLancamentoEditado(null);
              setConfirmarEdicaoDialog(false);
            }
          }}>
              Confirmar Edição
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de Confirmação de Exclusão */}
      <AlertDialog open={confirmarExclusaoDialog.open} onOpenChange={open => !open && setConfirmarExclusaoDialog({
      open: false,
      lancamentoId: ''
    })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão do Lançamento?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              {(() => {
              const lancamento = lancamentos.find(l => l.id === confirmarExclusaoDialog.lancamentoId);

              // Debug: Log para verificar os dados do lançamento
              console.log('🔍 Verificando recorrência:', {
                lancamento,
                formaPagamento: lancamento?.formaPagamento,
                lancamentoPaiId: lancamento?.lancamentoPaiId,
                frequenciaRepeticao: lancamento?.frequenciaRepeticao,
                mesesRecorrencia: lancamento?.mesesRecorrencia,
                numeroParcelas: lancamento?.numeroParcelas,
                temFilhos: lancamentos.some(l => l.lancamentoPaiId === lancamento?.id)
              });
              const ehRecorrencia = lancamento && (lancamento.formaPagamento === 'recorrente' || lancamento.formaPagamento === 'parcelado' || !!lancamento.lancamentoPaiId || lancamentos.some(l => l.lancamentoPaiId === lancamento.id) || !!lancamento.frequenciaRepeticao || lancamento.mesesRecorrencia && lancamento.mesesRecorrencia > 0 || lancamento.numeroParcelas && lancamento.numeroParcelas > 1);
              if (ehRecorrencia) {
                return <>
                      <p>Este lançamento faz parte de uma série de recorrência.</p>
                      <p className="font-semibold text-primary">
                        💡 Escolha uma das opções abaixo:
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        <li><strong>Deletar apenas este:</strong> Remove apenas o lançamento selecionado</li>
                        <li><strong>Deletar toda a série:</strong> Remove todos os lançamentos desta recorrência</li>
                      </ul>
                      <p className="font-semibold text-destructive">
                        ⚠️ ATENÇÃO: A exclusão afetará os cálculos do DRE e DFC.
                      </p>
                    </>;
              }
              return <>
                    <p>Você está prestes a excluir este lançamento permanentemente.</p>
                    <p className="font-semibold text-destructive">
                      ⚠️ ATENÇÃO: Ao excluir este lançamento, ele também será removido do DRE (Demonstrativo de Resultado do Exercício) e DFC (Demonstração do Fluxo de Caixa).
                    </p>
                    <p>Esta ação não pode ser desfeita. Deseja continuar?</p>
                  </>;
            })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            {(() => {
            const lancamento = lancamentos.find(l => l.id === confirmarExclusaoDialog.lancamentoId);
            const ehRecorrencia = lancamento && (lancamento.formaPagamento === 'recorrente' || lancamento.formaPagamento === 'parcelado' || !!lancamento.lancamentoPaiId || lancamentos.some(l => l.lancamentoPaiId === lancamento.id) || !!lancamento.frequenciaRepeticao || lancamento.mesesRecorrencia && lancamento.mesesRecorrencia > 0 || lancamento.numeroParcelas && lancamento.numeroParcelas > 1);
            if (ehRecorrencia) {
              return <>
                    <AlertDialogAction className="bg-orange-600 hover:bg-orange-700" onClick={async () => {
                  if (confirmarExclusaoDialog.lancamentoId) {
                    await deletarLancamento(confirmarExclusaoDialog.lancamentoId);
                    toast.success("Lançamento excluído com sucesso!");
                    setConfirmarExclusaoDialog({
                      open: false,
                      lancamentoId: ''
                    });
                  }
                }}>
                      Deletar Apenas Este
                    </AlertDialogAction>
                    <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={async () => {
                  if (confirmarExclusaoDialog.lancamentoId) {
                    await deletarRecorrenciaCompleta(confirmarExclusaoDialog.lancamentoId);
                    setConfirmarExclusaoDialog({
                      open: false,
                      lancamentoId: ''
                    });
                  }
                }}>
                      Deletar Toda a Série
                    </AlertDialogAction>
                  </>;
            }
            return <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={async () => {
              if (confirmarExclusaoDialog.lancamentoId) {
                await deletarLancamento(confirmarExclusaoDialog.lancamentoId);
                toast.success("Lançamento excluído com sucesso!");
                setConfirmarExclusaoDialog({
                  open: false,
                  lancamentoId: ''
                });
              }
            }}>
                  Excluir Permanentemente
                </AlertDialogAction>;
          })()}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <UploadExtratoModal open={isExtratoUploadOpen} onOpenChange={setIsExtratoUploadOpen} onImportComplete={() => {
      refetch();
    }} categorias={categorias} contasBancarias={contasAtivas} fornecedores={fornecedoresData} clientes={clientes} />
    </AppLayout>;
}