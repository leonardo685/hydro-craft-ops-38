import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Play, Package, Truck, FileText, Calendar, User, Settings, Wrench } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ItemSelectionModal } from "@/components/ItemSelectionModal";

export default function Aprovados() {
  const [ordensServico, setOrdensServico] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadOrdensAprovadas();
  }, []);

  const loadOrdensAprovadas = async () => {
    try {
      const { data, error } = await supabase
        .from('ordens_servico')
        .select(`
          *,
          recebimentos (
            numero_ordem,
            cliente_nome,
            tipo_equipamento
          )
        `)
        .eq('status', 'aprovada')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrdensServico(data || []);
    } catch (error) {
      console.error('Erro ao carregar ordens aprovadas:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar ordens aprovadas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
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

        {loading ? (
          <div className="text-center py-8">Carregando...</div>
        ) : (
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-semibold text-foreground">Análises Aprovadas</h3>
              <p className="text-muted-foreground">
                Análises técnicas aprovadas prontas para produção ({ordensServico.length})
              </p>
            </div>

            <div className="grid gap-6">
              {ordensServico.length > 0 ? (
                ordensServico.map((ordem) => (
                  <Card key={ordem.id} className="shadow-soft hover:shadow-medium transition-smooth border-l-4 border-l-green-500">
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-green-100 rounded-lg">
                            <CheckCircle className="h-6 w-6 text-green-600" />
                          </div>
                          <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                              {ordem.recebimentos?.numero_ordem || ordem.numero_ordem} - {ordem.recebimentos?.tipo_equipamento || ordem.equipamento}
                            </CardTitle>
                            <CardDescription className="mt-1 flex items-center gap-4">
                              <span className="flex items-center gap-1">
                                <User className="h-4 w-4" />
                                {ordem.recebimentos?.cliente_nome || ordem.cliente_nome}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                Aprovado em: {new Date(ordem.updated_at).toLocaleDateString('pt-BR')}
                              </span>
                            </CardDescription>
                          </div>
                        </div>
                        <Badge className="bg-green-100 text-green-700 border-green-200">
                          Aprovada
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid md:grid-cols-2 gap-4 p-4 bg-gradient-secondary rounded-lg">
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">Prazo de Entrega</p>
                          <input
                            type="date"
                            className="text-lg font-semibold bg-transparent border-none text-center outline-none"
                            defaultValue={ordem.prazo_entrega || ''}
                            onChange={(e) => {
                              // Aqui você pode implementar a lógica para salvar a data
                              console.log('Nova data:', e.target.value);
                            }}
                          />
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">Técnico</p>
                          <p className="text-lg font-semibold">
                            {ordem.tecnico || 'Não atribuído'}
                          </p>
                        </div>
                      </div>

                      {ordem.observacoes_tecnicas && (
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <h5 className="text-sm font-medium text-foreground mb-1">Observações Técnicas:</h5>
                          <p className="text-sm text-muted-foreground">{ordem.observacoes_tecnicas}</p>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2 pt-2">
                        <Button variant="outline" size="sm">
                          <Play className="h-4 w-4 mr-2" />
                          Iniciar Produção
                        </Button>
                        
                        <ItemSelectionModal
                          title="Peças Necessárias"
                          items={ordem.pecas_necessarias || []}
                          type="pecas"
                          ordemId={ordem.id}
                        >
                          <Button variant="outline" size="sm">
                            <Package className="h-4 w-4 mr-2" />
                            Peças
                          </Button>
                        </ItemSelectionModal>

                        <ItemSelectionModal
                          title="Usinagem Necessária"
                          items={ordem.usinagem_necessaria || []}
                          type="usinagem"
                          ordemId={ordem.id}
                        >
                          <Button variant="outline" size="sm">
                            <Settings className="h-4 w-4 mr-2" />
                            Usinagem
                          </Button>
                        </ItemSelectionModal>

                        <ItemSelectionModal
                          title="Serviços Necessários"
                          items={ordem.servicos_necessarios || []}
                          type="servicos"
                          ordemId={ordem.id}
                        >
                          <Button variant="outline" size="sm">
                            <Wrench className="h-4 w-4 mr-2" />
                            Serviços
                          </Button>
                        </ItemSelectionModal>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="p-12 text-center">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      Nenhuma análise aprovada ainda
                    </h3>
                    <p className="text-muted-foreground">
                      Aprove análises técnicas para que apareçam aqui
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}