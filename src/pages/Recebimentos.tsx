import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, QrCode, Search, Filter, CalendarIcon, Play, FileText, ChevronDown, Settings, FileCheck } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { EquipmentLabel } from "@/components/EquipmentLabel";
import { ChaveAcessoModal } from "@/components/ChaveAcessoModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ItensNFeModal } from "@/components/ItensNFeModal";
import { CriarOrdemModal } from "@/components/CriarOrdemModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useRecebimentos } from "@/hooks/use-recebimentos";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

// Removed localStorage function since we're now using Supabase data

export default function Recebimentos() {
  const navigate = useNavigate();
  const { recebimentos, notasFiscais, loading, recarregar } = useRecebimentos();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [selectedEquipment, setSelectedEquipment] = useState<any>(null);
  const [modalChaveAcesso, setModalChaveAcesso] = useState(false);
  const [notaFiscalSelecionada, setNotaFiscalSelecionada] = useState<any>(null);
  const [modalCriarOrdem, setModalCriarOrdem] = useState<any>(null);
  const [avisoNovaNotaFiscal, setAvisoNovaNotaFiscal] = useState(false);
  const [ordensFinalizadas, setOrdensFinalizadas] = useState<any[]>([]);
  
  // Estados para filtros
  const [dataInicio, setDataInicio] = useState<Date>();
  const [dataFim, setDataFim] = useState<Date>();
  const [filtroCliente, setFiltroCliente] = useState("");
  const [filtroNotaEntrada, setFiltroNotaEntrada] = useState("");
  const [filtroNotaFiscal, setFiltroNotaFiscal] = useState("");
  const [aplicandoFiltros, setAplicandoFiltros] = useState(false);
  const [filtrosExpanded, setFiltrosExpanded] = useState(false);

  // Limpar localStorage antigo na inicialização
  useEffect(() => {
    localStorage.removeItem('recebimentos');
    localStorage.removeItem('notasFiscais');
  }, []);

  // Carregar ordens finalizadas (diretas e com recebimento)
  useEffect(() => {
    const loadOrdensFinalizadas = async () => {
      const { data, error } = await supabase
        .from('ordens_servico')
        .select('*, recebimentos!ordens_servico_recebimento_id_fkey(*)')
        .in('status', ['finalizada', 'faturado'])
        .order('updated_at', { ascending: false });
      
      if (error) {
        console.error('Erro ao carregar ordens finalizadas:', error);
      } else {
        setOrdensFinalizadas(data || []);
      }
    };
    
    loadOrdensFinalizadas();
  }, []);
  
  // Filtrar recebimentos em andamento (sem nota de retorno)
  // Quando filtroNotaFiscal está ativo, mostra resultados independente do status
  const recebimentosFiltrados = useMemo(() => {
    return recebimentos.filter(item => {
      // Se está buscando por nota fiscal específica, ignora filtro de status para encontrar a nota
      const buscandoNotaFiscal = filtroNotaFiscal && filtroNotaFiscal.trim().length > 0;
      
      if (!buscandoNotaFiscal) {
        // Apenas equipamentos que ainda estão na empresa E não têm nota de retorno
        if (!item.na_empresa || item.pdf_nota_retorno) return false;
      }
      
      const dataItem = new Date(item.data_entrada);
      
      // Aplicar filtros de data apenas se estiverem definidos
      if (dataInicio && dataItem < dataInicio) return false;
      if (dataFim && dataItem > dataFim) return false;
      
      const nomeCliente = item.clientes?.nome || item.cliente_nome || '';
      const matchCliente = !filtroCliente || nomeCliente.toLowerCase().includes(filtroCliente.toLowerCase());
      const matchNota = !filtroNotaEntrada || item.numero_ordem.includes(filtroNotaEntrada);
      const matchNotaFiscal = !filtroNotaFiscal || (item.nota_fiscal && item.nota_fiscal.toLowerCase().includes(filtroNotaFiscal.toLowerCase()));
      
      return matchCliente && matchNota && matchNotaFiscal;
    });
  }, [recebimentos, dataInicio, dataFim, filtroCliente, filtroNotaEntrada, filtroNotaFiscal]);

  // Combinar recebimentos finalizados com ordens diretas
  const todosFinalizados = useMemo(() => {
    // IDs de recebimentos que já estão vinculados a ordens finalizadas
    const recebimentosIdsFinalizados = new Set(
      ordensFinalizadas
        .filter(ordem => ordem.recebimento_id)
        .map(ordem => ordem.recebimento_id)
    );

    // Recebimentos com nota de retorno
    const recebimentosComNota = recebimentos.filter(item => {
      if (!item.pdf_nota_retorno) return false;
      
      const dataItem = new Date(item.data_entrada);
      if (dataInicio && dataItem < dataInicio) return false;
      if (dataFim && dataItem > dataFim) return false;
      
      const nomeCliente = item.clientes?.nome || item.cliente_nome || '';
      const matchCliente = !filtroCliente || nomeCliente.toLowerCase().includes(filtroCliente.toLowerCase());
      const matchNota = !filtroNotaEntrada || item.numero_ordem.includes(filtroNotaEntrada);
      const matchNotaFiscal = !filtroNotaFiscal || (item.nota_fiscal && item.nota_fiscal.toLowerCase().includes(filtroNotaFiscal.toLowerCase()));
      
      return matchCliente && matchNota && matchNotaFiscal;
    });

    // Recebimentos cujas ordens estão finalizadas (sem nota de retorno ainda)
    const recebimentosOrdemFinalizada = recebimentos.filter(item => {
      // Já tem nota de retorno? Já está no recebimentosComNota
      if (item.pdf_nota_retorno) return false;
      // Não está na lista de finalizados? Pular
      if (!recebimentosIdsFinalizados.has(item.id)) return false;
      
      const dataItem = new Date(item.data_entrada);
      if (dataInicio && dataItem < dataInicio) return false;
      if (dataFim && dataItem > dataFim) return false;
      
      const nomeCliente = item.clientes?.nome || item.cliente_nome || '';
      const matchCliente = !filtroCliente || nomeCliente.toLowerCase().includes(filtroCliente.toLowerCase());
      const matchNota = !filtroNotaEntrada || item.numero_ordem.includes(filtroNotaEntrada);
      const matchNotaFiscal = !filtroNotaFiscal || (item.nota_fiscal && item.nota_fiscal.toLowerCase().includes(filtroNotaFiscal.toLowerCase()));
      
      return matchCliente && matchNota && matchNotaFiscal;
    });
    
    // Ordens diretas finalizadas (SEM recebimento_id - transformadas no mesmo formato)
    const ordensTransformadas = ordensFinalizadas
      .filter(ordem => {
        // Só incluir ordens diretas (sem recebimento_id)
        if (ordem.recebimento_id) return false;
        
        const dataItem = new Date(ordem.data_entrada);
        if (dataInicio && dataItem < dataInicio) return false;
        if (dataFim && dataItem > dataFim) return false;
        
        const matchCliente = !filtroCliente || ordem.cliente_nome.toLowerCase().includes(filtroCliente.toLowerCase());
        const matchNota = !filtroNotaEntrada || ordem.numero_ordem.includes(filtroNotaEntrada);
        
        return matchCliente && matchNota;
      })
      .map(ordem => ({
        ...ordem,
        is_ordem_direta: true,
        clientes: null
      }));
    
    return [...recebimentosComNota, ...recebimentosOrdemFinalizada, ...ordensTransformadas];
  }, [recebimentos, ordensFinalizadas, dataInicio, dataFim, filtroCliente, filtroNotaEntrada, filtroNotaFiscal]);

  // Função para aplicar filtros e recarregar dados
  const handleBuscar = async () => {
    setAplicandoFiltros(true);
    await recarregar();
    setAplicandoFiltros(false);
  };

  // Função para limpar filtros
  const handleLimparFiltros = async () => {
    setDataInicio(undefined);
    setDataFim(undefined);
    setFiltroCliente("");
    setFiltroNotaEntrada("");
    setFiltroNotaFiscal("");
    setAplicandoFiltros(true);
    await recarregar();
    setAplicandoFiltros(false);
  };

  // Agrupar recebimentos por nota fiscal (com filtros aplicados)
  const notasFiscaisAgrupadas = useMemo(() => {
    const grupos = new Map<string, any>();
    
    recebimentos
      .filter(r => r.nota_fiscal && r.nota_fiscal.trim() !== '')
      .filter(r => {
        // Filtro por nota fiscal
        if (filtroNotaFiscal && filtroNotaFiscal.trim().length > 0) {
          if (!r.nota_fiscal.toLowerCase().includes(filtroNotaFiscal.toLowerCase())) {
            return false;
          }
        }
        
        // Filtro por cliente
        if (filtroCliente && filtroCliente.trim().length > 0) {
          const nomeCliente = r.clientes?.nome || r.cliente_nome || '';
          if (!nomeCliente.toLowerCase().includes(filtroCliente.toLowerCase())) {
            return false;
          }
        }
        
        // Filtro por data início
        if (dataInicio) {
          const dataItem = new Date(r.data_entrada);
          if (dataItem < dataInicio) return false;
        }
        
        // Filtro por data fim
        if (dataFim) {
          const dataItem = new Date(r.data_entrada);
          if (dataItem > dataFim) return false;
        }
        
        return true;
      })
      .forEach(recebimento => {
        const numeroNota = recebimento.nota_fiscal;
        
        if (!grupos.has(numeroNota)) {
          grupos.set(numeroNota, {
            numero_nota: numeroNota,
            cliente_nome: recebimento.clientes?.nome || recebimento.cliente_nome || '',
            data_entrada: recebimento.data_entrada,
            recebimentos: [],
            quantidade_itens: 0,
            status: 'Processada'
          });
        }
        
        const grupo = grupos.get(numeroNota);
        grupo.recebimentos.push(recebimento);
        grupo.quantidade_itens = grupo.recebimentos.length;
      });
    
    return Array.from(grupos.values());
  }, [recebimentos, filtroNotaFiscal, filtroCliente, dataInicio, dataFim]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">{t('recebimentos.title')}</h2>
            <p className="text-muted-foreground">
              {t('recebimentos.subtitle')}
            </p>
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={() => setModalChaveAcesso(true)}
              variant="outline"
              className="border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-smooth shadow-medium"
            >
              <FileText className="h-4 w-4 mr-2" />
              {t('recebimentos.newInvoice')}
            </Button>
            <Button 
              onClick={() => navigate("/recebimentos/novo")}
              className="bg-gradient-primary hover:bg-primary-hover transition-smooth shadow-medium"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('recebimentos.new')}
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <Collapsible open={filtrosExpanded} onOpenChange={setFiltrosExpanded}>
          <div className="bg-card rounded-lg shadow-soft border border-border p-4">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full flex items-center justify-between gap-2 mb-4 hover:bg-muted">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">{t('common.filters')}</span>
                </div>
                <ChevronDown className={cn("h-4 w-4 transition-transform", filtrosExpanded && "rotate-180")} />
              </Button>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">{t('common.startDate')}</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dataInicio && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dataInicio ? format(dataInicio, "dd/MM/yyyy") : t('common.selectDate')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dataInicio}
                    onSelect={setDataInicio}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">{t('common.endDate')}</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dataFim && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dataFim ? format(dataFim, "dd/MM/yyyy") : t('common.selectDate')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dataFim}
                    onSelect={setDataFim}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">{t('common.client')}</label>
              <Input
                placeholder="Nome do cliente"
                value={filtroCliente}
                onChange={(e) => setFiltroCliente(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Nº da Ordem</label>
              <Input
                placeholder="Ex: 0065/25"
                value={filtroNotaEntrada}
                onChange={(e) => setFiltroNotaEntrada(e.target.value)}
                className="w-full"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Nota Fiscal</label>
              <Input
                placeholder="Ex: NF-001234"
                value={filtroNotaFiscal}
                onChange={(e) => setFiltroNotaFiscal(e.target.value)}
                className="w-full"
              />
            </div>
          </div>
          
          {/* Botões de ação dos filtros */}
          <div className="flex gap-2 mt-4">
            <Button 
              onClick={handleBuscar}
              disabled={aplicandoFiltros}
              className="bg-gradient-primary hover:bg-primary-hover transition-smooth shadow-medium"
            >
              <Search className="h-4 w-4 mr-2" />
              {aplicandoFiltros ? t('common.loading') : t('common.search')}
            </Button>
            <Button 
              onClick={handleLimparFiltros}
              variant="outline"
              className="border-muted-foreground text-muted-foreground hover:bg-muted hover:text-foreground transition-smooth"
            >
              {t('common.clearFilters')}
            </Button>
          </div>
            </CollapsibleContent>
          </div>
        </Collapsible>

        <Tabs defaultValue="ordens" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="ordens">{t('recebimentos.orders')}</TabsTrigger>
            <TabsTrigger value="finalizadas">{t('recebimentos.finished')}</TabsTrigger>
            <TabsTrigger value="notas-fiscais">{t('recebimentos.invoices')}</TabsTrigger>
          </TabsList>
          
          <TabsContent value="ordens" className="mt-6">
            <div className="bg-card rounded-lg shadow-soft border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[150px]">{t('recebimentos.orderNumber')}</TableHead>
                    <TableHead>{t('common.client')}</TableHead>
                    <TableHead className="w-[150px]">{t('recebimentos.entryDate')}</TableHead>
                    <TableHead className="w-[120px]">{t('common.status')}</TableHead>
                    <TableHead className="w-[140px]">{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recebimentosFiltrados.map((item, index) => {
                    const getStatusBadge = (status: string) => {
                      const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
                        'recebido': { label: 'Recebida', variant: 'secondary' },
                        'em_analise': { label: 'Em Análise', variant: 'default' },
                        'aprovado': { label: 'Aprovada', variant: 'outline' },
                        'aguardando_retorno': { label: 'Aguardando Retorno', variant: 'outline' },
                        'retornado': { label: 'Retornada', variant: 'destructive' }
                      };
                      
                      const statusInfo = statusMap[status] || { label: status, variant: 'secondary' as const };
                      return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
                    };

                    return (
                      <TableRow key={index} className="hover:bg-muted/50">
                        <TableCell className="font-medium">
                          <button
                            onClick={() => navigate(`/recebimentos/${item.id}`)}
                            className="text-primary hover:text-primary-hover underline font-medium"
                          >
                            {item.numero_ordem}
                          </button>
                        </TableCell>
                        <TableCell className="text-red-500 font-medium">
                          {item.clientes?.nome || item.cliente_nome || 'Cliente não encontrado'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(item.data_entrada).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(item.status || 'recebido')}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {!item.temOrdemServico && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => navigate(`/analise/novo/${item.id}`)}
                                className="h-8"
                              >
                                <Play className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedEquipment({
                                numeroOrdem: item.numero_ordem,
                                cliente: item.clientes?.nome || item.cliente_nome || 'Cliente não encontrado',
                                dataEntrada: new Date(item.data_entrada).toLocaleDateString('pt-BR')
                              })}
                              className="h-8"
                            >
                              <QrCode className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
          
          <TabsContent value="finalizadas" className="mt-6">
            <div className="bg-card rounded-lg shadow-soft border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[150px]">Nº da Ordem</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="w-[150px]">Data de Entrada</TableHead>
                    <TableHead className="w-[150px]">Data NF Retorno</TableHead>
                    <TableHead className="w-[140px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                {todosFinalizados.map((item, index) => {
                    return (
                      <TableRow key={index} className="hover:bg-muted/50">
                        <TableCell className="font-medium">
                          <button
                            onClick={() => navigate(`/recebimentos/${item.id}`)}
                            className="text-primary hover:text-primary-hover underline font-medium"
                          >
                            {item.numero_ordem}
                          </button>
                        </TableCell>
                        <TableCell className="text-red-500 font-medium">
                          {item.clientes?.nome || item.cliente_nome || 'Cliente não encontrado'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(item.data_entrada).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          {item.data_nota_retorno ? (
                            <span className="text-muted-foreground">
                              {new Date(item.data_nota_retorno).toLocaleDateString('pt-BR')}
                            </span>
                          ) : (
                            <Badge variant="outline">Pendente</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <Settings className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                onClick={() => setSelectedEquipment({
                                  numeroOrdem: item.numero_ordem,
                                  cliente: item.clientes?.nome || item.cliente_nome || 'Cliente não encontrado',
                                  dataEntrada: new Date(item.data_entrada).toLocaleDateString('pt-BR')
                                })}
                              >
                                <QrCode className="h-4 w-4 mr-2" />
                                QR Code
                              </DropdownMenuItem>
                              
                              {item.pdf_nota_retorno && (
                                <DropdownMenuItem onClick={async () => {
                                  try {
                                    // Extrair o caminho do arquivo da URL
                                    const urlParts = item.pdf_nota_retorno.split('/');
                                    const bucket = urlParts[urlParts.indexOf('object') + 2];
                                    const filePath = urlParts.slice(urlParts.indexOf('object') + 3).join('/');
                                    
                                    // Fazer download do arquivo
                                    const { data, error } = await supabase.storage
                                      .from(bucket)
                                      .download(filePath);
                                    
                                    if (error) throw error;
                                    
                                    // Criar URL temporária e fazer download
                                    const url = URL.createObjectURL(data);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `nota_retorno_${item.numero_ordem}.pdf`;
                                    document.body.appendChild(a);
                                    a.click();
                                    document.body.removeChild(a);
                                    URL.revokeObjectURL(url);
                                  } catch (error) {
                                    console.error('Erro ao baixar nota de retorno:', error);
                                    toast({
                                      title: 'Erro',
                                      description: 'Não foi possível baixar a nota de retorno',
                                      variant: 'destructive'
                                    });
                                  }
                                }}>
                                  <FileText className="h-4 w-4 mr-2" />
                                  NF Retorno
                                </DropdownMenuItem>
                              )}
                              
                              {item.pdf_nota_fiscal && (
                                <DropdownMenuItem onClick={async () => {
                                  try {
                                    // Extrair o caminho do arquivo da URL
                                    const urlParts = item.pdf_nota_fiscal.split('/');
                                    const bucket = urlParts[urlParts.indexOf('object') + 2];
                                    const filePath = urlParts.slice(urlParts.indexOf('object') + 3).join('/');
                                    
                                    // Fazer download do arquivo
                                    const { data, error } = await supabase.storage
                                      .from(bucket)
                                      .download(filePath);
                                    
                                    if (error) throw error;
                                    
                                    // Criar URL temporária e fazer download
                                    const url = URL.createObjectURL(data);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `nota_fiscal_${item.numero_ordem}.pdf`;
                                    document.body.appendChild(a);
                                    a.click();
                                    document.body.removeChild(a);
                                    URL.revokeObjectURL(url);
                                  } catch (error) {
                                    console.error('Erro ao baixar nota fiscal:', error);
                                    toast({
                                      title: 'Erro',
                                      description: 'Não foi possível baixar a nota fiscal',
                                      variant: 'destructive'
                                    });
                                  }
                                }}>
                                  <FileCheck className="h-4 w-4 mr-2" />
                                  NF Faturamento
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
          
          <TabsContent value="notas-fiscais" className="mt-6">
            <div className="bg-card rounded-lg shadow-soft border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[150px]">Nº Nota Fiscal</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="w-[150px]">Data de Entrada</TableHead>
                    <TableHead className="w-[100px]">Itens</TableHead>
                    <TableHead className="w-[140px]">Status</TableHead>
                    <TableHead className="w-[140px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notasFiscaisAgrupadas.map((nota, index) => (
                    <TableRow key={index} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        <span className="text-primary font-medium">
                          {nota.numero_nota}
                        </span>
                      </TableCell>
                      <TableCell className="text-red-500 font-medium">
                        {nota.cliente_nome}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(nota.data_entrada).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20">
                          {nota.quantidade_itens}
                        </span>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          // Calcular status baseado no campo na_empresa dos recebimentos
                          // Um recebimento é "na empresa" se na_empresa=true E não tem pdf_nota_retorno
                          const recebimentosDaNota = recebimentos.filter(r => r.nota_fiscal === nota.numero_nota);
                          const totalRecebimentos = recebimentosDaNota.length;
                          const naEmpresa = recebimentosDaNota.filter(r => r.na_empresa && !r.pdf_nota_retorno).length;
                          const comOrdem = recebimentosDaNota.filter(r => r.temOrdemServico).length;
                          
                          let statusText = 'Processada';
                          let statusColor = 'bg-blue-50 text-blue-700 ring-blue-600/20';

                          // Prioridade 1: Sem ordem de serviço
                          if (comOrdem === 0) {
                            statusText = 'Sem Ordem';
                            statusColor = 'bg-red-50 text-red-700 ring-red-600/20';
                          }
                          // Prioridade 2: Todos retornados
                          else if (naEmpresa === 0) {
                            statusText = 'Retornada';
                            statusColor = 'bg-green-50 text-green-700 ring-green-600/20';
                          }
                          // Prioridade 3: Parcialmente retornados
                          else if (naEmpresa < totalRecebimentos) {
                            statusText = 'Parcialmente Retornada';
                            statusColor = 'bg-amber-50 text-amber-700 ring-amber-600/20';
                          }
                          
                          return (
                            <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${statusColor}`}>
                              {statusText}
                            </span>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setModalCriarOrdem({ tipo: 'agrupada', ...nota })}
                            className="h-8"
                            title="Criar nova ordem"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setNotaFiscalSelecionada({ tipo: 'agrupada', ...nota })}
                            className="h-8"
                            title="Visualizar itens"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>

        {selectedEquipment && (
          <EquipmentLabel
            equipment={selectedEquipment}
            onClose={() => setSelectedEquipment(null)}
          />
        )}

        <AlertDialog open={avisoNovaNotaFiscal} onOpenChange={setAvisoNovaNotaFiscal}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Funcionalidade em Desenvolvimento</AlertDialogTitle>
              <AlertDialogDescription>
                Esta funcionalidade está em desenvolvimento. Por favor, utilize o botão "Novo Recebimento" para cadastrar equipamentos.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setAvisoNovaNotaFiscal(false)}>
                Entendi
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <ChaveAcessoModal
          open={modalChaveAcesso}
          onClose={() => setModalChaveAcesso(false)}
        />

        {modalCriarOrdem && (
          <CriarOrdemModal
            open={!!modalCriarOrdem}
            onClose={() => setModalCriarOrdem(null)}
            notaFiscal={modalCriarOrdem}
          />
        )}

        {/* Modal de Visualização da Nota Fiscal */}
        <Dialog open={!!notaFiscalSelecionada} onOpenChange={() => setNotaFiscalSelecionada(null)}>
          <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {notaFiscalSelecionada?.tipo === 'agrupada' ? 'Itens do Recebimento' : 'Detalhes da Nota Fiscal'}
              </DialogTitle>
              <DialogDescription>
                {notaFiscalSelecionada?.tipo === 'agrupada' 
                  ? 'Equipamentos recebidos nesta nota fiscal'
                  : 'Informações completas da nota fiscal eletrônica'}
              </DialogDescription>
            </DialogHeader>
            
            {notaFiscalSelecionada && notaFiscalSelecionada.tipo === 'agrupada' ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                  <div>
                    <span className="text-sm text-muted-foreground">Nº Nota Fiscal</span>
                    <p className="font-medium">{notaFiscalSelecionada.numero_nota}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Cliente</span>
                    <p className="font-medium">{notaFiscalSelecionada.cliente_nome}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Data de Entrada</span>
                    <p className="font-medium">
                      {new Date(notaFiscalSelecionada.data_entrada).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Quantidade de Itens</span>
                    <p className="font-medium">{notaFiscalSelecionada.quantidade_itens}</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Equipamentos Recebidos</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nº Ordem</TableHead>
                        <TableHead>Tipo de Equipamento</TableHead>
                        <TableHead>Nº Série</TableHead>
                        <TableHead>Data de Entrada</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {notaFiscalSelecionada.recebimentos.map((recebimento: any) => (
                        <TableRow key={recebimento.id}>
                          <TableCell className="font-medium">{recebimento.numero_ordem}</TableCell>
                          <TableCell>{recebimento.tipo_equipamento}</TableCell>
                          <TableCell>{recebimento.numero_serie || '-'}</TableCell>
                          <TableCell>
                            {new Date(recebimento.data_entrada).toLocaleDateString('pt-BR')}
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                              {recebimento.status}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : notaFiscalSelecionada && (
              <div className="space-y-6">
                {/* Informações Gerais */}
                <div className="bg-gradient-secondary p-4 rounded-lg">
                  <h3 className="font-semibold text-lg mb-3">Informações Gerais</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Número da Nota</p>
                      <p className="font-semibold text-primary">NF-{notaFiscalSelecionada.numero}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Série</p>
                      <p className="font-semibold">{notaFiscalSelecionada.serie}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Data de Emissão</p>
                      <p className="font-semibold">
                        {new Date(notaFiscalSelecionada.dataEmissao).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                        {notaFiscalSelecionada.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Informações do Cliente */}
                <div className="bg-card p-4 rounded-lg border">
                  <h3 className="font-semibold text-lg mb-3">Cliente</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Nome/Razão Social</p>
                      <p className="font-semibold text-red-500">{notaFiscalSelecionada.cliente}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">CNPJ</p>
                      <p className="font-mono">{notaFiscalSelecionada.cnpjEmitente || 'Não informado'}</p>
                    </div>
                  </div>
                </div>

                {/* Chave de Acesso */}
                {notaFiscalSelecionada.chaveAcesso && (
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <h3 className="font-semibold text-lg mb-3">Chave de Acesso</h3>
                    <p className="font-mono text-sm break-all bg-background p-2 rounded border">
                      {notaFiscalSelecionada.chaveAcesso}
                    </p>
                  </div>
                )}

                {/* Itens da Nota Fiscal */}
                {notaFiscalSelecionada.itens && notaFiscalSelecionada.itens.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-lg">Itens da Nota Fiscal</h3>
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[120px]">Código</TableHead>
                            <TableHead>Descrição</TableHead>
                            <TableHead className="w-[100px]">NCM</TableHead>
                            <TableHead className="w-[80px]">Qtd</TableHead>
                            <TableHead className="w-[100px]">Valor Unit.</TableHead>
                            <TableHead className="w-[100px]">Valor Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {notaFiscalSelecionada.itens.map((item: any, index: number) => (
                            <TableRow key={index}>
                              <TableCell className="font-mono text-sm">{item.codigo}</TableCell>
                              <TableCell className="max-w-md">
                                <div className="truncate" title={item.descricao}>
                                  {item.descricao}
                                </div>
                              </TableCell>
                              <TableCell className="font-mono text-sm">{item.ncm}</TableCell>
                              <TableCell className="text-right">
                                {item.quantidade?.toFixed(2)} {item.unidade}
                              </TableCell>
                              <TableCell className="text-right">
                                R$ {item.valorUnitario?.toFixed(2)}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                R$ {item.valorTotal?.toFixed(2)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Total da Nota */}
                    <div className="bg-gradient-primary/10 p-4 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">Total Geral da Nota:</span>
                        <span className="text-xl font-bold text-primary">
                          R$ {notaFiscalSelecionada.itens
                            .reduce((total: number, item: any) => total + (item.valorTotal || 0), 0)
                            .toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setNotaFiscalSelecionada(null)}
                    className="flex-1"
                  >
                    Fechar
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
