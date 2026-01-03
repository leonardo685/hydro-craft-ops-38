import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Play, Package, Truck, FileText, Calendar, User, Settings, Wrench, RotateCw, Camera, Video } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ItemSelectionModal } from "@/components/ItemSelectionModal";
import { TesteModal } from "@/components/TesteModal";
import { UploadProdutoProntoModal } from "@/components/UploadProdutoProntoModal";
import { UploadFotosProducaoModal } from "@/components/UploadFotosProducaoModal";
import { UploadVideoTesteModal } from "@/components/UploadVideoTesteModal";
import { OrdemServicoModal } from "@/components/OrdemServicoModal";
import { useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";
import { useEmpresa } from "@/contexts/EmpresaContext";
import { enviarWebhook } from "@/lib/webhook-utils";

export default function Aprovados() {
  const { t } = useLanguage();
  const [ordensServico, setOrdensServico] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [ordensEmProducao, setOrdensEmProducao] = useState<Set<string>>(new Set());
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [ordemSelecionada, setOrdemSelecionada] = useState<any>(null);
  const {
    toast
  } = useToast();
  const navigate = useNavigate();
  const { empresaAtual } = useEmpresa();

  // Obter webhook da empresa
  const getWebhookUrl = (): string | null => {
    if (!empresaAtual) return null;
    const config = empresaAtual.configuracoes as { webhook_url?: string } | null;
    return config?.webhook_url || null;
  };

  useEffect(() => {
    loadOrdensAprovadas();
  }, []);
  const loadOrdensAprovadas = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('ordens_servico').select(`
          *,
          recebimentos (
            numero_ordem,
            cliente_nome,
            tipo_equipamento,
            nota_fiscal,
            chave_acesso_nfe,
            categoria_equipamento
          )
        `).in('status', ['aprovada', 'em_producao', 'em_teste']).order('created_at', {
        ascending: false
      });
      if (error) throw error;
      setOrdensServico(data || []);

      // Identificar quais ordens estão em produção ou teste
      const ordensEmProducaoSet = new Set(data?.filter(ordem => ordem.status === 'em_producao' || ordem.status === 'em_teste').map(ordem => ordem.id) || []);
      setOrdensEmProducao(ordensEmProducaoSet);
    } catch (error) {
      console.error('Erro ao carregar ordens aprovadas:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar ordens aprovadas",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const iniciarProducao = async (ordemId: string) => {
    try {
      const {
        error
      } = await supabase.from('ordens_servico').update({
        status: 'em_producao'
      }).eq('id', ordemId);
      if (error) throw error;
      toast({
        title: t('aprovados.productionStarted'),
        description: t('aprovados.orderInProduction')
      });
      loadOrdensAprovadas();
    } catch (error) {
      console.error('Erro ao iniciar produção:', error);
      toast({
        title: t('messages.error'),
        description: t('messages.saveError'),
        variant: "destructive"
      });
    }
  };

  const getSidebarColor = (ordem: any) => {
    // Verificar se existe prazo_entrega nos dados do recebimento ou na ordem
    const prazoEntrega = ordem.tempo_estimado || ordem.prazo_entrega;
    if (!prazoEntrega) return "border-l-green-500";
    const hoje = new Date();
    const dataEntrega = new Date(prazoEntrega);
    const diffTime = dataEntrega.getTime() - hoje.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    console.log('Prazo entrega:', prazoEntrega, 'Dias restantes:', diffDays);
    if (diffDays <= 0) return "border-l-red-500"; // No dia da entrega ou atrasado
    if (diffDays === 1) return "border-l-yellow-500"; // Falta 1 dia
    return "border-l-green-500"; // Normal
  };
  const getEtapaColor = (etapa: string) => {
    switch (etapa) {
      case "aguardando_inicio":
        return "bg-warning/10 text-warning border-warning/20";
      case "em_producao":
        return "bg-primary/10 text-primary border-primary/20";
      case "em_teste":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20 dark:bg-blue-400/10 dark:text-blue-400 dark:border-blue-400/20";
      case "finalizado":
        return "bg-accent/10 text-accent border-accent/20";
      case "entregue":
        return "bg-accent/10 text-accent border-accent/20";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };
  const getEtapaText = (etapa: string) => {
    switch (etapa) {
      case "aguardando_inicio":
        return t('aprovados.awaitingStart');
      case "em_producao":
        return t('aprovados.inProduction');
      case "em_teste":
        return t('aprovados.inTest');
      case "finalizado":
        return t('aprovados.finished');
      case "entregue":
        return t('aprovados.delivered');
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
      case "em_teste":
        return <Settings className="h-4 w-4" />;
      case "finalizado":
        return <CheckCircle className="h-4 w-4" />;
      case "entregue":
        return <Truck className="h-4 w-4" />;
      default:
        return <CheckCircle className="h-4 w-4" />;
    }
  };
  return <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">{t('aprovados.title')}</h2>
            <p className="text-muted-foreground">
              {t('aprovados.subtitle')}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Package className="h-4 w-4 mr-2" />
              {t('aprovados.productionReport')}
            </Button>
          </div>
        </div>

        {loading ? <div className="text-center py-8">{t('common.loading')}</div> : <div className="space-y-4">
            <div>
              <h3 className="text-xl font-semibold text-foreground">{t('aprovados.ordersInProduction')}</h3>
              <p className="text-muted-foreground">
                {t('aprovados.productionSubtitle')} ({ordensServico.length})
              </p>
            </div>

            <div className="grid gap-6">
              {ordensServico.length > 0 ? ordensServico.map(ordem => <Card key={ordem.id} className={`shadow-soft hover:shadow-medium transition-smooth border-l-4 ${getSidebarColor(ordem)}`}>
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-accent/10 rounded-lg">
                            <CheckCircle className="h-6 w-6 text-accent" />
                          </div>
                          <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                              <OrdemServicoModal ordem={ordem}>
                                <button className="text-primary hover:underline cursor-pointer">
                                  {ordem.recebimentos?.numero_ordem || ordem.numero_ordem || 'Sem número'}
                                </button>
                              </OrdemServicoModal> - {ordem.equipamento || ordem.recebimentos?.tipo_equipamento}
                            </CardTitle>
                            <CardDescription className="mt-1 flex items-center gap-4">
                              <span className="flex items-center gap-1">
                                <User className="h-4 w-4" />
                                {ordem.recebimentos?.cliente_nome || ordem.cliente_nome}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {t('aprovados.approvedOn')}: {new Date(ordem.updated_at).toLocaleDateString('pt-BR')}
                              </span>
                            </CardDescription>
                          </div>
                        </div>
                        <Badge className={`${getEtapaColor(ordem.status)}`}>
                          {getEtapaText(ordem.status)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid md:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">{t('aprovados.deliveryDeadline')}</p>
                          <input type="date" className="text-lg font-semibold bg-transparent border-none text-center outline-none" defaultValue={ordem.tempo_estimado || ordem.prazo_entrega || ''} onChange={async e => {
                    // Salvar a data no banco
                    try {
                      const {
                        error
                      } = await supabase.from('ordens_servico').update({
                        tempo_estimado: e.target.value
                      }).eq('id', ordem.id);
                      if (!error) {
                        // Atualizar estado local para re-renderizar a cor da barra
                        loadOrdensAprovadas();
                      }
                    } catch (error) {
                      console.error('Erro ao salvar prazo:', error);
                    }
                  }} />
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">{t('aprovados.technician')}</p>
                          <p className="text-lg font-semibold">
                            {ordem.tecnico || t('aprovados.notAssigned')}
                          </p>
                        </div>
                      </div>

                      {ordem.observacoes_tecnicas && <div className="p-3 bg-muted/50 rounded-lg">
                          <h5 className="text-sm font-medium text-foreground mb-1">{t('aprovados.technicalNotes')}:</h5>
                          <p className="text-sm text-muted-foreground">{ordem.observacoes_tecnicas}</p>
                        </div>}

                      <div className="flex flex-wrap gap-2 pt-2">
                        {ordem.status === 'aprovada' ? <Button variant="outline" size="sm" onClick={() => iniciarProducao(ordem.id)}>
                            <Play className="h-4 w-4 mr-2" />
                            {t('aprovados.startProduction')}
                          </Button> : ordem.status === 'em_producao' ? (
                            ordem.recebimentos?.categoria_equipamento === 'cilindro' ? (
                              <TesteModal ordem={ordem} onTesteIniciado={() => loadOrdensAprovadas()}>
                                <Button variant="outline" size="sm">
                                  <Settings className="h-4 w-4 mr-2" />
                                  {t('aprovados.startTest')}
                                </Button>
                              </TesteModal>
                            ) : (
                              <>
                                <UploadFotosProducaoModal 
                                  ordem={ordem} 
                                  onUploadComplete={() => loadOrdensAprovadas()}
                                >
                                  <Button variant="outline" size="sm">
                                    <Camera className="h-4 w-4 mr-2" />
                                    {t('aprovados.equipmentPhotos')}
                                  </Button>
                                </UploadFotosProducaoModal>
                                <Button variant="outline" size="sm" onClick={() => {
                                  setOrdemSelecionada(ordem);
                                  setUploadModalOpen(true);
                                }}>
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  {t('aprovados.finalize')}
                                </Button>
                              </>
                            )
                          ) : ordem.status === 'em_teste' ? (
                            <>
                              <UploadVideoTesteModal 
                                ordem={ordem} 
                                onUploadComplete={() => loadOrdensAprovadas()}
                              >
                                <Button variant="outline" size="sm">
                                  <Video className="h-4 w-4 mr-2" />
                                  Upload Vídeo
                                </Button>
                              </UploadVideoTesteModal>
                              <Button variant="outline" size="sm" onClick={() => {
                                setOrdemSelecionada(ordem);
                                setUploadModalOpen(true);
                              }}>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                {t('aprovados.finalize')}
                              </Button>
                            </>
                          ) : null}
                        
                        <ItemSelectionModal title={t('compras.partsNeeded')} items={ordem.pecas_necessarias || []} type="pecas" ordemId={ordem.id}>
                          <Button variant="outline" size="sm">
                            <Package className="h-4 w-4 mr-2" />
                            {t('aprovados.parts')}
                          </Button>
                        </ItemSelectionModal>

                        <ItemSelectionModal title={t('compras.machiningNeeded')} items={ordem.usinagem_necessaria || []} type="usinagem" ordemId={ordem.id}>
                          <Button variant="outline" size="sm">
                            <Settings className="h-4 w-4 mr-2" />
                            {t('aprovados.machining')}
                          </Button>
                        </ItemSelectionModal>

                        <ItemSelectionModal title={t('aprovados.services')} items={ordem.servicos_necessarios || []} type="servicos" ordemId={ordem.id}>
                          <Button variant="outline" size="sm">
                            <Wrench className="h-4 w-4 mr-2" />
                            {t('aprovados.services')}
                          </Button>
                        </ItemSelectionModal>
                      </div>
                    </CardContent>
                  </Card>) : <Card>
                  <CardContent className="p-12 text-center">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <h3 className="text-lg font-medium text-foreground mb-2">Nenhuma Ordem em produção</h3>
                    <p className="text-muted-foreground">
                      Aprove análises técnicas para que apareçam aqui
                    </p>
                  </CardContent>
                </Card>}
            </div>
          </div>}

        {/* Modal de Upload do Produto Pronto */}
        {ordemSelecionada && <UploadProdutoProntoModal open={uploadModalOpen} onOpenChange={setUploadModalOpen} ordem={ordemSelecionada} onConfirm={async () => {
        try {
          // Determinar status baseado em recebimento_id (PRIORIDADE) e orcamento_id
          // Equipamentos físicos SEMPRE precisam de nota de retorno
          let novoStatus = 'finalizada';
          
          if (ordemSelecionada.recebimento_id) {
            // Se tem recebimento (equipamento físico), SEMPRE precisa de nota de retorno
            novoStatus = 'aguardando_retorno';
          } else if (ordemSelecionada.orcamento_id) {
            // Orçamento avulso sem entrada de equipamento físico
            novoStatus = 'finalizada';
          } else {
            // Sem orçamento e sem recebimento
            novoStatus = 'faturado';
          }
          
          const {
            error
          } = await supabase.from('ordens_servico').update({
            status: novoStatus
          }).eq('id', ordemSelecionada.id);
          if (error) throw error;

          // Enviar notificação via webhook da empresa
          const webhookUrl = getWebhookUrl();
          
          if (webhookUrl) {
            const notaFiscalEntrada = ordemSelecionada.recebimentos?.nota_fiscal || ordemSelecionada.recebimentos?.chave_acesso_nfe || 'n/a';
            const tipoNotificacao = ordemSelecionada.recebimento_id 
              ? 'ordem_retorno' 
              : ordemSelecionada.orcamento_id 
                ? 'ordem_finalizada' 
                : 'ordem_faturamento_sem_retorno';
            
            const payload = {
              tipo: tipoNotificacao,
              numero_ordem: ordemSelecionada.recebimentos?.numero_ordem || ordemSelecionada.numero_ordem,
              cliente: ordemSelecionada.recebimentos?.cliente_nome || ordemSelecionada.cliente_nome,
              equipamento: ordemSelecionada.equipamento,
              nota_fiscal_entrada: notaFiscalEntrada,
              data_finalizacao: format(new Date(), 'dd-MM-yyyy'),
              data_aprovacao: ordemSelecionada.updated_at ? format(parseISO(ordemSelecionada.updated_at), 'dd-MM-yyyy') : format(new Date(), 'dd-MM-yyyy'),
              empresa: empresaAtual?.nome || 'N/A'
            };

            const notificacaoEnviada = await enviarWebhook(webhookUrl, payload);

            if (!notificacaoEnviada) {
              toast({
                title: "Aviso",
                description: "Operação concluída, mas notificação não foi enviada após 3 tentativas.",
                variant: "destructive"
              });
            }
          } else {
            console.warn('⚠️ Webhook não configurado para esta empresa');
          }
          
          toast({
            title: "Ordem finalizada",
            description: "A ordem foi finalizada e enviada para faturamento"
          });
          loadOrdensAprovadas();
        } catch (error) {
          console.error('Erro ao finalizar ordem:', error);
          toast({
            title: "Erro",
            description: "Erro ao finalizar ordem",
            variant: "destructive"
          });
        }
      }} />}
      
      </div>
    </AppLayout>;
}