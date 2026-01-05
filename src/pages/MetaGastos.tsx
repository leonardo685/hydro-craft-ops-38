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
import { Target, Plus, Pencil, Trash2, TrendingUp, TrendingDown, AlertTriangle, ArrowUp, ArrowDown, Calculator, DollarSign, FileDown, Save } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { useCategoriasFinanceiras } from "@/hooks/use-categorias-financeiras";
import { useLancamentosFinanceiros } from "@/hooks/use-lancamentos-financeiros";
import { useMetasGastos } from "@/hooks/use-metas-gastos";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format, endOfMonth, addMonths, endOfYear, differenceInDays } from "date-fns";
import { ptBR, enUS } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { useEmpresa } from "@/contexts/EmpresaContext";
import { addLogoToPDF } from "@/lib/pdf-logo-utils";
import { translations } from "@/i18n/translations";

import jsPDF from "jspdf";

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
  despesasNaoOperacionais: ItemPlanejamento[];
  investimentos: ItemPlanejamento[];
  ajusteFaturamento: number;
  ajusteDespesas: number;
  ajusteMargemContribuicao: number;
}

const calcularDataFim = (
  dataInicio: Date, 
  periodo: 'mensal' | 'trimestral' | 'anual'
): Date => {
  switch (periodo) {
    case 'mensal':
      return endOfMonth(dataInicio);
    case 'trimestral':
      const terceiroMes = addMonths(dataInicio, 2);
      return endOfMonth(terceiroMes);
    case 'anual':
      return endOfYear(dataInicio);
  }
};

