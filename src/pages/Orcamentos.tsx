import { useState, useEffect } from "react";
import { Orcamento, getOrcamentos, getOrcamentosPendentes, aprovarOrcamento, reprovarOrcamento } from "@/lib/orcamento-utils";
import { Badge } from "@/components/ui/badge";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, FileText, Edit, Check, X, Copy, Search } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function Orcamentos() {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [analises, setAnalises] = useState<any[]>([]);
  const [analisesFiltered, setAnalisesFiltered] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAnalise, setSelectedAnalise] = useState<any>(null);
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Carregar análises que estão prontas para orçamento
    const storedAnalises = JSON.parse(localStorage.getItem('analises') || '[]');
    const analisesProntas = storedAnalises.filter((a: any) => 
      a.status === 'Aguardando Orçamento' || a.status === 'Em Análise'
    );
    setAnalises(analisesProntas);
    setAnalisesFiltered(analisesProntas);
    setOrcamentos(getOrcamentosPendentes());
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = analises.filter((analise) =>
        analise.cliente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        analise.equipamento?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        analise.numeroOrdem?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setAnalisesFiltered(filtered);
    } else {
      setAnalisesFiltered(analises);
    }
  }, [searchTerm, analises]);

  const handleCreateOrcamentoFromAnalise = () => {
    if (selectedAnalise) {
      navigate(`/novo-orcamento?analiseId=${selectedAnalise.id}`);
      setIsSheetOpen(false);
    } else {
      toast.error("Selecione uma análise primeiro");
    }
  };

  const handleCreateNewOrcamento = () => {
    navigate('/novo-orcamento');
    setIsSheetOpen(false);
  };

  const handleAprovarOrcamento = (id: number) => {
    aprovarOrcamento(id);
    setOrcamentos(getOrcamentosPendentes());
    toast.success("Orçamento aprovado com sucesso!");
  };

  const handleReprovarOrcamento = (id: number) => {
    reprovarOrcamento(id);
    setOrcamentos(getOrcamentosPendentes());
    toast("Orçamento reprovado", {
      description: "O orçamento foi marcado como rejeitado.",
    });
  };

  const editarOrcamento = (orcamento: Orcamento) => {
    navigate('/novo-orcamento', { state: { orcamento } });
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
                        <CardTitle className="text-lg">Baseado em Análise Técnica</CardTitle>
                        <CardDescription>
                          Criar orçamento com base em uma análise técnica existente
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="search-analise">Buscar Análise</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="search-analise"
                          placeholder="Busque por cliente, equipamento ou número..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Selecionar Análise</Label>
                      <Select onValueChange={(value) => setSelectedAnalise(analisesFiltered.find(a => a.id === value))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma análise..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {analisesFiltered.length > 0 ? (
                            analisesFiltered.map((analise) => (
                              <SelectItem key={analise.id} value={analise.id}>
                                <div className="flex flex-col">
                                  <span className="font-medium">{analise.numeroOrdem}</span>
                                  <span className="text-sm text-muted-foreground">
                                    {analise.cliente} - {analise.equipamento}
                                  </span>
                                </div>
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no-analises" disabled>
                              <div className="text-center text-muted-foreground">
                                <FileText className="h-4 w-4 mx-auto mb-1 opacity-50" />
                                <p>Nenhuma análise encontrada</p>
                              </div>
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedAnalise && (
                      <div className="p-3 bg-accent/5 rounded-lg border">
                        <div className="space-y-1">
                          <div className="font-medium text-sm">{selectedAnalise.numeroOrdem}</div>
                          <div className="text-sm text-muted-foreground">{selectedAnalise.cliente}</div>
                          <div className="text-xs text-muted-foreground">{selectedAnalise.equipamento}</div>
                          <Badge variant="outline" className="text-xs mt-2">
                            {selectedAnalise.status}
                          </Badge>
                        </div>
                      </div>
                    )}

                    <Button 
                      onClick={handleCreateOrcamentoFromAnalise}
                      disabled={!selectedAnalise}
                      className="w-full"
                    >
                      Criar Orçamento da Análise
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Orçamentos Pendentes</h2>
          
          {orcamentos.length > 0 ? (
            orcamentos.map((item) => (
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
                        <p><span className="font-medium">Cliente:</span> {item.cliente}</p>
                        <p><span className="font-medium">Equipamento:</span> {item.equipamento}</p>
                        <p><span className="font-medium">Valor:</span> R$ {item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => editarOrcamento(item)}
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