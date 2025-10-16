import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, FileText, Edit, Check, X, Copy, Search, Download, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { AprovarOrcamentoModal } from "@/components/AprovarOrcamentoModal";
import { PrecificacaoModal } from "@/components/PrecificacaoModal";
import jsPDF from "jspdf";

export default function Orcamentos() {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [ordensServico, setOrdensServico] = useState<any[]>([]);
  const [ordensFiltered, setOrdensFiltered] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrdemServico, setSelectedOrdemServico] = useState<any>(null);
  const [orcamentos, setOrcamentos] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    carregarOrdensServico();
    carregarOrcamentos();
  }, []);

  const carregarOrdensServico = async () => {
    try {
      const { data, error } = await supabase
        .from('ordens_servico')
        .select(`
          *,
          recebimentos:recebimento_id (
            numero_ordem
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao carregar ordens de serviço:', error);
        toast.error('Erro ao carregar ordens de serviço');
        return;
      }

      console.log('Ordens de serviço carregadas:', data);
      setOrdensServico(data || []);
      setOrdensFiltered(data || []);
    } catch (error) {
      console.error('Erro ao carregar ordens de serviço:', error);
      toast.error('Erro ao carregar ordens de serviço');
    }
  };

  const carregarOrcamentos = async () => {
    try {
      const { data, error } = await supabase
        .from('orcamentos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao carregar orçamentos:', error);
        toast.error('Erro ao carregar orçamentos');
        return;
      }

      console.log('Orçamentos carregados:', data);
      setOrcamentos(data || []);
    } catch (error) {
      console.error('Erro ao carregar orçamentos:', error);
      toast.error('Erro ao carregar orçamentos');
    }
  };

  useEffect(() => {
    if (searchTerm) {
      const filtered = ordensServico.filter((ordem) =>
        ordem.cliente_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ordem.equipamento?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ordem.recebimentos?.numero_ordem?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setOrdensFiltered(filtered);
    } else {
      setOrdensFiltered(ordensServico);
    }
  }, [searchTerm, ordensServico]);

  const handleCreateOrcamentoFromOrdemServico = () => {
    if (selectedOrdemServico) {
      navigate(`/orcamentos/novo?ordemServicoId=${selectedOrdemServico.id}`);
      setIsSheetOpen(false);
    } else {
      toast.error("Selecione uma ordem de serviço primeiro");
    }
  };

  const handleCreateNewOrcamento = () => {
    navigate('/orcamentos/novo');
    setIsSheetOpen(false);
  };

  const [showAprovarModal, setShowAprovarModal] = useState(false);
  const [orcamentoParaAprovar, setOrcamentoParaAprovar] = useState<any>(null);
  const [showPrecificacaoModal, setShowPrecificacaoModal] = useState(false);
  const [orcamentoParaPrecificar, setOrcamentoParaPrecificar] = useState<any>(null);

  const handleAprovarOrcamento = (orcamento: any) => {
    setOrcamentoParaAprovar(orcamento);
    setShowAprovarModal(true);
  };

  const confirmarAprovacao = async () => {
    try {
      await carregarOrcamentos();
      setShowAprovarModal(false);
      setOrcamentoParaAprovar(null);
    } catch (error) {
      console.error('Erro ao recarregar orçamentos:', error);
    }
  };

  const handleReprovarOrcamento = async (id: string) => {
    try {
      const { error } = await supabase
        .from('orcamentos')
        .update({ status: 'rejeitado' })
        .eq('id', id);

      if (error) {
        console.error('Erro ao reprovar orçamento:', error);
        toast.error('Erro ao reprovar orçamento');
        return;
      }

      await carregarOrcamentos();
      toast("Orçamento reprovado", {
        description: "O orçamento foi marcado como rejeitado.",
      });
    } catch (error) {
      console.error('Erro ao reprovar orçamento:', error);
      toast.error('Erro ao reprovar orçamento');
    }
  };

  const editarOrcamento = (orcamento: any) => {
    navigate('/orcamentos/novo', { state: { orcamento } });
  };

  const abrirPrecificacao = (orcamento: any) => {
    setOrcamentoParaPrecificar(orcamento);
    setShowPrecificacaoModal(true);
  };

  const gerarPDFOrcamento = async (orcamento: any) => {
    try {
      // Buscar itens do orçamento
      const { data: itensData, error: itensError } = await supabase
        .from('itens_orcamento')
        .select('*')
        .eq('orcamento_id', orcamento.id);

      if (itensError) {
        console.error('Erro ao buscar itens:', itensError);
        toast.error('Erro ao gerar PDF');
        return;
      }

      // Buscar fotos (de ordem de serviço ou do orçamento)
      let fotosData: any[] = [];
      if (orcamento.ordem_servico_id) {
        const { data: osData } = await supabase
          .from('ordens_servico')
          .select('recebimento_id')
          .eq('id', orcamento.ordem_servico_id)
          .single();

        if (osData?.recebimento_id) {
          const { data: fotos } = await supabase
            .from('fotos_equipamentos')
            .select('*')
            .eq('recebimento_id', osData.recebimento_id)
            .eq('apresentar_orcamento', true);
          
          fotosData = fotos || [];
        }
      } else {
        const { data: fotos } = await supabase
          .from('fotos_orcamento')
          .select('*')
          .eq('orcamento_id', orcamento.id)
          .eq('apresentar_orcamento', true);
        
        fotosData = fotos || [];
      }

      // Gerar PDF
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      let yPosition = 20;

      // Cabeçalho
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("ORÇAMENTO", pageWidth / 2, yPosition, { align: "center" });
      yPosition += 15;

      // Informações básicas
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(`Número: ${orcamento.numero}`, 20, yPosition);
      doc.text(`Data: ${new Date().toLocaleDateString("pt-BR")}`, pageWidth - 60, yPosition);
      yPosition += 10;
      doc.text(`Cliente: ${orcamento.cliente_nome}`, 20, yPosition);
      yPosition += 8;
      doc.text(`Equipamento: ${orcamento.equipamento}`, 20, yPosition);
      yPosition += 15;

      // Agrupar itens por tipo
      const pecas = itensData?.filter(i => i.tipo === 'peca') || [];
      const servicos = itensData?.filter(i => i.tipo === 'servico') || [];
      const usinagem = itensData?.filter(i => i.tipo === 'usinagem') || [];

      // Função para adicionar tabela de itens
      const adicionarTabelaItens = (titulo: string, itens: any[]) => {
        if (itens.length === 0) return;

        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFont("helvetica", "bold");
        doc.text(titulo, 20, yPosition);
        yPosition += 10;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);

        // Cabeçalho da tabela
        const headers = ["Descrição", "Qtd", "Valor Unit.", "Total"];
        const colWidths = [100, 20, 30, 30];
        let xPos = 20;
        doc.setFont("helvetica", "bold");
        headers.forEach((header, index) => {
          doc.text(header, xPos, yPosition);
          xPos += colWidths[index];
        });
        yPosition += 8;
        doc.line(20, yPosition - 2, pageWidth - 20, yPosition - 2);
        doc.setFont("helvetica", "normal");

        // Itens
        itens.forEach(item => {
          if (yPosition > 270) {
            doc.addPage();
            yPosition = 20;
          }
          xPos = 20;
          const descricao = item.descricao.length > 35 ? item.descricao.substring(0, 32) + "..." : item.descricao;
          doc.text(descricao, xPos, yPosition);
          xPos += colWidths[0];
          doc.text(Number(item.quantidade).toString(), xPos, yPosition, { align: "right" });
          xPos += colWidths[1];
          doc.text(`R$ ${Number(item.valor_unitario).toFixed(2)}`, xPos, yPosition, { align: "right" });
          xPos += colWidths[2];
          doc.text(`R$ ${Number(item.valor_total).toFixed(2)}`, xPos, yPosition, { align: "right" });
          yPosition += 8;
        });
        yPosition += 10;
      };

      adicionarTabelaItens("PEÇAS", pecas);
      adicionarTabelaItens("SERVIÇOS", servicos);
      adicionarTabelaItens("USINAGEM", usinagem);

      // Valor total
      if (yPosition > 220) {
        doc.addPage();
        yPosition = 20;
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      yPosition += 10;
      doc.text(`Valor Total: R$ ${Number(orcamento.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, pageWidth - 80, yPosition, { align: "right" });

      // Adicionar fotos se houver
      if (fotosData.length > 0) {
        doc.addPage();
        yPosition = 20;
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("FOTOS DO EQUIPAMENTO", pageWidth / 2, yPosition, { align: "center" });
        yPosition += 15;

        for (const foto of fotosData) {
          if (yPosition > 250) {
            doc.addPage();
            yPosition = 20;
          }
          
          try {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = foto.arquivo_url;
            
            await new Promise((resolve, reject) => {
              img.onload = resolve;
              img.onerror = reject;
            });

            const imgWidth = 160;
            const imgHeight = (img.height * imgWidth) / img.width;
            
            if (yPosition + imgHeight > 280) {
              doc.addPage();
              yPosition = 20;
            }

            doc.addImage(img, 'JPEG', (pageWidth - imgWidth) / 2, yPosition, imgWidth, imgHeight);
            yPosition += imgHeight + 15;
          } catch (error) {
            console.error('Erro ao carregar imagem:', error);
          }
        }
      }

      doc.save(`Orcamento_${orcamento.numero}.pdf`);
      toast.success('PDF gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pendente":
        return "bg-warning-light text-warning border-warning/20";
      case "aprovado":
        return "bg-success-light text-success border-success/20";
      case "rejeitado":
        return "bg-destructive-light text-destructive border-destructive/20";
      default:
        return "bg-secondary-light text-secondary border-secondary/20";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "pendente":
        return "Pendente";
      case "aprovado":
        return "Aprovado";
      case "rejeitado":
        return "Rejeitado";
      default:
        return status;
    }
  };

  return (
    <AppLayout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Orçamentos</h1>
            <p className="text-muted-foreground">
              Gerencie e aprove orçamentos pendentes
            </p>
          </div>
          
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Novo Orçamento
              </Button>
            </SheetTrigger>
            <SheetContent className="sm:max-w-2xl">
              <SheetHeader>
                <SheetTitle>Criar Novo Orçamento</SheetTitle>
              </SheetHeader>
              
              <div className="py-6 space-y-6">
                <Card className="cursor-pointer hover:shadow-md transition-smooth border-2 hover:border-primary/20" onClick={handleCreateNewOrcamento}>
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Plus className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Orçamento em Branco</CardTitle>
                        <CardDescription>
                          Criar um novo orçamento do zero
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>

                <Card className="border-2">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-accent/10 rounded-lg">
                        <Copy className="h-5 w-5 text-accent" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Baseado em Ordem de Serviço</CardTitle>
                        <CardDescription>
                          Criar orçamento com base em uma ordem de serviço existente
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="search-ordem">Buscar Ordem de Serviço</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="search-ordem"
                          placeholder="Busque por cliente, equipamento ou número..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Selecionar Ordem de Serviço</Label>
                      <Select onValueChange={(value) => setSelectedOrdemServico(ordensFiltered.find(o => o.id === value))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma ordem de serviço..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {ordensFiltered.length > 0 ? (
                            ordensFiltered.map((ordem) => (
                              <SelectItem key={ordem.id} value={ordem.id}>
                                 <div className="flex flex-col">
                                   <span className="font-medium">{ordem.recebimentos?.numero_ordem || ordem.numero_ordem}</span>
                                   <span className="text-sm text-muted-foreground">
                                     {ordem.cliente_nome} - {ordem.equipamento}
                                   </span>
                                 </div>
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no-ordens" disabled>
                              <div className="text-center text-muted-foreground">
                                <FileText className="h-4 w-4 mx-auto mb-1 opacity-50" />
                                <p>Nenhuma ordem de serviço encontrada</p>
                              </div>
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedOrdemServico && (
                      <div className="p-3 bg-accent/5 rounded-lg border">
                         <div className="space-y-1">
                           <div className="font-medium text-sm">{selectedOrdemServico.recebimentos?.numero_ordem || selectedOrdemServico.numero_ordem}</div>
                           <div className="text-sm text-muted-foreground">{selectedOrdemServico.cliente_nome}</div>
                           <div className="text-xs text-muted-foreground">{selectedOrdemServico.equipamento}</div>
                           <Badge variant="outline" className="text-xs mt-2">
                             {selectedOrdemServico.status}
                           </Badge>
                         </div>
                      </div>
                    )}

                    <Button 
                      onClick={handleCreateOrcamentoFromOrdemServico}
                      disabled={!selectedOrdemServico}
                      className="w-full"
                    >
                      Criar Orçamento da Ordem de Serviço
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <Tabs defaultValue="pendente" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pendente">Aguardando Aprovação</TabsTrigger>
            <TabsTrigger value="aprovado">Aprovados</TabsTrigger>
            <TabsTrigger value="rejeitado">Reprovados</TabsTrigger>
          </TabsList>

          <TabsContent value="pendente" className="space-y-4">
            {orcamentos.filter(o => o.status === 'pendente').length > 0 ? (
              orcamentos.filter(o => o.status === 'pendente').map((item) => (
                <Card key={item.id} className="hover:shadow-md transition-smooth">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-foreground">
                            Orçamento #{item.numero}
                          </h3>
                          <Badge className={getStatusColor(item.status)}>
                            {getStatusText(item.status)}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p><span className="font-medium">Cliente:</span> {item.cliente_nome}</p>
                          <p><span className="font-medium">Equipamento:</span> {item.equipamento}</p>
                          <p><span className="font-medium">Valor:</span> R$ {Number(item.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => abrirPrecificacao(item)}
                        >
                          <DollarSign className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => editarOrcamento(item)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => gerarPDFOrcamento(item)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleReprovarOrcamento(item.id)}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleAprovarOrcamento(item)}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    Nenhum orçamento aguardando aprovação
                  </h3>
                  <p className="text-muted-foreground">
                    Não há orçamentos pendentes no momento
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="aprovado" className="space-y-4">
            {orcamentos.filter(o => o.status === 'aprovado').length > 0 ? (
              orcamentos.filter(o => o.status === 'aprovado').map((item) => (
                <Card key={item.id} className="hover:shadow-md transition-smooth">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-foreground">
                            Orçamento #{item.numero}
                          </h3>
                          <Badge className={getStatusColor(item.status)}>
                            {getStatusText(item.status)}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p><span className="font-medium">Cliente:</span> {item.cliente_nome}</p>
                          <p><span className="font-medium">Equipamento:</span> {item.equipamento}</p>
                          <p><span className="font-medium">Valor:</span> R$ {Number(item.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => abrirPrecificacao(item)}
                        >
                          <DollarSign className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => editarOrcamento(item)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => gerarPDFOrcamento(item)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    Nenhum orçamento aprovado
                  </h3>
                  <p className="text-muted-foreground">
                    Não há orçamentos aprovados no momento
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="rejeitado" className="space-y-4">
            {orcamentos.filter(o => o.status === 'rejeitado').length > 0 ? (
              orcamentos.filter(o => o.status === 'rejeitado').map((item) => (
                <Card key={item.id} className="hover:shadow-md transition-smooth">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-foreground">
                            Orçamento #{item.numero}
                          </h3>
                          <Badge className={getStatusColor(item.status)}>
                            {getStatusText(item.status)}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p><span className="font-medium">Cliente:</span> {item.cliente_nome}</p>
                          <p><span className="font-medium">Equipamento:</span> {item.equipamento}</p>
                          <p><span className="font-medium">Valor:</span> R$ {Number(item.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => abrirPrecificacao(item)}
                        >
                          <DollarSign className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => editarOrcamento(item)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => gerarPDFOrcamento(item)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    Nenhum orçamento reprovado
                  </h3>
                  <p className="text-muted-foreground">
                    Não há orçamentos reprovados no momento
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
      
      <AprovarOrcamentoModal
        open={showAprovarModal}
        onOpenChange={setShowAprovarModal}
        orcamento={orcamentoParaAprovar}
        onConfirm={confirmarAprovacao}
      />

      <PrecificacaoModal
        open={showPrecificacaoModal}
        onClose={() => setShowPrecificacaoModal(false)}
        orcamento={orcamentoParaPrecificar}
        onSave={carregarOrcamentos}
      />
    </AppLayout>
  );
}