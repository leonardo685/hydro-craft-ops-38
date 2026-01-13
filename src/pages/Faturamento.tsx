import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Receipt, DollarSign, Calendar, FileText, Download, Eye, Filter, ChevronUp, ChevronDown, QrCode, Search } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { getOrcamentosEmFaturamento, getOrcamentosFinalizados, emitirNotaFiscal, type Orcamento } from "@/lib/orcamento-utils";
import { OrdensAguardandoRetorno } from "@/components/OrdensAguardandoRetorno";
import { supabase } from "@/integrations/supabase/client";
import EmitirNotaModal from "@/components/EmitirNotaModal";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EquipmentLabel } from "@/components/EquipmentLabel";
import { useLanguage } from "@/contexts/LanguageContext";
import { useEmpresa } from "@/contexts/EmpresaContext";

interface NotaFaturada {
  id: string;
  numero_ordem: string;
  cliente_nome: string;
  equipamento: string;
  data_entrada: string;
  pdf_nota_fiscal?: string;
  pdf_nota_retorno?: string;
  tipo: 'nota_fiscal' | 'nota_retorno' | 'orcamento_com_entrada' | 'orcamento_simples';
}

export default function Faturamento() {
  const { t } = useLanguage();
  const { empresaAtual } = useEmpresa();
  const [orcamentosEmFaturamento, setOrcamentosEmFaturamento] = useState<any[]>([]);
  const [orcamentosFinalizados, setOrcamentosFinalizados] = useState<Orcamento[]>([]);
  const [notasFaturadas, setNotasFaturadas] = useState<NotaFaturada[]>([]);
  const [ordensRetorno, setOrdensRetorno] = useState<any[]>([]);
  const [isEmitirNotaModalOpen, setIsEmitirNotaModalOpen] = useState(false);
  const [selectedOrcamento, setSelectedOrcamento] = useState<any>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<any>(null);
  
  // Estados para controle de expansão das seções
  const [expandedSections, setExpandedSections] = useState({
    ordensRetorno: true,
    orcamentosEmFaturamento: true,
  });
  
  // Estados para filtros da aba Faturadas
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [clienteFiltro, setClienteFiltro] = useState("");
  const [numeroFiltro, setNumeroFiltro] = useState("");

  // Estados para filtros da aba Faturamento
  const [dataInicioFat, setDataInicioFat] = useState("");
  const [dataFimFat, setDataFimFat] = useState("");
  const [clienteFiltroFat, setClienteFiltroFat] = useState("");
  const [numeroFiltroFat, setNumeroFiltroFat] = useState("");

  useEffect(() => {
    if (empresaAtual?.id) {
      loadData();
    }
  }, [empresaAtual?.id]);

  const loadData = async () => {
    if (!empresaAtual?.id) return;
    
    // Carregar ordens aguardando retorno, reprovadas E sem retorno (todas precisam de faturamento)
    const { data: ordensData, error: ordensError } = await supabase
      .from('ordens_servico')
      .select(`
        *,
        recebimentos!left(nota_fiscal, numero_ordem),
        orcamentos!orcamento_id(numero)
      `)
      .eq('empresa_id', empresaAtual.id)
      .in('status', ['aguardando_retorno', 'reprovada', 'aguardando_faturamento_sem_retorno'])
      .order('updated_at', { ascending: false });

    if (ordensError) {
      console.error('Erro ao carregar ordens:', ordensError);
    } else {
      const ordensFormatadas = ordensData?.map(ordem => {
        const recebimento = Array.isArray(ordem.recebimentos) 
          ? ordem.recebimentos[0] 
          : ordem.recebimentos;
        
        const orcamento = Array.isArray(ordem.orcamentos)
          ? ordem.orcamentos[0]
          : ordem.orcamentos;

        return {
          ...ordem,
          numero_ordem: recebimento?.numero_ordem || ordem.numero_ordem,
          nota_fiscal: recebimento?.nota_fiscal,
          orcamento_vinculado: orcamento?.numero
        };
      }) || [];
      
      setOrdensRetorno(ordensFormatadas);
    }

    // Carregar orçamentos aprovados para a seção "Aguardando Faturamento"
    const { data: orcamentosAprovados, error: orcamentosError } = await supabase
      .from('orcamentos')
      .select('*')
      .eq('empresa_id', empresaAtual.id)
      .eq('status', 'aprovado')
      .order('updated_at', { ascending: false });

    if (orcamentosError) {
      console.error('Erro ao carregar orçamentos aprovados:', orcamentosError);
      setOrcamentosEmFaturamento([]);
    } else if (orcamentosAprovados) {
      // Buscar todas as OS vinculadas a cada orçamento
      const orcamentosComOS = await Promise.all(
        orcamentosAprovados.map(async (orc) => {
          // Buscar todas as OS que têm esse orcamento_id
          const { data: osVinculadas } = await supabase
            .from('ordens_servico')
            .select('id, numero_ordem, recebimento_id, recebimentos(numero_ordem, nota_fiscal)')
            .eq('orcamento_id', orc.id);
          
          const ordensVinculadas = osVinculadas?.map(os => ({
            id: os.id,
            numero_ordem: os.recebimentos?.numero_ordem || os.numero_ordem,
            nota_fiscal: os.recebimentos?.nota_fiscal
          })) || [];
          
          return {
            ...orc,
            ordens_vinculadas: ordensVinculadas
          };
        })
      );
      
      setOrcamentosEmFaturamento(orcamentosComOS);
    }

    loadNotasFaturadas();
  };

  const loadNotasFaturadas = async () => {
    if (!empresaAtual?.id) return;
    
    try {
      // Buscar ordens de serviço com status 'faturado' (notas de retorno)
      const { data: ordensData, error: ordensError } = await supabase
        .from('ordens_servico')
        .select(`
          id,
          cliente_nome,
          equipamento,
          data_entrada,
          pdf_nota_fiscal,
          recebimentos(numero_ordem, pdf_nota_retorno)
        `)
        .eq('empresa_id', empresaAtual.id)
        .eq('status', 'faturado')
        .order('updated_at', { ascending: false });

      if (ordensError) {
        console.error('Erro ao carregar ordens faturadas:', ordensError);
      }

      // Buscar orçamentos faturados (status 'finalizado')
      const { data: orcamentosData, error: orcamentosError } = await supabase
        .from('orcamentos')
        .select('*')
        .eq('empresa_id', empresaAtual.id)
        .eq('status', 'finalizado')
        .order('updated_at', { ascending: false });

      if (orcamentosError) {
        console.error('Erro ao carregar orçamentos faturados:', orcamentosError);
      }

      const notasRetorno: NotaFaturada[] = [];
      const notasFaturamento: NotaFaturada[] = [];
      
      // Processar ordens de serviço para notas de retorno (vão para "Notas Fiscais Emitidas")
      ordensData?.forEach(ordem => {
        const recebimento = Array.isArray(ordem.recebimentos) ? ordem.recebimentos[0] : ordem.recebimentos;
        notasRetorno.push({
          id: ordem.id,
          numero_ordem: recebimento?.numero_ordem || 'N/A',
          cliente_nome: ordem.cliente_nome,
          equipamento: ordem.equipamento,
          data_entrada: ordem.data_entrada,
          pdf_nota_fiscal: ordem.pdf_nota_fiscal,
          pdf_nota_retorno: recebimento?.pdf_nota_retorno,
          tipo: 'nota_retorno'
        });
      });

      // Processar orçamentos faturados para notas de faturamento (vão para "Notas Faturadas")
      orcamentosData?.forEach(orcamento => {
        notasFaturamento.push({
          ...orcamento,
          numero_ordem: orcamento.numero,
          data_entrada: orcamento.data_criacao,
          equipamento: orcamento.equipamento,
          cliente_nome: orcamento.cliente_nome,
          tipo: orcamento.ordem_servico_id ? 'orcamento_com_entrada' : 'orcamento_simples'
        });
      });

      // Combinar todas as notas para manter compatibilidade
      setNotasFaturadas([...notasRetorno, ...notasFaturamento]);
    } catch (error) {
      console.error('Erro ao carregar notas faturadas:', error);
    }
  };

  const handleEmitirNF = (orcamento: any) => {
    setSelectedOrcamento(orcamento);
    setIsEmitirNotaModalOpen(true);
  };

  const handleConfirmarEmissao = () => {
    loadData(); // Recarregar dados
    setSelectedOrcamento(null);
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleDownloadPdf = async (url: string, filename: string) => {
    try {
      const response = await fetch(
        `https://fmbfkufkxvyncadunlhh.supabase.co/functions/v1/download-file`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fileUrl: url,
            fileName: filename
          })
        }
      );
      
      if (!response.ok) {
        throw new Error('Erro ao baixar arquivo');
      }
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
      
      toast({
        title: t('faturamento.downloadStarted'),
        description: t('faturamento.pdfDownloading'),
      });
    } catch (error) {
      console.error('Erro ao baixar PDF:', error);
      toast({
        title: t('messages.error'),
        description: t('faturamento.downloadError'),
        variant: "destructive",
      });
    }
  };

  // Calcular contagens corretas
  const totalNotasServico = notasFaturadas.filter(n => n.tipo === 'nota_retorno').length;
  const totalNotasVenda = notasFaturadas.filter(n => n.tipo.includes('orcamento')).length;
  const numeroNotasRetorno = ordensRetorno.length;
  const totalNotasFiscais = totalNotasServico + totalNotasVenda;

  // Verificar se há algum filtro aplicado
  const temFiltrosAtivos = dataInicio || dataFim || clienteFiltro || numeroFiltro;
  const temFiltrosAtivosFat = dataInicioFat || dataFimFat || clienteFiltroFat || numeroFiltroFat;

  // Filtrar notas faturadas
  const notasFiltradas = notasFaturadas.filter(nota => {
    // Se não há filtros, retorna todas
    if (!temFiltrosAtivos) return true;
    
    let passa = true;
    
    // Filtro de data
    if (dataInicio) {
      const dataNotaStr = nota.tipo === 'nota_retorno' ? nota.data_entrada : nota.data_entrada;
      const dataNota = new Date(dataNotaStr);
      const dataInicioDate = new Date(dataInicio);
      passa = passa && dataNota >= dataInicioDate;
    }
    
    if (dataFim) {
      const dataNotaStr = nota.tipo === 'nota_retorno' ? nota.data_entrada : nota.data_entrada;
      const dataNota = new Date(dataNotaStr);
      const dataFimDate = new Date(dataFim);
      passa = passa && dataNota <= dataFimDate;
    }
    
    // Filtro de cliente
    if (clienteFiltro) {
      passa = passa && nota.cliente_nome.toLowerCase().includes(clienteFiltro.toLowerCase());
    }
    
    // Filtro de número de pedido
    if (numeroFiltro) {
      const nota_any = nota as any;
      const numeroMatch = nota.numero_ordem?.toLowerCase().includes(numeroFiltro.toLowerCase()) ||
                          nota_any.ordem_referencia?.toLowerCase().includes(numeroFiltro.toLowerCase()) ||
                          nota_any.descricao?.toLowerCase().includes(numeroFiltro.toLowerCase());
      if (!numeroMatch) passa = false;
    }
    
    return passa;
  });

  // Filtrar ordens de retorno
  const ordensRetornoFiltradas = ordensRetorno.filter(ordem => {
    if (!temFiltrosAtivosFat) return true;
    
    let passa = true;
    
    if (dataInicioFat) {
      const dataOrdem = new Date(ordem.updated_at);
      const dataInicioDate = new Date(dataInicioFat);
      passa = passa && dataOrdem >= dataInicioDate;
    }
    
    if (dataFimFat) {
      const dataOrdem = new Date(ordem.updated_at);
      const dataFimDate = new Date(dataFimFat);
      passa = passa && dataOrdem <= dataFimDate;
    }
    
    if (clienteFiltroFat) {
      passa = passa && ordem.cliente_nome.toLowerCase().includes(clienteFiltroFat.toLowerCase());
    }
    
    // Filtro de número de pedido
    if (numeroFiltroFat) {
      const ordem_any = ordem as any;
      const numeroMatch = ordem.numero_ordem?.toLowerCase().includes(numeroFiltroFat.toLowerCase()) ||
                          ordem_any.descricao?.toLowerCase().includes(numeroFiltroFat.toLowerCase());
      if (!numeroMatch) passa = false;
    }
    
    return passa;
  });

  // Filtrar orçamentos em faturamento
  const orcamentosEmFaturamentoFiltrados = orcamentosEmFaturamento.filter(orcamento => {
    if (!temFiltrosAtivosFat) return true;
    
    let passa = true;
    
    if (dataInicioFat) {
      const dataOrcamento = new Date(orcamento.data_aprovacao || orcamento.updated_at);
      const dataInicioDate = new Date(dataInicioFat);
      passa = passa && dataOrcamento >= dataInicioDate;
    }
    
    if (dataFimFat) {
      const dataOrcamento = new Date(orcamento.data_aprovacao || orcamento.updated_at);
      const dataFimDate = new Date(dataFimFat);
      passa = passa && dataOrcamento <= dataFimDate;
    }
    
    if (clienteFiltroFat) {
      passa = passa && orcamento.cliente_nome.toLowerCase().includes(clienteFiltroFat.toLowerCase());
    }
    
    // Filtro de número de pedido
    if (numeroFiltroFat) {
      const numeroMatch = orcamento.numero?.toLowerCase().includes(numeroFiltroFat.toLowerCase()) ||
                          orcamento.ordem_numero?.toLowerCase().includes(numeroFiltroFat.toLowerCase()) ||
                          orcamento.ordem_referencia?.toLowerCase().includes(numeroFiltroFat.toLowerCase()) ||
                          orcamento.descricao?.toLowerCase().includes(numeroFiltroFat.toLowerCase());
      if (!numeroMatch) passa = false;
    }
    
    return passa;
  });
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case "faturamento":
        return "bg-warning-light text-warning border-warning/20";
      case "finalizado":
        return "bg-accent-light text-accent border-accent/20";
      case "pago":
        return "bg-accent-light text-accent border-accent/20";
      case "pendente":
        return "bg-warning-light text-warning border-warning/20";
      case "vencido":
        return "bg-destructive/10 text-destructive border-destructive/20";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "faturamento":
        return t('faturamento.awaitingInvoice');
      case "finalizado":
        return t('faturamento.invoiceIssued');
      case "pago":
        return t('faturamento.paid');
      case "pendente":
        return t('faturamento.pending');
      case "vencido":
        return t('faturamento.overdue');
      default:
        return status;
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">{t('faturamento.title')}</h2>
            <p className="text-muted-foreground">
              {t('faturamento.subtitle')}
            </p>
          </div>
        </div>

        {/* Resumo Financeiro */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="shadow-soft">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="bg-primary-light p-2 rounded-lg">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('faturamento.totalServiceNotes')}</p>
                  <p className="text-lg font-semibold text-primary">
                    {totalNotasServico}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="bg-accent-light p-2 rounded-lg">
                  <Receipt className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('faturamento.totalSalesNotes')}</p>
                  <p className="text-lg font-semibold text-accent">
                    {totalNotasVenda}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="bg-warning-light p-2 rounded-lg">
                  <Calendar className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('faturamento.returnNotesCount')}</p>
                  <p className="text-lg font-semibold text-warning">
                    {numeroNotasRetorno}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="bg-secondary p-2 rounded-lg">
                  <FileText className="h-5 w-5 text-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('faturamento.invoices')}</p>
                  <p className="text-lg font-semibold">{totalNotasFiscais}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="faturamento" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="faturamento">
              Faturamento ({ordensRetorno.length + orcamentosEmFaturamento.length})
            </TabsTrigger>
            <TabsTrigger value="faturadas">
              Faturadas ({notasFaturadas.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="faturamento" className="space-y-6 mt-6">
            {/* Sub-abas para separar Ordens e Orçamentos */}
            <Tabs defaultValue="ordens-retorno" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="ordens-retorno">
                  Ordens Aguardando Retorno ({ordensRetornoFiltradas.length})
                </TabsTrigger>
                <TabsTrigger value="orcamentos-faturamento">
                  Orçamentos Aguardando Faturamento ({orcamentosEmFaturamentoFiltrados.length})
                </TabsTrigger>
              </TabsList>

              {/* Filtros (compartilhados) */}
              <Card className="shadow-soft mt-4">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Filter className="h-5 w-5" />
                    Filtros
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div>
                      <label className="text-sm text-muted-foreground mb-2 block">Número</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="text"
                          placeholder="Buscar por número..."
                          value={numeroFiltroFat}
                          onChange={(e) => setNumeroFiltroFat(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground mb-2 block">Data Início</label>
                      <Input
                        type="date"
                        value={dataInicioFat}
                        onChange={(e) => setDataInicioFat(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground mb-2 block">Data Fim</label>
                      <Input
                        type="date"
                        value={dataFimFat}
                        onChange={(e) => setDataFimFat(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground mb-2 block">Cliente</label>
                      <Input
                        type="text"
                        placeholder="Buscar por cliente"
                        value={clienteFiltroFat}
                        onChange={(e) => setClienteFiltroFat(e.target.value)}
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setNumeroFiltroFat("");
                          setDataInicioFat("");
                          setDataFimFat("");
                          setClienteFiltroFat("");
                        }}
                        className="w-full"
                      >
                        Limpar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Aba Ordens Aguardando Retorno */}
              <TabsContent value="ordens-retorno" className="mt-4">
                {ordensRetornoFiltradas.length > 0 ? (
                  <OrdensAguardandoRetorno ordensExternas={ordensRetornoFiltradas} />
                ) : (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                      <h3 className="text-lg font-medium text-foreground mb-2">
                        Nenhuma ordem encontrada
                      </h3>
                      <p className="text-muted-foreground">
                        {temFiltrosAtivosFat ? 'Ajuste os filtros para encontrar ordens' : 'Nenhuma ordem aguardando retorno'}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Aba Orçamentos Aguardando Faturamento */}
              <TabsContent value="orcamentos-faturamento" className="mt-4 space-y-4">
                {orcamentosEmFaturamentoFiltrados.length > 0 ? (
                  orcamentosEmFaturamentoFiltrados.map((item) => (
                    <Card key={item.id} className="shadow-soft hover:shadow-medium transition-smooth">
                      <CardHeader className="pb-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <CardTitle className="text-lg flex items-center gap-2">
                                <Receipt className="h-5 w-5 text-primary" />
                                {item.numero}
                              </CardTitle>
                              {item.ordens_vinculadas?.map((ordem: any) => (
                                <div key={ordem.id} className="flex gap-1">
                                  <Badge variant="secondary" className="text-xs">
                                    OS: {ordem.numero_ordem}
                                  </Badge>
                                  {ordem.nota_fiscal && (
                                    <Badge variant="outline" className="text-xs">
                                      Pedido: {ordem.nota_fiscal}
                                    </Badge>
                                  )}
                                </div>
                              ))}
                            </div>
                            <CardDescription className="mt-1">
                              {item.equipamento} - {item.cliente_nome}
                            </CardDescription>
                          </div>
                          <Badge className={getStatusColor(item.status)}>
                            {getStatusText(item.status)}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4 p-4 bg-gradient-secondary rounded-lg">
                          <div>
                            <p className="text-sm text-muted-foreground">Valor do Orçamento</p>
                            <p className="text-xl font-bold text-primary">
                              R$ {item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Data de Aprovação</p>
                            <p className="text-lg font-semibold">
                              {item.data_aprovacao ? new Date(item.data_aprovacao).toLocaleDateString('pt-BR') : '-'}
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                          <Button 
                            size="sm" 
                            className="bg-gradient-primary"
                            onClick={() => handleEmitirNF(item)}
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            Emitir Nota Fiscal
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                      <h3 className="text-lg font-medium text-foreground mb-2">
                        Nenhum orçamento encontrado
                      </h3>
                      <p className="text-muted-foreground">
                        {temFiltrosAtivosFat ? 'Ajuste os filtros para encontrar orçamentos' : 'Nenhum orçamento aguardando faturamento'}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="faturadas" className="space-y-6 mt-6">
            {/* Sub-abas para separar Notas de Retorno e Faturamento */}
            <Tabs defaultValue="notas-retorno" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="notas-retorno">
                  Notas de Retorno ({notasFiltradas.filter(n => n.tipo === 'nota_retorno').length})
                </TabsTrigger>
                <TabsTrigger value="notas-faturamento">
                  Notas de Faturamento ({notasFiltradas.filter(n => n.tipo !== 'nota_retorno').length})
                </TabsTrigger>
              </TabsList>

              {/* Filtros (compartilhados) */}
              <Card className="shadow-soft mt-4">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Filter className="h-5 w-5" />
                    Filtros
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div>
                      <label className="text-sm text-muted-foreground mb-2 block">Número</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="text"
                          placeholder="Buscar por número..."
                          value={numeroFiltro}
                          onChange={(e) => setNumeroFiltro(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground mb-2 block">Data Início</label>
                      <Input
                        type="date"
                        value={dataInicio}
                        onChange={(e) => setDataInicio(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground mb-2 block">Data Fim</label>
                      <Input
                        type="date"
                        value={dataFim}
                        onChange={(e) => setDataFim(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground mb-2 block">Cliente</label>
                      <Input
                        type="text"
                        placeholder="Buscar por cliente"
                        value={clienteFiltro}
                        onChange={(e) => setClienteFiltro(e.target.value)}
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setNumeroFiltro("");
                          setDataInicio("");
                          setDataFim("");
                          setClienteFiltro("");
                        }}
                        className="w-full"
                      >
                        Limpar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Aba Notas de Retorno */}
              <TabsContent value="notas-retorno" className="mt-4 space-y-4">
                {notasFiltradas.filter(n => n.tipo === 'nota_retorno').length > 0 ? (
                  notasFiltradas.filter(n => n.tipo === 'nota_retorno').map((nota) => (
                    <Card key={`${nota.id}-${nota.tipo}`} className="shadow-soft hover:shadow-medium transition-smooth">
                      <CardHeader className="pb-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                              <FileText className="h-5 w-5 text-primary" />
                              Nota de Retorno - {nota.numero_ordem}
                            </CardTitle>
                            <CardDescription className="mt-1">
                              {nota.equipamento} - {nota.cliente_nome}
                            </CardDescription>
                          </div>
                          <Badge className="bg-green-100 text-green-700 border-green-200">
                            Faturado
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4 p-4 bg-gradient-secondary rounded-lg">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm text-muted-foreground">Data de Entrada</p>
                              <p className="font-medium">
                                {new Date(nota.data_entrada).toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm text-muted-foreground">Tipo</p>
                              <p className="font-medium">Nota de Retorno</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedEquipment({
                                numeroOrdem: nota.numero_ordem,
                                cliente: nota.cliente_nome,
                                dataEntrada: new Date(nota.data_entrada).toLocaleDateString('pt-BR')
                              });
                            }}
                          >
                            <QrCode className="h-4 w-4 mr-1" />
                            QR Code
                          </Button>
                          {nota.pdf_nota_retorno && (
                            <>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleDownloadPdf(nota.pdf_nota_retorno!, `${nota.numero_ordem}.pdf`)}
                              >
                                <Download className="h-4 w-4 mr-1" />
                                Download PDF
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => window.open(nota.pdf_nota_retorno, '_blank')}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Visualizar PDF
                              </Button>
                            </>
                          )}
                          {!nota.pdf_nota_retorno && (
                            <Badge variant="outline" className="text-muted-foreground">
                              PDF não disponível
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                      <h3 className="text-lg font-medium text-foreground mb-2">
                        Nenhuma nota de retorno encontrada
                      </h3>
                      <p className="text-muted-foreground">
                        {temFiltrosAtivos ? 'Ajuste os filtros para encontrar notas' : 'Nenhuma nota de retorno faturada ainda'}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Aba Notas de Faturamento */}
              <TabsContent value="notas-faturamento" className="mt-4 space-y-4">
                {notasFiltradas.filter(n => n.tipo !== 'nota_retorno').length > 0 ? (
                  notasFiltradas.filter(n => n.tipo !== 'nota_retorno').map((nota) => (
                    <Card key={`${nota.id}-${nota.tipo}`} className="shadow-soft hover:shadow-medium transition-smooth">
                      <CardHeader className="pb-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                              <FileText className="h-5 w-5 text-primary" />
                              {nota.tipo === 'orcamento_com_entrada' ? 'Nota de Faturamento - OS' : 'Nota de Faturamento'} - {nota.numero_ordem}
                            </CardTitle>
                            <CardDescription className="mt-1">
                              {nota.equipamento} - {nota.cliente_nome}
                            </CardDescription>
                          </div>
                          <Badge className="bg-green-100 text-green-700 border-green-200">
                            Faturado
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4 p-4 bg-gradient-secondary rounded-lg">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm text-muted-foreground">Data de Entrada</p>
                              <p className="font-medium">
                                {new Date(nota.data_entrada).toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm text-muted-foreground">Tipo</p>
                              <p className="font-medium">
                                {nota.tipo === 'orcamento_com_entrada' ? 'Nota de Faturamento - OS' : 'Nota de Faturamento'}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedEquipment({
                                numeroOrdem: nota.numero_ordem,
                                cliente: nota.cliente_nome,
                                dataEntrada: new Date(nota.data_entrada).toLocaleDateString('pt-BR')
                              });
                            }}
                          >
                            <QrCode className="h-4 w-4 mr-1" />
                            QR Code
                          </Button>
                          {nota.pdf_nota_fiscal && (
                            <>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleDownloadPdf(nota.pdf_nota_fiscal!, `${nota.numero_ordem}.pdf`)}
                              >
                                <Download className="h-4 w-4 mr-1" />
                                Download PDF
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => window.open(nota.pdf_nota_fiscal, '_blank')}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Visualizar PDF
                              </Button>
                            </>
                          )}
                          {!nota.pdf_nota_fiscal && (
                            <Badge variant="outline" className="text-muted-foreground">
                              PDF não disponível
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                      <h3 className="text-lg font-medium text-foreground mb-2">
                        Nenhuma nota de faturamento encontrada
                      </h3>
                      <p className="text-muted-foreground">
                        {temFiltrosAtivos ? 'Ajuste os filtros para encontrar notas' : 'Nenhuma nota de faturamento emitida ainda'}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal para Emitir Nota Fiscal */}
      <EmitirNotaModal
        open={isEmitirNotaModalOpen}
        onOpenChange={setIsEmitirNotaModalOpen}
        orcamento={selectedOrcamento}
        onConfirm={handleConfirmarEmissao}
      />

      {/* Modal de QR Code */}
      {selectedEquipment && (
        <EquipmentLabel 
          equipment={selectedEquipment} 
          onClose={() => setSelectedEquipment(null)} 
        />
      )}
    </AppLayout>
  );
}