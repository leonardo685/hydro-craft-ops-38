import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Receipt, DollarSign, Calendar, FileText, Download, ChevronDown, ChevronUp, Eye, Filter } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { getOrcamentosEmFaturamento, getOrcamentosFinalizados, emitirNotaFiscal, type Orcamento } from "@/lib/orcamento-utils";
import { OrdensAguardandoRetorno } from "@/components/OrdensAguardandoRetorno";
import { supabase } from "@/integrations/supabase/client";
import EmitirNotaModal from "@/components/EmitirNotaModal";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  const [orcamentosEmFaturamento, setOrcamentosEmFaturamento] = useState<any[]>([]);
  const [orcamentosFinalizados, setOrcamentosFinalizados] = useState<Orcamento[]>([]);
  const [notasFaturadas, setNotasFaturadas] = useState<NotaFaturada[]>([]);
  const [ordensRetorno, setOrdensRetorno] = useState<any[]>([]);
  const [isEmitirNotaModalOpen, setIsEmitirNotaModalOpen] = useState(false);
  const [selectedOrcamento, setSelectedOrcamento] = useState<any>(null);
  const [expandedSections, setExpandedSections] = useState({
    ordensRetorno: true,
    orcamentosFaturamento: true,
    notasRetorno: true,
    notasFaturadas: true
  });
  
  // Estados para filtros
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [tipoNota, setTipoNota] = useState<string>("todos");
  const [clienteFiltro, setClienteFiltro] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    // Carregar ordens aguardando retorno
    const { data: ordensData, error: ordensError } = await supabase
      .from('ordens_servico')
      .select('*')
      .eq('status', 'aguardando_retorno')
      .order('updated_at', { ascending: false });

    if (ordensError) {
      console.error('Erro ao carregar ordens:', ordensError);
    } else {
      setOrdensRetorno(ordensData || []);
    }

    // Carregar orçamentos aprovados para a seção "Aguardando Faturamento"
    const { data: orcamentosAprovados, error: orcamentosError } = await supabase
      .from('orcamentos')
      .select('*')
      .eq('status', 'aprovado')
      .order('updated_at', { ascending: false });

    if (orcamentosError) {
      console.error('Erro ao carregar orçamentos aprovados:', orcamentosError);
      setOrcamentosEmFaturamento([]);
    } else if (orcamentosAprovados) {
      // Buscar numero_ordem para cada orçamento que tem ordem_servico_id
      const orcamentosComOS = await Promise.all(
        orcamentosAprovados.map(async (orc) => {
          if (orc.ordem_servico_id) {
            const { data: osData } = await supabase
              .from('ordens_servico')
              .select('numero_ordem')
              .eq('id', orc.ordem_servico_id)
              .single();
            
            return {
              ...orc,
              ordem_numero: osData?.numero_ordem
            };
          }
          return orc;
        })
      );
      
      setOrcamentosEmFaturamento(orcamentosComOS);
    }

    loadNotasFaturadas();
  };

  const loadNotasFaturadas = async () => {
    try {
      // Buscar ordens de serviço com status 'faturado' (notas de retorno)
      const { data: ordensData, error: ordensError } = await supabase
        .from('ordens_servico')
        .select(`
          id,
          numero_ordem,
          cliente_nome,
          equipamento,
          data_entrada,
          pdf_nota_fiscal,
          recebimentos(pdf_nota_retorno)
        `)
        .eq('status', 'faturado')
        .order('updated_at', { ascending: false });

      if (ordensError) {
        console.error('Erro ao carregar ordens faturadas:', ordensError);
      }

      // Buscar orçamentos faturados (status 'finalizado')
      const { data: orcamentosData, error: orcamentosError } = await supabase
        .from('orcamentos')
        .select('*')
        .eq('status', 'finalizado')
        .order('updated_at', { ascending: false });

      if (orcamentosError) {
        console.error('Erro ao carregar orçamentos faturados:', orcamentosError);
      }

      const notasRetorno: NotaFaturada[] = [];
      const notasFaturamento: NotaFaturada[] = [];
      
      // Processar ordens de serviço para notas de retorno (vão para "Notas Fiscais Emitidas")
      ordensData?.forEach(ordem => {
        notasRetorno.push({
          ...ordem,
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

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleDownloadPdf = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
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
        title: "Download iniciado",
        description: "O PDF está sendo baixado",
      });
    } catch (error) {
      console.error('Erro ao baixar PDF:', error);
      toast({
        title: "Erro",
        description: "Erro ao baixar o PDF",
        variant: "destructive",
      });
    }
  };

  // Calcular contagens corretas
  const totalNotasServico = notasFaturadas.filter(n => n.tipo === 'nota_retorno').length;
  const totalNotasVenda = notasFaturadas.filter(n => n.tipo.includes('orcamento')).length;
  const numeroNotasRetorno = ordensRetorno.length;
  const totalNotasFiscais = totalNotasServico + totalNotasVenda;

  // Filtrar notas faturadas
  const notasFiltradas = notasFaturadas.filter(nota => {
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
    
    // Filtro de tipo
    if (tipoNota !== "todos") {
      if (tipoNota === "retorno") {
        passa = passa && nota.tipo === 'nota_retorno';
      } else if (tipoNota === "faturamento") {
        passa = passa && nota.tipo.includes('orcamento');
      }
    }
    
    // Filtro de cliente
    if (clienteFiltro) {
      passa = passa && nota.cliente_nome.toLowerCase().includes(clienteFiltro.toLowerCase());
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
        return "Aguardando NF";
      case "finalizado":
        return "Nota Emitida";
      case "pago":
        return "Pago";
      case "pendente":
        return "Pendente";
      case "vencido":
        return "Vencido";
      default:
        return status;
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Faturamento</h2>
            <p className="text-muted-foreground">
              Controle financeiro e emissão de notas fiscais
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
                  <p className="text-sm text-muted-foreground">Total de Notas de Serviço</p>
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
                  <p className="text-sm text-muted-foreground">Total de Notas de Venda</p>
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
                  <p className="text-sm text-muted-foreground">Número de Notas de Retorno</p>
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
                  <p className="text-sm text-muted-foreground">Notas Fiscais</p>
                  <p className="text-lg font-semibold">{totalNotasFiscais}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                <label className="text-sm text-muted-foreground mb-2 block">Tipo de Nota</label>
                <Select value={tipoNota} onValueChange={setTipoNota}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="retorno">Retorno</SelectItem>
                    <SelectItem value="faturamento">Faturamento</SelectItem>
                  </SelectContent>
                </Select>
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
            </div>
          </CardContent>
        </Card>

        {/* Ordens Aguardando Retorno */}
        <OrdensAguardandoRetorno 
          isExpanded={expandedSections.ordensRetorno}
          onToggleExpand={() => toggleSection('ordensRetorno')}
        />

        {/* Orçamentos em Faturamento */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Orçamentos Aguardando Faturamento</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleSection('orcamentosFaturamento')}
              className="flex items-center gap-2"
            >
              {expandedSections.orcamentosFaturamento ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  Recolher
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  Expandir
                </>
              )}
            </Button>
          </div>

          {expandedSections.orcamentosFaturamento && (
            <div className="space-y-4">
              {orcamentosEmFaturamento.map((item) => (
                <Card key={item.id} className="shadow-soft hover:shadow-medium transition-smooth">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Receipt className="h-5 w-5 text-primary" />
                          {item.numero}
                        </CardTitle>
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
                      {item.ordem_servico_id && (
                        <Badge variant="outline" className="text-xs">
                          Vinculado à OS: {item.ordem_numero || item.ordem_servico_id}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {orcamentosEmFaturamento.length === 0 && (
                <Card>
                  <CardContent className="p-12 text-center">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      Nenhum orçamento aguardando faturamento
                    </h3>
                    <p className="text-muted-foreground">
                      Aprove orçamentos para que apareçam aqui
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>


        {/* Notas Fiscais Emitidas (Retorno) */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Notas Fiscais Emitidas (Retorno)</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleSection('notasRetorno')}
              className="flex items-center gap-2"
            >
              {expandedSections.notasRetorno ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  Recolher
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  Expandir
                </>
              )}
            </Button>
          </div>

          {expandedSections.notasRetorno && (
            <div className="space-y-4">
              {notasFiltradas.filter(nota => nota.tipo === 'nota_retorno').map((nota) => (
                <Card key={`${nota.id}-${nota.tipo}`} className="shadow-soft hover:shadow-medium transition-smooth">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <FileText className="h-5 w-5 text-blue-500" />
                          Nota de Retorno - Ordem {nota.numero_ordem}
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
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-1" />
                        Download PDF
                      </Button>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        Visualizar PDF
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {notasFiltradas.filter(nota => nota.tipo === 'nota_retorno').length === 0 && (
                <Card>
                  <CardContent className="p-12 text-center">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      Nenhuma nota de retorno emitida
                    </h3>
                    <p className="text-muted-foreground">
                      Notas de retorno de ordens de serviço faturadas aparecerão aqui
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>

        {/* Notas Faturadas (Orçamentos) */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Notas Faturadas (Orçamentos)</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleSection('notasFaturadas')}
              className="flex items-center gap-2"
            >
              {expandedSections.notasFaturadas ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  Recolher
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  Expandir
                </>
              )}
            </Button>
          </div>

          {expandedSections.notasFaturadas && (
            <div className="space-y-4">
              {notasFiltradas.filter(nota => nota.tipo.includes('orcamento')).map((nota) => (
                <Card key={`${nota.id}-${nota.tipo}`} className="shadow-soft hover:shadow-medium transition-smooth">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <FileText className="h-5 w-5 text-green-500" />
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
                            {nota.tipo === 'orcamento_com_entrada' ? 'Ver OS associada' : 'N/A'}
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
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-1" />
                        Download PDF
                      </Button>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        Visualizar PDF
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {notasFiltradas.filter(nota => nota.tipo.includes('orcamento')).length === 0 && (
                <Card>
                  <CardContent className="p-12 text-center">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      Nenhuma nota de faturamento
                    </h3>
                    <p className="text-muted-foreground">
                      Notas de faturamento de orçamentos aprovados aparecerão aqui
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal para Emitir Nota Fiscal */}
      <EmitirNotaModal
        open={isEmitirNotaModalOpen}
        onOpenChange={setIsEmitirNotaModalOpen}
        orcamento={selectedOrcamento}
        onConfirm={handleConfirmarEmissao}
      />
    </AppLayout>
  );
}