export default function MetaGastos() {
  const { t, language } = useLanguage();
  const dateLocale = language === 'pt-BR' ? ptBR : enUS;
  const { empresaAtual } = useEmpresa();
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
    despesasNaoOperacionais: [],
    investimentos: [],
    ajusteFaturamento: 0,
    ajusteDespesas: 0,
    ajusteMargemContribuicao: 30
  });

  const [formDespesa, setFormDespesa] = useState({ descricao: '', valor: '' });
  const [formFaturamento, setFormFaturamento] = useState({ descricao: '', valor: '' });
  const [formDespesaNaoOp, setFormDespesaNaoOp] = useState({ descricao: '', valor: '' });
  const [formInvestimento, setFormInvestimento] = useState({ descricao: '', valor: '' });
  
  // Estados para calculadora
  const [calcOpen, setCalcOpen] = useState(false);
  const [calcTipo, setCalcTipo] = useState<'despesa' | 'faturamento' | 'despesaNaoOp' | 'investimento'>('despesa');
  const [calcValorBase, setCalcValorBase] = useState('');
  const [calcMultiplicador, setCalcMultiplicador] = useState('1');

  // Carregar planejamento salvo do localStorage ao inicializar
  useEffect(() => {
    try {
      const saved = localStorage.getItem('planejamento_estrategico');
      if (saved) {
        const parsed = JSON.parse(saved);
        setPlanejamento({
          despesasFixas: parsed.despesasFixas || [],
          faturamentos: parsed.faturamentos || [],
          despesasNaoOperacionais: parsed.despesasNaoOperacionais || [],
          investimentos: parsed.investimentos || [],
          ajusteFaturamento: parsed.ajusteFaturamento || 0,
          ajusteDespesas: parsed.ajusteDespesas || 0,
          ajusteMargemContribuicao: parsed.ajusteMargemContribuicao || 30
        });
        console.log('Planejamento carregado do localStorage:', parsed);
      }
    } catch (error) {
      console.error('Erro ao carregar planejamento do localStorage:', error);
    }
  }, []);

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
    return new Intl.NumberFormat(language === 'pt-BR' ? 'pt-BR' : 'en-US', {
      style: 'currency',
      currency: language === 'pt-BR' ? 'BRL' : 'USD'
    }).format(value);
  };

  const getPercentualUtilizado = (valorGasto: number, valorMeta: number) => {
    return (valorGasto / valorMeta) * 100;
  };

  const getStatusMeta = (percentual: number) => {
    if (percentual >= 100) return { label: t('metaGastos.exceeded'), variant: 'destructive' as const, icon: TrendingDown };
    if (percentual >= 80) return { label: t('metaGastos.nearLimit'), variant: 'default' as const, icon: AlertTriangle };
    return { label: t('metaGastos.withinGoal'), variant: 'default' as const, icon: TrendingUp };
  };

  const handleSalvarMeta = async () => {
    if (!metaForm.categoriaId || !metaForm.valorMeta) {
      toast.error(t('metaGastos.fillAllFields'));
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
      if (sucesso) toast.success(t('metaGastos.goalUpdated'));
    } else {
      sucesso = await adicionarMeta(metaData);
      if (sucesso) toast.success(t('metaGastos.goalCreated'));
    }

    if (sucesso) {
      setIsDialogOpen(false);
      resetForm();
    } else {
      toast.error(t('metaGastos.goalSaveError'));
    }
  };

  const handleEditarMeta = (meta: MetaGasto) => {
    const dataFimRecalculada = calcularDataFim(meta.dataInicio, meta.periodo);
    
    setEditandoId(meta.id);
    setMetaForm({
      categoriaId: meta.categoriaId,
      valorMeta: String(meta.valorMeta),
      periodo: meta.periodo,
      dataInicio: meta.dataInicio,
      dataFim: dataFimRecalculada,
      observacoes: meta.observacoes || ''
    });
    setIsDialogOpen(true);
  };

  const handleExcluirMeta = async (id: string) => {
    const sucesso = await deletarMeta(id);
    if (sucesso) {
      toast.success(t('metaGastos.goalDeleted'));
    } else {
      toast.error(t('metaGastos.goalDeleteError'));
    }
  };

  const resetForm = () => {
    const hoje = new Date();
    const dataFimInicial = calcularDataFim(hoje, 'mensal');
    
    setMetaForm({
      categoriaId: '',
      valorMeta: '',
      periodo: 'mensal',
      dataInicio: hoje,
      dataFim: dataFimInicial,
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
    const totalDespesasNaoOp = planejamento.despesasNaoOperacionais.reduce((acc, d) => acc + d.valor, 0);
    const totalInvestimentos = planejamento.investimentos.reduce((acc, i) => acc + i.valor, 0);
    
    const totalFaturamento = totalFaturamentoBase * (1 + planejamento.ajusteFaturamento / 100);
    const totalDespesas = totalDespesasBase * (1 + planejamento.ajusteDespesas / 100);
    
    const metaMargemReais = totalFaturamento * (planejamento.ajusteMargemContribuicao / 100);
    const custosVariaveisMaximo = totalFaturamento - metaMargemReais;
    const percentualCustosVariaveis = totalFaturamento > 0 ? custosVariaveisMaximo / totalFaturamento : 0;
    const pontoEquilibrio = percentualCustosVariaveis < 1 ? totalDespesas / (1 - percentualCustosVariaveis) : 0;
    const lucroOperacional = totalFaturamento - totalDespesas - custosVariaveisMaximo;
    const margemLucroOperacional = totalFaturamento > 0 ? (lucroOperacional / totalFaturamento) * 100 : 0;
    const indiceLucratividade = totalDespesas > 0 ? lucroOperacional / totalDespesas : 0;
    
    const lucroAntesInvestimentos = lucroOperacional;
    const lucroLiquido = lucroOperacional - totalDespesasNaoOp - totalInvestimentos;
    const margemLucroLiquido = totalFaturamento > 0 ? (lucroLiquido / totalFaturamento) * 100 : 0;
    
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
      totalDespesasBase,
      totalDespesasNaoOp,
      totalInvestimentos,
      lucroAntesInvestimentos,
      lucroLiquido,
      margemLucroLiquido
    };
  }, [planejamento]);

  // Funções para gerenciar despesas fixas
  const adicionarDespesa = () => {
    if (!formDespesa.descricao || !formDespesa.valor) {
      toast.error(t('metaGastos.fillAllFields'));
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
    toast.success(t('metaGastos.expenseAdded'));
  };

  const removerDespesa = (id: string) => {
    setPlanejamento(prev => ({
      ...prev,
      despesasFixas: prev.despesasFixas.filter(d => d.id !== id)
    }));
    toast.success(t('metaGastos.expenseRemoved'));
  };

  // Funções para gerenciar faturamento
  const adicionarFaturamento = () => {
    if (!formFaturamento.descricao || !formFaturamento.valor) {
      toast.error(t('metaGastos.fillAllFields'));
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
    toast.success(t('metaGastos.revenueAdded'));
  };

  const removerFaturamento = (id: string) => {
    setPlanejamento(prev => ({
      ...prev,
      faturamentos: prev.faturamentos.filter(f => f.id !== id)
    }));
    toast.success(t('metaGastos.revenueRemoved'));
  };

  // Funções para gerenciar despesas não operacionais
  const adicionarDespesaNaoOp = () => {
    if (!formDespesaNaoOp.descricao || !formDespesaNaoOp.valor) {
      toast.error(t('metaGastos.fillAllFields'));
      return;
    }
    
    const novaDespesa: ItemPlanejamento = {
      id: Date.now().toString(),
      descricao: formDespesaNaoOp.descricao,
      valor: parseFloat(formDespesaNaoOp.valor)
    };
    
    setPlanejamento(prev => ({
      ...prev,
      despesasNaoOperacionais: [...prev.despesasNaoOperacionais, novaDespesa]
    }));
    
    setFormDespesaNaoOp({ descricao: '', valor: '' });
    toast.success(t('metaGastos.nonOpExpenseAdded'));
  };

  const removerDespesaNaoOp = (id: string) => {
    setPlanejamento(prev => ({
      ...prev,
      despesasNaoOperacionais: prev.despesasNaoOperacionais.filter(d => d.id !== id)
    }));
    toast.success(t('metaGastos.nonOpExpenseRemoved'));
  };

  // Funções para gerenciar investimentos
  const adicionarInvestimento = () => {
    if (!formInvestimento.descricao || !formInvestimento.valor) {
      toast.error(t('metaGastos.fillAllFields'));
      return;
    }
    
    const novoInvestimento: ItemPlanejamento = {
      id: Date.now().toString(),
      descricao: formInvestimento.descricao,
      valor: parseFloat(formInvestimento.valor)
    };
    
    setPlanejamento(prev => ({
      ...prev,
      investimentos: [...prev.investimentos, novoInvestimento]
    }));
    
    setFormInvestimento({ descricao: '', valor: '' });
    toast.success(t('metaGastos.investmentAdded'));
  };

  const removerInvestimento = (id: string) => {
    setPlanejamento(prev => ({
      ...prev,
      investimentos: prev.investimentos.filter(i => i.id !== id)
    }));
    toast.success(t('metaGastos.investmentRemoved'));
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
    } else if (calcTipo === 'faturamento') {
      setFormFaturamento(prev => ({ ...prev, valor: resultado }));
    } else if (calcTipo === 'despesaNaoOp') {
      setFormDespesaNaoOp(prev => ({ ...prev, valor: resultado }));
    } else if (calcTipo === 'investimento') {
      setFormInvestimento(prev => ({ ...prev, valor: resultado }));
    }
    
    // Resetar calculadora
    setCalcOpen(false);
    setCalcValorBase('');
    setCalcMultiplicador('1');
  };

  const abrirCalculadora = (tipo: 'despesa' | 'faturamento' | 'despesaNaoOp' | 'investimento') => {
    setCalcTipo(tipo);
    setCalcOpen(true);
  };

  // Função para salvar planejamento
  const salvarPlanejamento = () => {
    try {
      const planejamentoParaSalvar = {
        ...planejamento,
        dataGeracao: new Date().toISOString(),
        totais: calcularTotais
      };
      
      localStorage.setItem('planejamento_estrategico', JSON.stringify(planejamentoParaSalvar));
      
      toast.success(t('metaGastos.planningSavedSuccess'), {
        description: t('metaGastos.planningSavedDesc')
      });
    } catch (error) {
      console.error('Erro ao salvar planejamento:', error);
      toast.error(t('metaGastos.planningSaveError'));
    }
  };

  // Função para gerar PDF do Planejamento
  const gerarPDFPlanejamento = async () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      let yPosition = 10;
      let currentPage = 1;

      // Get translations based on language
      const pdfT = translations[language].pdf;
      const locale = language === 'en' ? 'en-US' : 'pt-BR';
      const currency = language === 'en' ? 'USD' : 'BRL';
      
      const tipoIdentificacao = empresaAtual?.tipo_identificacao || 'cnpj';
      const labelIdentificacao = tipoIdentificacao === 'ein' ? 'EIN' : tipoIdentificacao === 'ssn' ? 'SSN' : 'CNPJ';
      
      const EMPRESA_INFO = {
        nome: empresaAtual?.razao_social || empresaAtual?.nome || "N/A",
        cnpj: empresaAtual?.cnpj || "",
        telefone: empresaAtual?.telefone || "",
        email: empresaAtual?.email || "",
        labelIdentificacao
      };

      const pdfFormatCurrency = (value: number) => {
        return value.toLocaleString(locale, { style: 'currency', currency });
      };
      
      const pdfFormatDate = (date: Date) => {
        return date.toLocaleDateString(locale);
      };

      // Função para adicionar detalhes decorativos (triângulo vermelho)
      const adicionarDetalheDecorativo = () => {
        doc.setFillColor(220, 38, 38);
        doc.triangle(pageWidth - 20, 8, pageWidth - 5, 8, pageWidth - 5, 23, 'F');
      };

      // Função para adicionar rodapé
      const adicionarRodape = (numeroPagina: number) => {
        const rodapeY = pageHeight - 15;
        
        // Triângulos decorativos no canto inferior direito
        doc.setFillColor(220, 38, 38);
        doc.triangle(pageWidth - 30, pageHeight - 5, pageWidth - 15, pageHeight - 5, pageWidth - 15, pageHeight - 20, 'F');
        doc.setFillColor(0, 0, 0);
        doc.triangle(pageWidth - 15, pageHeight - 5, pageWidth - 5, pageHeight - 5, pageWidth - 5, pageHeight - 15, 'F');
        
        // Número da página
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        doc.text(`${pdfT.page} ${numeroPagina}`, pageWidth / 2, rodapeY, { align: "center" });
        doc.text(`${pdfT.generatedOn}: ${pdfFormatDate(new Date())}`, 20, rodapeY);
        doc.setTextColor(0, 0, 0);
      };

      // Função helper para quebra de linha
      const desenharCelulaComQuebraLinha = (
        texto: string,
        x: number,
        y: number,
        largura: number,
        alturaMinima: number = 8
      ): number => {
        const maxWidth = largura - 4;
        const lineHeight = 4;
        const cellPadding = 2;
        
        const textLines = doc.splitTextToSize(texto, maxWidth);
        const alturaCalculada = Math.max(alturaMinima, textLines.length * lineHeight + cellPadding * 2);
        
        doc.setDrawColor(200, 200, 200);
        doc.rect(x, y, largura, alturaCalculada);
        
        textLines.forEach((line: string, index: number) => {
          const textY = y + 5 + (index * lineHeight);
          doc.text(line, x + cellPadding, textY);
        });
        
        return alturaCalculada;
      };

      const verificarEspaco = (espacoNecessario: number) => {
        if (yPosition + espacoNecessario > pageHeight - 30) {
          adicionarRodape(currentPage);
          doc.addPage();
          currentPage++;
          yPosition = 20;
        }
      };

      // === CABEÇALHO ===
      // Logo dinâmico
      await addLogoToPDF(doc, empresaAtual?.logo_url, pageWidth - 50, 8, 35, 20);

      // Informações da empresa (lado esquerdo)
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(EMPRESA_INFO.nome, 20, 15);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(`${EMPRESA_INFO.labelIdentificacao}: ${EMPRESA_INFO.cnpj}`, 20, 20);
      doc.text(`Tel: ${EMPRESA_INFO.telefone} | Email: ${EMPRESA_INFO.email}`, 20, 24);

      // Linha vermelha decorativa
      doc.setDrawColor(220, 38, 38);
      doc.setLineWidth(1);
      doc.line(20, 28, pageWidth - 20, 28);

      // Triângulo decorativo
      adicionarDetalheDecorativo();

      // === TÍTULO ===
      yPosition = 40;
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(220, 38, 38);
      doc.text(pdfT.strategicPlanning, pageWidth / 2, yPosition, { align: "center" });
      
      yPosition += 8;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text(`${pdfT.date}: ${pdfFormatDate(new Date())}`, pageWidth / 2, yPosition, { align: "center" });
      
      doc.setTextColor(0, 0, 0);
      yPosition += 15;

      // === FATURAMENTOS ===
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(220, 38, 38);
      doc.text(`1. ${pdfT.revenues}`, 20, yPosition);
      yPosition += 8;

      if (planejamento.faturamentos.length > 0) {
        // Cabeçalho da tabela
        doc.setFillColor(128, 128, 128);
        doc.rect(20, yPosition, pageWidth - 40, 8, 'F');
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(255, 255, 255);
        doc.text(pdfT.description, 22, yPosition + 5.5);
        doc.text(pdfT.value, pageWidth - 60, yPosition + 5.5);
        yPosition += 8;

        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        planejamento.faturamentos.forEach((item, index) => {
          verificarEspaco(8);
          // Zebra striping
          if (index % 2 === 0) {
            doc.setFillColor(245, 245, 245);
            doc.rect(20, yPosition, pageWidth - 40, 8, 'F');
          }
          doc.setDrawColor(200, 200, 200);
          doc.rect(20, yPosition, pageWidth - 40, 8);
          doc.text(item.descricao, 22, yPosition + 5.5);
          doc.text(pdfFormatCurrency(item.valor), pageWidth - 60, yPosition + 5.5);
          yPosition += 8;
        });

        // Total
        doc.setFillColor(220, 220, 220);
        doc.rect(20, yPosition, pageWidth - 40, 8, 'F');
        doc.setFont("helvetica", "bold");
        doc.text(pdfT.total.toUpperCase(), 22, yPosition + 5.5);
        doc.text(pdfFormatCurrency(calcularTotais.totalFaturamentoBase), pageWidth - 60, yPosition + 5.5);
        yPosition += 8;
      } else {
        doc.setFontSize(9);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(100, 100, 100);
        doc.text(pdfT.noRevenueRegistered, 22, yPosition + 5);
        doc.setTextColor(0, 0, 0);
        yPosition += 8;
      }

      yPosition += 8;

      // === DESPESAS FIXAS ===
      verificarEspaco(20);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(220, 38, 38);
      doc.text(`2. ${pdfT.fixedExpenses}`, 20, yPosition);
      yPosition += 8;

      if (planejamento.despesasFixas.length > 0) {
        // Cabeçalho da tabela
        doc.setFillColor(128, 128, 128);
        doc.rect(20, yPosition, pageWidth - 40, 8, 'F');
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(255, 255, 255);
        doc.text(pdfT.description, 22, yPosition + 5.5);
        doc.text(pdfT.value, pageWidth - 60, yPosition + 5.5);
        yPosition += 8;

        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        planejamento.despesasFixas.forEach((item, index) => {
          verificarEspaco(8);
          if (index % 2 === 0) {
            doc.setFillColor(245, 245, 245);
            doc.rect(20, yPosition, pageWidth - 40, 8, 'F');
          }
          doc.setDrawColor(200, 200, 200);
          doc.rect(20, yPosition, pageWidth - 40, 8);
          doc.text(item.descricao, 22, yPosition + 5.5);
          doc.text(pdfFormatCurrency(item.valor), pageWidth - 60, yPosition + 5.5);
          yPosition += 8;
        });

        doc.setFillColor(220, 220, 220);
        doc.rect(20, yPosition, pageWidth - 40, 8, 'F');
        doc.setFont("helvetica", "bold");
        doc.text(pdfT.total.toUpperCase(), 22, yPosition + 5.5);
        doc.text(pdfFormatCurrency(calcularTotais.totalDespesasBase), pageWidth - 60, yPosition + 5.5);
        yPosition += 8;
      } else {
        doc.setFontSize(9);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(100, 100, 100);
        doc.text(pdfT.noExpenseRegistered, 22, yPosition + 5);
        doc.setTextColor(0, 0, 0);
        yPosition += 8;
      }

      yPosition += 8;

      // === DESPESAS NÃO OPERACIONAIS ===
      verificarEspaco(20);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(220, 38, 38);
      doc.text(`3. ${pdfT.nonOperatingExpenses}`, 20, yPosition);
      yPosition += 8;

      if (planejamento.despesasNaoOperacionais.length > 0) {
        doc.setFillColor(128, 128, 128);
        doc.rect(20, yPosition, pageWidth - 40, 8, 'F');
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(255, 255, 255);
        doc.text(pdfT.description, 22, yPosition + 5.5);
        doc.text(pdfT.value, pageWidth - 60, yPosition + 5.5);
        yPosition += 8;

        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        planejamento.despesasNaoOperacionais.forEach((item, index) => {
          verificarEspaco(8);
          if (index % 2 === 0) {
            doc.setFillColor(245, 245, 245);
            doc.rect(20, yPosition, pageWidth - 40, 8, 'F');
          }
          doc.setDrawColor(200, 200, 200);
          doc.rect(20, yPosition, pageWidth - 40, 8);
          doc.text(item.descricao, 22, yPosition + 5.5);
          doc.text(pdfFormatCurrency(item.valor), pageWidth - 60, yPosition + 5.5);
          yPosition += 8;
        });

        doc.setFillColor(220, 220, 220);
        doc.rect(20, yPosition, pageWidth - 40, 8, 'F');
        doc.setFont("helvetica", "bold");
        doc.text(pdfT.total.toUpperCase(), 22, yPosition + 5.5);
        doc.text(pdfFormatCurrency(calcularTotais.totalDespesasNaoOp), pageWidth - 60, yPosition + 5.5);
        yPosition += 8;
      } else {
        doc.setFontSize(9);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(100, 100, 100);
        doc.text(pdfT.noNonOpExpenseRegistered, 22, yPosition + 5);
        doc.setTextColor(0, 0, 0);
        yPosition += 8;
      }

      yPosition += 8;

      // === INVESTIMENTOS ===
      verificarEspaco(20);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(220, 38, 38);
      doc.text(`4. ${pdfT.investmentsTitle}`, 20, yPosition);
      yPosition += 8;

      if (planejamento.investimentos.length > 0) {
        doc.setFillColor(128, 128, 128);
        doc.rect(20, yPosition, pageWidth - 40, 8, 'F');
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(255, 255, 255);
        doc.text(pdfT.description, 22, yPosition + 5.5);
        doc.text(pdfT.value, pageWidth - 60, yPosition + 5.5);
        yPosition += 8;

        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        planejamento.investimentos.forEach((item, index) => {
          verificarEspaco(8);
          if (index % 2 === 0) {
            doc.setFillColor(245, 245, 245);
            doc.rect(20, yPosition, pageWidth - 40, 8, 'F');
          }
          doc.setDrawColor(200, 200, 200);
          doc.rect(20, yPosition, pageWidth - 40, 8);
          doc.text(item.descricao, 22, yPosition + 5.5);
          doc.text(pdfFormatCurrency(item.valor), pageWidth - 60, yPosition + 5.5);
          yPosition += 8;
        });

        doc.setFillColor(220, 220, 220);
        doc.rect(20, yPosition, pageWidth - 40, 8, 'F');
        doc.setFont("helvetica", "bold");
        doc.text(pdfT.total.toUpperCase(), 22, yPosition + 5.5);
        doc.text(pdfFormatCurrency(calcularTotais.totalInvestimentos), pageWidth - 60, yPosition + 5.5);
        yPosition += 8;
      } else {
        doc.setFontSize(9);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(100, 100, 100);
        doc.text(pdfT.noInvestmentRegistered, 22, yPosition + 5);
        doc.setTextColor(0, 0, 0);
        yPosition += 8;
      }

      yPosition += 10;

      // === ANÁLISE FINANCEIRA ===
      verificarEspaco(70);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(220, 38, 38);
      doc.text(`5. ${pdfT.financialAnalysis}`, 20, yPosition);
      yPosition += 10;

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);

      const indicadores = [
        { label: pdfT.adjustedRevenue, valor: calcularTotais.totalFaturamento, ajuste: `(${planejamento.ajusteFaturamento > 0 ? '+' : ''}${planejamento.ajusteFaturamento}%)` },
        { label: pdfT.adjustedFixedExpenses, valor: calcularTotais.totalDespesas, ajuste: `(${planejamento.ajusteDespesas > 0 ? '+' : ''}${planejamento.ajusteDespesas}%)` },
        { label: pdfT.marginGoal, valor: calcularTotais.metaMargemReais, ajuste: `(${planejamento.ajusteMargemContribuicao}%)` },
        { label: pdfT.maxVariableCosts, valor: calcularTotais.custosVariaveisMaximo, ajuste: `(${(calcularTotais.percentualCustosVariaveis * 100).toFixed(1)}%)` },
        { label: pdfT.breakEvenPointPdf, valor: calcularTotais.pontoEquilibrio, ajuste: "" },
        { label: pdfT.operatingProfitMargin, valor: calcularTotais.margemLucroOperacional, ajuste: "%", isPercentual: true },
        { label: pdfT.profitabilityIndexPdf, valor: calcularTotais.indiceLucratividade, ajuste: "x", isMultiplicador: true },
      ];

      indicadores.forEach((item: any, index: number) => {
        verificarEspaco(10);
        // Zebra striping
        if (index % 2 === 0) {
          doc.setFillColor(245, 245, 245);
          doc.rect(20, yPosition, pageWidth - 40, 8, 'F');
        }
        
        const altura = desenharCelulaComQuebraLinha(
          item.label,
          20,
          yPosition,
          (pageWidth - 40) * 0.6,
          8
        );
        
        doc.setDrawColor(200, 200, 200);
        doc.rect(20 + (pageWidth - 40) * 0.6, yPosition, (pageWidth - 40) * 0.4, altura);
        
        let valorTexto = '';
        if (item.isPercentual) {
          valorTexto = `${item.valor.toFixed(2)}${item.ajuste}`;
        } else if (item.isMultiplicador) {
          valorTexto = `${item.valor.toFixed(2)}${item.ajuste}`;
        } else {
          valorTexto = `${pdfFormatCurrency(item.valor)} ${item.ajuste}`;
        }
        
        doc.text(valorTexto, 22 + (pageWidth - 40) * 0.6, yPosition + 5.5);
        yPosition += altura;
      });

      yPosition += 12;

      // === RESULTADO FINAL ===
      verificarEspaco(35);
      doc.setFillColor(254, 242, 242);
      doc.rect(20, yPosition, pageWidth - 40, 28, 'F');
      doc.setDrawColor(220, 38, 38);
      doc.setLineWidth(0.5);
      doc.rect(20, yPosition, pageWidth - 40, 28);
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(220, 38, 38);
      doc.text(pdfT.projectedNetProfit, pageWidth / 2, yPosition + 10, { align: 'center' });
      
      doc.setFontSize(18);
      const lucroColor = calcularTotais.lucroLiquido >= 0 ? [34, 139, 34] : [220, 53, 69];
      doc.setTextColor(lucroColor[0], lucroColor[1], lucroColor[2]);
      doc.text(pdfFormatCurrency(calcularTotais.lucroLiquido), pageWidth / 2, yPosition + 22, { align: 'center' });
      
      yPosition += 35;

      // === RODAPÉ EM TODAS AS PÁGINAS ===
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        adicionarRodape(i);
      }

      const fileName = language === 'en' 
        ? `Strategic-Planning-${new Date().toLocaleDateString('en-US').replace(/\//g, '-')}.pdf`
        : `Planejamento-Estrategico-${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`;

      doc.save(fileName);
      toast.success(t('metaGastos.pdfGenerated'));
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast.error(t('metaGastos.pdfError'));
    }
  };

  // Componente Popover da Calculadora
  const CalculadoraPopover = ({ tipo }: { tipo: 'despesa' | 'faturamento' | 'despesaNaoOp' | 'investimento' }) => (
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
            <h4 className="font-semibold mb-2">{t('metaGastos.calculator')}</h4>
            <p className="text-sm text-muted-foreground">
              {t('metaGastos.calculatorDesc')}
            </p>
          </div>
          
          <div className="space-y-3">
            <div>
              <Label htmlFor="calc-base">{t('metaGastos.baseValue')}</Label>
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
              <Label htmlFor="calc-mult">{t('metaGastos.multiplier')}</Label>
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
                <span className="text-sm font-medium">{t('metaGastos.result')}:</span>
                <span className="text-lg font-bold text-primary">
                  {formatCurrency(calcularValor())}
                </span>
              </div>
              
              <Button 
                onClick={aplicarCalculadora} 
                className="w-full"
                disabled={!calcValorBase}
              >
                {t('metaGastos.applyValue')}
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
            <h1 className="text-3xl font-bold">{t('metaGastos.pageTitle')}</h1>
            <p className="text-muted-foreground">{t('metaGastos.pageSubtitle')}</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={modeloGestao} onValueChange={(value: 'dre' | 'esperado' | 'realizado') => setModeloGestao(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="realizado">{t('metaGastos.realized')}</SelectItem>
                <SelectItem value="esperado">{t('metaGastos.expected')}</SelectItem>
                <SelectItem value="dre">{t('metaGastos.dre')}</SelectItem>
              </SelectContent>
            </Select>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('metaGastos.newGoal')}
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editandoId ? t('metaGastos.editGoal') : t('metaGastos.newSpendingGoal')}</DialogTitle>
                <DialogDescription>
                  {t('metaGastos.defineGoalDesc')}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('metaGastos.category')} *</Label>
                    <Select value={metaForm.categoriaId} onValueChange={(value) => setMetaForm(prev => ({ ...prev, categoriaId: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('metaGastos.selectCategory')} />
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
                    <Label>{t('metaGastos.goalValue')} *</Label>
                    <Input
                      type="number"
                      placeholder="0,00"
                      value={metaForm.valorMeta}
                      onChange={(e) => setMetaForm(prev => ({ ...prev, valorMeta: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t('metaGastos.period')}</Label>
                  <Select value={metaForm.periodo} onValueChange={(value: 'mensal' | 'trimestral' | 'anual') => {
                    const novaDataFim = calcularDataFim(metaForm.dataInicio, value);
                    setMetaForm(prev => ({ 
                      ...prev, 
                      periodo: value,
                      dataFim: novaDataFim 
                    }));
                  }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mensal">{t('metaGastos.monthly')}</SelectItem>
                      <SelectItem value="trimestral">{t('metaGastos.quarterly')}</SelectItem>
                      <SelectItem value="anual">{t('metaGastos.yearly')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('metaGastos.startDate')}</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !metaForm.dataInicio && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {metaForm.dataInicio ? format(metaForm.dataInicio, "dd/MM/yyyy", { locale: dateLocale }) : t('metaGastos.select')}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={metaForm.dataInicio}
                          onSelect={(date) => {
                            if (date) {
                              const novaDataFim = calcularDataFim(date, metaForm.periodo);
                              setMetaForm(prev => ({ 
                                ...prev, 
                                dataInicio: date,
                                dataFim: novaDataFim
                              }));
                            }
                          }}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label>{t('metaGastos.endDate')}</Label>
                      <Badge variant="outline" className="text-xs">
                        {t('metaGastos.automatic')}
                      </Badge>
                    </div>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start text-left font-normal bg-muted cursor-default"
                      disabled
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(metaForm.dataFim, "dd/MM/yyyy", { locale: dateLocale })}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      {t('metaGastos.calculatedBasedOnPeriod')}
                    </p>
                  </div>
                </div>

                <div className="bg-muted p-3 rounded-md flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{t('metaGastos.duration')}:</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {differenceInDays(metaForm.dataFim, metaForm.dataInicio) + 1} {t('metaGastos.days')}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      ({format(metaForm.dataInicio, "dd/MM", { locale: dateLocale })} {t('metaGastos.until')} {format(metaForm.dataFim, "dd/MM/yyyy", { locale: dateLocale })})
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t('metaGastos.observations')}</Label>
                  <Textarea
                    placeholder={t('metaGastos.addObservationsPlaceholder')}
                    value={metaForm.observacoes}
                    onChange={(e) => setMetaForm(prev => ({ ...prev, observacoes: e.target.value }))}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>{t('metaGastos.cancel')}</Button>
                  <Button onClick={handleSalvarMeta}>{t('metaGastos.saveGoal')}</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        <Tabs defaultValue="metas" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="metas">{t('metaGastos.spendingGoals')}</TabsTrigger>
            <TabsTrigger value="estrategico">{t('metaGastos.strategicPlanning')}</TabsTrigger>
          </TabsList>

          {/* ABA 1: METAS DE GASTOS */}
          <TabsContent value="metas" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-l-4 border-l-primary">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base font-medium">{t('metaGastos.totalGoals')}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-3xl font-bold text-primary">
                    {formatCurrency(totalMetas)}
                  </div>
                  <p className="text-sm text-muted-foreground">{metasComGastos.length} {t('metaGastos.goalsRegistered')}</p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-red-500">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2 text-destructive">
                    <TrendingDown className="h-5 w-5" />
                    <CardTitle className="text-base font-medium">{t('metaGastos.totalSpent')}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-3xl font-bold text-destructive">
                    {formatCurrency(totalGasto)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {((totalGasto / totalMetas) * 100).toFixed(1)}% {t('metaGastos.ofGoals')}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-green-500">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2 text-green-600">
                    <TrendingUp className="h-5 w-5" />
                    <CardTitle className="text-base font-medium">{t('metaGastos.available')}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-3xl font-bold text-green-600">
                    {formatCurrency(disponivel)}
                  </div>
                  <p className="text-sm text-muted-foreground">{t('metaGastos.remainingBalance')}</p>
                </CardContent>
              </Card>
            </div>

            <Card>
          <CardHeader>
            <CardTitle>{t('metaGastos.spendingGoals')}</CardTitle>
            <div className="flex gap-2 mt-4">
              <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder={t('metaGastos.category')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">{t('metaGastos.allCategories')}</SelectItem>
                  {getCategoriasForSelect().map(categoria => (
                    <SelectItem key={categoria.value} value={categoria.value}>
                      {categoria.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filtroPeriodo} onValueChange={setFiltroPeriodo}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={t('metaGastos.period')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">{t('metaGastos.allPeriods')}</SelectItem>
                  <SelectItem value="mensal">{t('metaGastos.monthly')}</SelectItem>
                  <SelectItem value="trimestral">{t('metaGastos.quarterly')}</SelectItem>
                  <SelectItem value="anual">{t('metaGastos.yearly')}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={t('common.status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">{t('metaGastos.allStatuses')}</SelectItem>
                  <SelectItem value="dentro">{t('metaGastos.withinGoal')}</SelectItem>
                  <SelectItem value="proximo">{t('metaGastos.nearLimit')}</SelectItem>
                  <SelectItem value="excedido">{t('metaGastos.exceeded')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('metaGastos.categoryColumn')}</TableHead>
                  <TableHead>{t('metaGastos.periodColumn')}</TableHead>
                  <TableHead>{t('metaGastos.goalValueColumn')}</TableHead>
                  <TableHead>{t('metaGastos.spentValueColumn')}</TableHead>
                  <TableHead>{t('metaGastos.progressColumn')}</TableHead>
                  <TableHead>{t('metaGastos.statusColumn')}</TableHead>
                  <TableHead className="text-right">{t('metaGastos.actionsColumn')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metasFiltradas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      {t('metaGastos.noGoalsFound')}
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
                            {meta.periodo === 'mensal' ? t('metaGastos.monthly') : meta.periodo === 'trimestral' ? t('metaGastos.quarterly') : t('metaGastos.yearly')}
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
            {/* Header com botão de exportar */}
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">{t('metaGastos.financialSimulation')}</h3>
                <p className="text-sm text-muted-foreground">{t('metaGastos.financialSimulationDesc')}</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={salvarPlanejamento} variant="default" className="gap-2">
                  <Save className="h-4 w-4" />
                  {t('metaGastos.savePlanning')}
                </Button>
                <Button onClick={gerarPDFPlanejamento} variant="outline" className="gap-2">
                  <FileDown className="h-4 w-4" />
                  {t('metaGastos.exportPdf')}
                </Button>
              </div>
            </div>

            {/* Seção 1: Formulários de Entrada */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Formulário Despesas Fixas */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('metaGastos.averageFixedExpenses')}</CardTitle>
                  <p className="text-sm text-muted-foreground">{t('metaGastos.fixedExpensesDesc')}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input 
                    placeholder={t('metaGastos.descriptionPlaceholder')}
                    value={formDespesa.descricao}
                    onChange={(e) => setFormDespesa(prev => ({ ...prev, descricao: e.target.value }))}
                  />
                  <div className="flex gap-1 items-center">
                    <Input 
                      type="number"
                      placeholder={t('metaGastos.value')}
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
                            <TableHead>{t('metaGastos.description')}</TableHead>
                            <TableHead className="text-right">{t('metaGastos.value')}</TableHead>
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
                  <CardTitle>{t('metaGastos.revenueStreams')}</CardTitle>
                  <p className="text-sm text-muted-foreground">{t('metaGastos.revenueDesc')}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input 
                    placeholder={t('metaGastos.revenueDescPlaceholder')}
                    value={formFaturamento.descricao}
                    onChange={(e) => setFormFaturamento(prev => ({ ...prev, descricao: e.target.value }))}
                  />
                  <div className="flex gap-1 items-center">
                    <Input 
                      type="number"
                      placeholder={t('metaGastos.value')}
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
                            <TableHead>{t('metaGastos.description')}</TableHead>
                            <TableHead className="text-right">{t('metaGastos.value')}</TableHead>
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
                      <CardTitle className="text-base">{t('metaGastos.totalRevenue')}</CardTitle>
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
                          <div className="text-xs text-muted-foreground">{t('metaGastos.adjustment')}</div>
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
                      <CardTitle className="text-base">{t('metaGastos.totalExpenses')}</CardTitle>
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
                          <div className="text-xs text-muted-foreground">{t('metaGastos.adjustment')}</div>
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
                      <CardTitle className="text-base">{t('metaGastos.marginGoal')}</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {t('metaGastos.contributionMargin')}
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
                          <div className="text-xs text-muted-foreground">{t('metaGastos.goal')}</div>
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
                    <CardTitle>{t('metaGastos.financialIndicators')}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {t('metaGastos.financialIndicatorsDesc')}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      
                      {/* Ponto de Equilíbrio */}
                      <div className="space-y-2 p-4 border rounded-lg">
                        <div className="text-sm font-medium text-muted-foreground">
                          {t('metaGastos.breakEvenPoint')}
                        </div>
                        <div className="text-2xl font-bold">
                          {formatCurrency(calcularTotais.pontoEquilibrio)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {t('metaGastos.breakEvenDesc')}
                        </p>
                      </div>

                      {/* Margem de Lucro Operacional */}
                      <div className="space-y-2 p-4 border rounded-lg">
                        <div className="text-sm font-medium text-muted-foreground">
                          {t('metaGastos.profitMargin')}
                        </div>
                        <div className="text-2xl font-bold">
                          {calcularTotais.margemLucroOperacional.toFixed(2)}%
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {t('metaGastos.profitOverRevenue')}
                        </p>
                      </div>

                      {/* Custos Variáveis Máximo */}
                      <div className="space-y-2 p-4 border rounded-lg">
                        <div className="text-sm font-medium text-muted-foreground">
                          {t('metaGastos.maxVariableCosts')}
                        </div>
                        <div className="text-2xl font-bold">
                          {formatCurrency(calcularTotais.custosVariaveisMaximo)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {(calcularTotais.percentualCustosVariaveis * 100).toFixed(1)}% {t('metaGastos.ofRevenue')}
                        </p>
                      </div>

                      {/* Índice de Lucratividade */}
                      <div className="space-y-2 p-4 border rounded-lg">
                        <div className="text-sm font-medium text-muted-foreground">
                          {t('metaGastos.profitabilityIndex')}
                        </div>
                        <div className="text-2xl font-bold">
                          {calcularTotais.indiceLucratividade.toFixed(2)}x
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {t('metaGastos.profitOverFixedExpenses')}
                        </p>
                      </div>
                    </div>

                    {/* Resumo Executivo */}
                    <div className="mt-6 p-4 bg-muted rounded-lg space-y-2">
                      <h4 className="font-semibold">{t('metaGastos.executiveSummary')}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">{t('metaGastos.operatingProfit')}:</span>
                          <span className="ml-2 text-green-600 font-bold">
                            {formatCurrency(calcularTotais.lucroOperacional)}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium">{t('metaGastos.overRevenue')}:</span>
                          <span className="ml-2 font-bold">
                            {calcularTotais.margemLucroOperacional.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Seção 4: Despesas Não Operacionais e Investimentos */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Formulário Despesas Não Operacionais */}
                  <Card>
                    <CardHeader>
                      <CardTitle>{t('metaGastos.nonOperatingExpenses')}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {t('metaGastos.nonOperatingExpensesDesc')}
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex gap-2">
                        <Input 
                          placeholder={t('metaGastos.nonOperatingPlaceholder')}
                          value={formDespesaNaoOp.descricao}
                          onChange={(e) => setFormDespesaNaoOp(prev => ({ ...prev, descricao: e.target.value }))}
                        />
                        <div className="flex gap-1 items-center">
                          <Input 
                            type="number"
                            placeholder={t('metaGastos.value')}
                            value={formDespesaNaoOp.valor}
                            onChange={(e) => setFormDespesaNaoOp(prev => ({ ...prev, valor: e.target.value }))}
                            className="w-32"
                          />
                          <CalculadoraPopover tipo="despesaNaoOp" />
                        </div>
                        <Button onClick={adicionarDespesaNaoOp}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {planejamento.despesasNaoOperacionais.length > 0 && (
                        <div className="border rounded-lg">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>{t('metaGastos.description')}</TableHead>
                                <TableHead className="text-right">{t('metaGastos.value')}</TableHead>
                                <TableHead className="w-12"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {planejamento.despesasNaoOperacionais.map(despesa => (
                                <TableRow key={despesa.id}>
                                  <TableCell>{despesa.descricao}</TableCell>
                                  <TableCell className="text-right font-medium">
                                    {formatCurrency(despesa.valor)}
                                  </TableCell>
                                  <TableCell>
                                    <Button 
                                      variant="ghost" 
                                      size="icon"
                                      onClick={() => removerDespesaNaoOp(despesa.id)}
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

                  {/* Formulário Investimentos */}
                  <Card>
                    <CardHeader>
                      <CardTitle>{t('metaGastos.investments')}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {t('metaGastos.investmentsDesc')}
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex gap-2">
                        <Input 
                          placeholder={t('metaGastos.investmentPlaceholder')}
                          value={formInvestimento.descricao}
                          onChange={(e) => setFormInvestimento(prev => ({ ...prev, descricao: e.target.value }))}
                        />
                        <div className="flex gap-1 items-center">
                          <Input 
                            type="number"
                            placeholder={t('metaGastos.value')}
                            value={formInvestimento.valor}
                            onChange={(e) => setFormInvestimento(prev => ({ ...prev, valor: e.target.value }))}
                            className="w-32"
                          />
                          <CalculadoraPopover tipo="investimento" />
                        </div>
                        <Button onClick={adicionarInvestimento}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {planejamento.investimentos.length > 0 && (
                        <div className="border rounded-lg">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>{t('metaGastos.description')}</TableHead>
                                <TableHead className="text-right">{t('metaGastos.value')}</TableHead>
                                <TableHead className="w-12"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {planejamento.investimentos.map(inv => (
                                <TableRow key={inv.id}>
                                  <TableCell>{inv.descricao}</TableCell>
                                  <TableCell className="text-right font-medium">
                                    {formatCurrency(inv.valor)}
                                  </TableCell>
                                  <TableCell>
                                    <Button 
                                      variant="ghost" 
                                      size="icon"
                                      onClick={() => removerInvestimento(inv.id)}
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

                {/* Seção 5: Novos Indicadores (Lucro Líquido) */}
                {(planejamento.despesasNaoOperacionais.length > 0 || planejamento.investimentos.length > 0) && (
                  <Card>
                    <CardHeader>
                      <CardTitle>{t('metaGastos.netProfitIndicators')}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {t('metaGastos.netProfitIndicatorsDesc')}
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        
                        {/* Lucro Antes dos Investimentos */}
                        <div className="space-y-2 p-4 border rounded-lg bg-blue-50 dark:bg-blue-950">
                          <div className="text-sm font-medium text-muted-foreground">
                            {t('metaGastos.profitBeforeInvestments')}
                          </div>
                          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {formatCurrency(calcularTotais.lucroAntesInvestimentos)}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {t('metaGastos.profitBeforeInvestmentsDesc')}
                          </p>
                        </div>

                        {/* Margem de Lucro Líquido */}
                        <div className="space-y-2 p-4 border rounded-lg bg-green-50 dark:bg-green-950">
                          <div className="text-sm font-medium text-muted-foreground">
                            {t('metaGastos.netProfitMargin')}
                          </div>
                          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                            {calcularTotais.margemLucroLiquido.toFixed(2)}%
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {t('metaGastos.netProfitOverRevenue')}
                          </p>
                        </div>
                      </div>

                      {/* Resumo Executivo do Lucro Líquido */}
                      <div className="mt-6 p-4 bg-muted rounded-lg space-y-2">
                        <h4 className="font-semibold">{t('metaGastos.netProfitSummary')}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="font-medium">{t('metaGastos.operatingProfit')}:</span>
                            <span className="ml-2 text-blue-600 dark:text-blue-400 font-bold">
                              {formatCurrency(calcularTotais.lucroOperacional)}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium">{t('metaGastos.minusNonOpInvest')}:</span>
                            <span className="ml-2 text-red-600 dark:text-red-400 font-bold">
                              {formatCurrency(calcularTotais.totalDespesasNaoOp + calcularTotais.totalInvestimentos)}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium">(=) {t('metaGastos.netProfit')}:</span>
                            <span className="ml-2 text-green-600 dark:text-green-400 font-bold">
                              {formatCurrency(calcularTotais.lucroLiquido)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
