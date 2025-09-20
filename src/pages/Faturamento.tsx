import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Receipt, DollarSign, Calendar, FileText, Download, ChevronDown, ChevronUp, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { getOrcamentosEmFaturamento, getOrcamentosFinalizados, emitirNotaFiscal, type Orcamento } from "@/lib/orcamento-utils";
import { OrdensAguardandoRetorno } from "@/components/OrdensAguardandoRetorno";
import { supabase } from "@/integrations/supabase/client";

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
  const [orcamentosEmFaturamento, setOrcamentosEmFaturamento] = useState<Orcamento[]>([]);
  const [orcamentosFinalizados, setOrcamentosFinalizados] = useState<Orcamento[]>([]);
  const [notasFaturadas, setNotasFaturadas] = useState<NotaFaturada[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedOrcamento, setSelectedOrcamento] = useState<Orcamento | null>(null);
  const [numeroNF, setNumeroNF] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("");
  const [dataVencimento, setDataVencimento] = useState("");
  const [expandedSections, setExpandedSections] = useState({
    ordensRetorno: true,
    orcamentosFaturamento: true,
    notasFiscais: true,
    notasFaturadas: true
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setOrcamentosEmFaturamento(getOrcamentosEmFaturamento());
    setOrcamentosFinalizados(getOrcamentosFinalizados());
    loadNotasFaturadas();
  };

  const loadNotasFaturadas = async () => {
    try {
      // Buscar ordens de serviço com status 'faturado'
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

      // Buscar orçamentos aprovados
      const { data: orcamentosData, error: orcamentosError } = await supabase
        .from('orcamentos')
        .select('*')
        .eq('status', 'aprovado')
        .order('updated_at', { ascending: false });

      if (orcamentosError) {
        console.error('Erro ao carregar orçamentos aprovados:', orcamentosError);
      }

      const notasFormatadas: NotaFaturada[] = [];
      
      // Adicionar notas das ordens de serviço
      ordensData?.forEach(ordem => {
        // Adicionar nota fiscal se existe PDF
        if (ordem.pdf_nota_fiscal) {
          notasFormatadas.push({
            ...ordem,
            tipo: 'nota_fiscal',
            pdf_nota_retorno: ordem.recebimentos?.pdf_nota_retorno
          });
        }
        
        // Adicionar nota de retorno se existe PDF
        if (ordem.recebimentos?.pdf_nota_retorno) {
          notasFormatadas.push({
            ...ordem,
            tipo: 'nota_retorno',
            pdf_nota_retorno: ordem.recebimentos.pdf_nota_retorno
          });
        }
      });

      // Adicionar orçamentos aprovados para faturamento
      orcamentosData?.forEach(orcamento => {
        // Se o orçamento tem ordem de serviço vinculada, buscar a nota de entrada
        if (orcamento.ordem_servico_id) {
          const ordemRelacionada = ordensData?.find(ordem => ordem.id === orcamento.ordem_servico_id);
          if (ordemRelacionada?.recebimentos?.pdf_nota_retorno) {
            notasFormatadas.push({
              ...orcamento,
              numero_ordem: orcamento.numero,
              data_entrada: orcamento.data_criacao,
              tipo: 'orcamento_com_entrada',
              pdf_nota_retorno: ordemRelacionada.recebimentos.pdf_nota_retorno,
              pdf_nota_fiscal: null
            });
          }
        } else {
          // Orçamento sem ordem de serviço vinculada
          notasFormatadas.push({
            ...orcamento,
            numero_ordem: orcamento.numero,
            data_entrada: orcamento.data_criacao,
            tipo: 'orcamento_simples',
            pdf_nota_retorno: null,
            pdf_nota_fiscal: null
          });
        }
      });

      setNotasFaturadas(notasFormatadas);
    } catch (error) {
      console.error('Erro ao carregar notas faturadas:', error);
    }
  };

  const handleEmitirNF = (orcamento: Orcamento) => {
    setSelectedOrcamento(orcamento);
    setNumeroNF(`NF-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`);
    setFormaPagamento("");
    setDataVencimento("");
    setIsDialogOpen(true);
  };

  const handleConfirmarEmissao = () => {
    if (!selectedOrcamento || !numeroNF || !formaPagamento || !dataVencimento) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    emitirNotaFiscal(selectedOrcamento.id, {
      numeroNF,
      formaPagamento,
      dataVencimento
    });

    loadData(); // Recarregar dados
    setIsDialogOpen(false);
    setSelectedOrcamento(null);
    
    toast({
      title: "Nota Fiscal Emitida",
      description: `Nota fiscal ${numeroNF} emitida com sucesso!`,
    });
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

  // Calcular resumo
  const totalEmFaturamento = orcamentosEmFaturamento.length > 0 ? orcamentosEmFaturamento.reduce((acc, orc) => acc + orc.valor, 0) : 0;
  const totalFaturado = orcamentosFinalizados.length > 0 ? orcamentosFinalizados.reduce((acc, orc) => acc + orc.valor, 0) : 0;
  const quantidadeNFs = orcamentosFinalizados.length;

  const resumoMensal = {
    totalFaturado: totalEmFaturamento + totalFaturado,
    totalPendente: totalEmFaturamento,
    totalRecebido: totalFaturado,
    quantidadeNFs
  };
  
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
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary hover:bg-primary-hover transition-smooth shadow-medium">
                <FileText className="h-4 w-4 mr-2" />
                Emitir Nota Fiscal
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Emitir Nota Fiscal</DialogTitle>
                <DialogDescription>
                  {selectedOrcamento && `Emitir NF para ${selectedOrcamento.numero} - ${selectedOrcamento.cliente}`}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="numeroNF">Número da NF</Label>
                  <Input
                    id="numeroNF"
                    value={numeroNF}
                    onChange={(e) => setNumeroNF(e.target.value)}
                    placeholder="NF-2024-001"
                  />
                </div>
                <div>
                  <Label htmlFor="formaPagamento">Forma de Pagamento</Label>
                  <Select value={formaPagamento} onValueChange={setFormaPagamento}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a forma de pagamento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="boleto">Boleto Bancário</SelectItem>
                      <SelectItem value="pix">PIX</SelectItem>
                      <SelectItem value="cartao">Cartão de Crédito</SelectItem>
                      <SelectItem value="dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="transferencia">Transferência Bancária</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="dataVencimento">Data de Vencimento</Label>
                  <Input
                    id="dataVencimento"
                    type="date"
                    value={dataVencimento}
                    onChange={(e) => setDataVencimento(e.target.value)}
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1">
                    Cancelar
                  </Button>
                  <Button onClick={handleConfirmarEmissao} className="flex-1 bg-gradient-primary">
                    Emitir NF
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
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
                    {Math.floor(orcamentosFinalizados.length * 0.6)}
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
                    {Math.floor(orcamentosFinalizados.length * 0.3)}
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
                    {Math.floor(orcamentosFinalizados.length * 0.1)}
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
                  <p className="text-lg font-semibold">{resumoMensal.quantidadeNFs}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

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
                          {item.equipamento} - {item.cliente}
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
                          {item.dataAprovacao ? new Date(item.dataAprovacao).toLocaleDateString('pt-BR') : '-'}
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
                      {item.vinculadoOrdemServico && (
                        <Badge variant="outline" className="text-xs">
                          Vinculado à OS: {item.ordemServicoId}
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

        {/* Lista de Notas Fiscais */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Notas Fiscais Emitidas</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleSection('notasFiscais')}
              className="flex items-center gap-2"
            >
              {expandedSections.notasFiscais ? (
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

          {expandedSections.notasFiscais && (
            <div className="space-y-4">
              {orcamentosFinalizados.map((item) => (
                <Card key={item.id} className="shadow-soft hover:shadow-medium transition-smooth">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Receipt className="h-5 w-5 text-primary" />
                          {item.numeroNF || item.numero}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {item.equipamento} - {item.cliente}
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
                        <p className="text-sm text-muted-foreground">Valor da Nota</p>
                        <p className="text-xl font-bold text-primary">
                          R$ {item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Forma de Pagamento</p>
                        <p className="text-lg font-semibold">{item.formaPagamento || '-'}</p>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Data Emissão:</span>
                        <p className="font-medium">
                          {item.dataEmissao ? new Date(item.dataEmissao).toLocaleDateString('pt-BR') : '-'}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Vencimento:</span>
                        <p className="font-medium">
                          {item.dataVencimento ? new Date(item.dataVencimento).toLocaleDateString('pt-BR') : '-'}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Orçamento:</span>
                        <p className="font-medium">{item.numero}</p>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-1" />
                        Download PDF
                      </Button>
                      <Button variant="outline" size="sm">
                        Enviar por Email
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {orcamentosFinalizados.length === 0 && (
                <Card>
                  <CardContent className="p-12 text-center">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      Nenhuma nota fiscal emitida
                    </h3>
                    <p className="text-muted-foreground">
                      Emita notas fiscais dos orçamentos aprovados
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>

        {/* Notas Faturadas */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Notas Faturadas</h3>
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
              {notasFaturadas.map((nota) => (
                <Card key={`${nota.id}-${nota.tipo}`} className="shadow-soft hover:shadow-medium transition-smooth">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <FileText className="h-5 w-5 text-primary" />
                          {nota.tipo === 'nota_fiscal' ? 'Nota Fiscal' : 'Nota de Retorno'} - Ordem {nota.numero_ordem}
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
                            {nota.tipo === 'nota_fiscal' ? 'Nota Fiscal' : 
                             nota.tipo === 'nota_retorno' ? 'Nota de Retorno' :
                             nota.tipo === 'orcamento_com_entrada' ? 'Orçamento c/ Nota Entrada' :
                             'Orçamento Simples'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          const pdfUrl = nota.tipo === 'nota_fiscal' ? nota.pdf_nota_fiscal : nota.pdf_nota_retorno;
                          if (pdfUrl) {
                            handleDownloadPdf(pdfUrl, `${nota.tipo}_${nota.numero_ordem}.pdf`);
                          }
                        }}
                        disabled={!((nota.tipo === 'nota_fiscal' && nota.pdf_nota_fiscal) || (nota.tipo === 'nota_retorno' && nota.pdf_nota_retorno))}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download PDF
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          const pdfUrl = nota.tipo === 'nota_fiscal' ? nota.pdf_nota_fiscal : nota.pdf_nota_retorno;
                          if (pdfUrl) {
                            window.open(pdfUrl, '_blank');
                          }
                        }}
                        disabled={!((nota.tipo === 'nota_fiscal' && nota.pdf_nota_fiscal) || (nota.tipo === 'nota_retorno' && nota.pdf_nota_retorno))}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Visualizar PDF
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {notasFaturadas.length === 0 && (
                <Card>
                  <CardContent className="p-12 text-center">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      Nenhuma nota faturada
                    </h3>
                    <p className="text-muted-foreground">
                      PDFs de notas fiscais e notas de retorno aparecerão aqui
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}