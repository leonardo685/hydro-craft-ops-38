import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calculator, FileText, DollarSign, Clock, Copy, Plus, Check, X, Edit } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { getOrcamentosPendentes, aprovarOrcamento, reprovarOrcamento, getOrdensServico, type Orcamento, type OrdemServico } from "@/lib/orcamento-utils";


export default function Orcamentos() {
  const navigate = useNavigate();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [ordensServico, setOrdensServico] = useState<OrdemServico[]>([]);
  const [selectedOrdem, setSelectedOrdem] = useState<OrdemServico | null>(null);
  const [orcamentosData, setOrcamentosData] = useState<Orcamento[]>([]);

  const orcamentosPendentes = orcamentosData;

  useEffect(() => {
    // Carregar ordens de serviço do localStorage
    const ordensStorage = getOrdensServico();
    setOrdensServico(ordensStorage);

    // Carregar orçamentos pendentes
    setOrcamentosData(getOrcamentosPendentes());
  }, []);

  const handleCreateOrcamentoFromOrdem = (ordem: OrdemServico) => {
    setIsSheetOpen(false);
    navigate(`/orcamentos/novo?ordemId=${ordem.id}`);
  };

  const handleCreateNewOrcamento = () => {
    setIsSheetOpen(false);
    navigate('/orcamentos/novo');
  };

  const handleAprovarOrcamento = (id: number) => {
    const orcamentos = JSON.parse(localStorage.getItem('orcamentos') || '[]');
    const orcamento = orcamentos.find((o: any) => o.id === id);
    
    aprovarOrcamento(id);
    setOrcamentosData(getOrcamentosPendentes()); // Recarregar lista
    
    let mensagem = "O orçamento foi aprovado e enviado para faturamento!";
    if (orcamento?.analiseOrigem) {
      mensagem += " A análise técnica correspondente também foi aprovada automaticamente.";
    }
    
    toast({
      title: "Orçamento Aprovado",
      description: mensagem,
    });
  };

  const handleReprovarOrcamento = (id: number) => {
    reprovarOrcamento(id);
    setOrcamentosData(getOrcamentosPendentes()); // Recarregar lista
    toast({
      title: "Orçamento Reprovado", 
      description: "O orçamento foi reprovado.",
      variant: "destructive"
    });
  };

  const editarOrcamento = (numero: string) => {
    // Por enquanto apenas navegar para a página de novo orçamento
    // Futuramente pode ser implementada a edição
    navigate('/orcamentos/novo');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pendente":
        return "bg-warning-light text-warning border-warning/20";
      case "aprovado":
        return "bg-accent-light text-accent border-accent/20";
      case "rejeitado":
        return "bg-destructive/10 text-destructive border-destructive/20";
      default:
        return "bg-secondary text-secondary-foreground";
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Orçamentos Pendentes</h2>
            <p className="text-muted-foreground">
              Orçamentos aguardando aprovação ({orcamentosPendentes.length})
            </p>
          </div>
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button className="bg-gradient-primary hover:bg-primary-hover transition-smooth shadow-medium">
                <Calculator className="h-4 w-4 mr-2" />
                Novo Orçamento
              </Button>
            </SheetTrigger>
            <SheetContent className="w-[600px] sm:w-[800px]">
              <SheetHeader>
                <SheetTitle>Criar Novo Orçamento</SheetTitle>
                <SheetDescription>
                  Escolha como deseja criar o orçamento
                </SheetDescription>
              </SheetHeader>
              
              <div className="space-y-6 mt-6">
                <div className="grid gap-4">
                  <Card className="cursor-pointer hover:shadow-md transition-smooth border-2 hover:border-primary/20" 
                        onClick={handleCreateNewOrcamento}>
                    <CardHeader className="pb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Plus className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">Orçamento Novo</CardTitle>
                          <CardDescription>
                            Criar um orçamento do zero
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>

                  <Card className="cursor-pointer hover:shadow-md transition-smooth border-2 hover:border-primary/20">
                    <CardHeader className="pb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-accent/10 rounded-lg">
                          <Copy className="h-5 w-5 text-accent" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">Baseado em Ordem de Serviço</CardTitle>
                          <CardDescription>
                            Criar orçamento com base em uma análise técnica existente
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {ordensServico.length > 0 ? (
                          ordensServico.map((ordem) => (
                            <div 
                              key={ordem.id}
                              className="p-3 border rounded-lg hover:bg-accent/5 cursor-pointer transition-smooth"
                              onClick={() => handleCreateOrcamentoFromOrdem(ordem)}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium text-sm">{ordem.id}</div>
                                  <div className="text-sm text-muted-foreground">{ordem.cliente}</div>
                                  <div className="text-xs text-muted-foreground">{ordem.equipamento}</div>
                                </div>
                                <Badge variant="outline" className="text-xs">
                                  {ordem.etapa}
                                </Badge>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center text-muted-foreground py-8">
                            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>Nenhuma ordem de serviço encontrada</p>
                            <p className="text-xs">Crie uma ordem de serviço primeiro</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <div className="grid gap-4">
          {orcamentosPendentes.length > 0 ? (
            orcamentosPendentes.map((item) => (
              <Card key={item.id} className="shadow-soft hover:shadow-medium transition-smooth">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="h-6 w-6 text-primary" />
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">
                          {item.numero}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {item.cliente}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => editarOrcamento(item.numero)}
                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                      >
                        <Edit className="h-4 w-4" />
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
                        onClick={() => handleAprovarOrcamento(item.id)}
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
                  Nenhum orçamento pendente
                </h3>
                <p className="text-muted-foreground">
                  Todos os orçamentos já foram aprovados ou reprovados
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}