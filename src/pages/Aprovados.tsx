import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Play, Package, Truck, FileText, Calendar, User } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { getOrdensServico, type OrdemServico } from "@/lib/orcamento-utils";

export default function Aprovados() {
  const [ordensServico, setOrdensServico] = useState<OrdemServico[]>([]);
  const [analisesAprovadas, setAnalisesAprovadas] = useState<any[]>([]);

  useEffect(() => {
    setOrdensServico(getOrdensServico());
    
    // Carregar análises aprovadas
    const analises = JSON.parse(localStorage.getItem('analises') || '[]');
    const aprovadas = analises.filter((a: any) => a.status === 'Aprovada');
    setAnalisesAprovadas(aprovadas);
  }, []);
  const getEtapaColor = (etapa: string) => {
    switch (etapa) {
      case "aguardando_inicio":
        return "bg-warning-light text-warning border-warning/20";
      case "em_producao":
        return "bg-primary-light text-primary border-primary/20";
      case "finalizado":
        return "bg-accent-light text-accent border-accent/20";
      case "entregue":
        return "bg-accent-light text-accent border-accent/20";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  const getEtapaText = (etapa: string) => {
    switch (etapa) {
      case "aguardando_inicio":
        return "Aguardando Início";
      case "em_producao":
        return "Em Produção";
      case "finalizado":
        return "Finalizado";
      case "entregue":
        return "Entregue";
      default:
        return etapa;
    }
  };

  const getEtapaIcon = (etapa: string) => {
    switch (etapa) {
      case "aguardando_inicio":
        return <Play className="h-4 w-4" />;
      case "em_producao":
        return <Package className="h-4 w-4" />;
      case "finalizado":
        return <CheckCircle className="h-4 w-4" />;
      case "entregue":
        return <Truck className="h-4 w-4" />;
      default:
        return <CheckCircle className="h-4 w-4" />;
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Projetos Aprovados</h2>
            <p className="text-muted-foreground">
              Acompanhamento da produção, entrega e análises aprovadas
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Package className="h-4 w-4 mr-2" />
              Relatório de Produção
            </Button>
          </div>
        </div>

        {/* Seção de Análises Aprovadas */}
        {analisesAprovadas.length > 0 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-semibold text-foreground">Análises Técnicas Aprovadas</h3>
              <p className="text-muted-foreground">
                Análises que tiveram seus orçamentos aprovados ({analisesAprovadas.length})
              </p>
            </div>
            
            <div className="grid gap-4">
              {analisesAprovadas.map((analise) => (
                <Card key={analise.id} className="shadow-soft hover:shadow-medium transition-smooth border-l-4 border-l-green-500">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <CheckCircle className="h-6 w-6 text-green-600" />
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-foreground flex items-center gap-2">
                            {analise.id} - {analise.equipamento}
                          </h4>
                          <p className="text-sm text-muted-foreground flex items-center gap-4">
                            <span className="flex items-center gap-1">
                              <User className="h-4 w-4" />
                              {analise.cliente}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              Aprovado em: {new Date(analise.dataAprovacao).toLocaleDateString('pt-BR')}
                            </span>
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Orçamento Aprovado</div>
                        <div className="font-semibold text-primary">{analise.orcamentoAprovado}</div>
                        <div className="text-lg font-bold text-green-600">
                          R$ {analise.valorAprovado?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                        </div>
                      </div>
                    </div>
                    
                    {analise.problemas && (
                      <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                        <h5 className="text-sm font-medium text-foreground mb-1">Problemas Identificados:</h5>
                        <p className="text-sm text-muted-foreground">{analise.problemas}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Seção de Ordens de Serviço */}
        <div className="space-y-4">
          <div>
            <h3 className="text-xl font-semibold text-foreground">Ordens de Serviço em Produção</h3>
            <p className="text-muted-foreground">
              Acompanhamento da produção e entrega ({ordensServico.length})
            </p>
          </div>

          <div className="grid gap-6">
            {ordensServico.length > 0 ? (
              ordensServico.map((item) => (
                <Card key={item.id} className="shadow-soft hover:shadow-medium transition-smooth">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          {getEtapaIcon(item.etapa)}
                          {item.equipamento}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {item.id} - {item.cliente}
                        </CardDescription>
                      </div>
                      <Badge className={getEtapaColor(item.etapa)}>
                        {getEtapaText(item.etapa)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-4 p-4 bg-gradient-secondary rounded-lg">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Valor do Projeto</p>
                        <p className="text-lg font-semibold text-primary">
                          R$ {item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Início</p>
                        <p className="text-lg font-semibold">
                          {new Date(item.dataInicio).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Previsão Entrega</p>
                        <p className="text-lg font-semibold">
                          {new Date(item.previsaoEntrega).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Progresso do Projeto</span>
                        <span className="font-medium">{item.progresso}%</span>
                      </div>
                      <Progress value={item.progresso} className="h-3" />
                    </div>

                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">Técnico Responsável:</span> {item.tecnicoResponsavel}
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" size="sm">
                        Atualizar Progresso
                      </Button>
                      <Button variant="outline" size="sm">
                        Histórico
                      </Button>
                      {item.etapa === "finalizado" && (
                        <Button size="sm" className="bg-gradient-primary">
                          Marcar como Entregue
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    Nenhuma ordem de serviço ativa
                  </h3>
                  <p className="text-muted-foreground">
                    Aprove orçamentos vinculados a ordens de serviço para que apareçam aqui
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Caso não haja nenhum item aprovado */}
        {analisesAprovadas.length === 0 && ordensServico.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Nenhum projeto aprovado ainda
              </h3>
              <p className="text-muted-foreground">
                Aprove orçamentos para que as análises e ordens de serviço apareçam aqui
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}