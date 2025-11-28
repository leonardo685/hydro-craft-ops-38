import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Play, Package, Truck, FileText, Calendar, User, Settings, Wrench, RotateCw, Camera } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ItemSelectionModal } from "@/components/ItemSelectionModal";
import { TesteModal } from "@/components/TesteModal";
import { UploadProdutoProntoModal } from "@/components/UploadProdutoProntoModal";
import { UploadFotosProducaoModal } from "@/components/UploadFotosProducaoModal";
import { OrdemServicoModal } from "@/components/OrdemServicoModal";
import { useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";

export default function Aprovados() {
  const [ordensServico, setOrdensServico] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [ordensEmProducao, setOrdensEmProducao] = useState<Set<string>>(new Set());
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [ordemSelecionada, setOrdemSelecionada] = useState<any>(null);
  const {
    toast
  } = useToast();
  const navigate = useNavigate();
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
        title: "Produção iniciada",
        description: "Ordem de serviço está agora em produção"
      });
      loadOrdensAprovadas();
    } catch (error) {
      console.error('Erro ao iniciar produção:', error);
      toast({
        title: "Erro",
        description: "Erro ao iniciar produção",
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
        return "Aguardando Início";
      case "em_producao":
        return "Em Produção";
      case "em_teste":
        return "Em Teste";
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
            <h2 className="text-2xl font-bold text-foreground">Ordens Aprovadas</h2>
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

        {loading ? <div className="text-center py-8">Carregando...</div> : <div className="space-y-4">
            <div>
              <h3 className="text-xl font-semibold text-foreground">Ordens em Produção</h3>
              <p className="text-muted-foreground">
                Análises técnicas aprovadas e em diferentes etapas de produção ({ordensServico.length})
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
                                Aprovado em: {new Date(ordem.updated_at).toLocaleDateString('pt-BR')}
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
                          <p className="text-sm text-muted-foreground">Prazo de Entrega</p>
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
                          <p className="text-sm text-muted-foreground">Técnico</p>
                          <p className="text-lg font-semibold">
                            {ordem.tecnico || 'Não atribuído'}
                          </p>
                        </div>
                      </div>

                      {ordem.observacoes_tecnicas && <div className="p-3 bg-muted/50 rounded-lg">
                          <h5 className="text-sm font-medium text-foreground mb-1">Observações Técnicas:</h5>
                          <p className="text-sm text-muted-foreground">{ordem.observacoes_tecnicas}</p>
                        </div>}

                      <div className="flex flex-wrap gap-2 pt-2">
                        {ordem.status === 'aprovada' ? <Button variant="outline" size="sm" onClick={() => iniciarProducao(ordem.id)}>
                            <Play className="h-4 w-4 mr-2" />
                            Iniciar Produção
                          </Button> : ordem.status === 'em_producao' ? (
                            ordem.recebimentos?.categoria_equipamento === 'cilindro' ? (
                              <TesteModal ordem={ordem} onTesteIniciado={() => loadOrdensAprovadas()}>
                                <Button variant="outline" size="sm">
                                  <Settings className="h-4 w-4 mr-2" />
                                  Iniciar Teste
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
                                    Fotos do Equip.
                                  </Button>
                                </UploadFotosProducaoModal>
                                <Button variant="outline" size="sm" onClick={() => {
                                  setOrdemSelecionada(ordem);
                                  setUploadModalOpen(true);
                                }}>
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Finalizar
                                </Button>
                              </>
                            )
                          ) : ordem.status === 'em_teste' ? <Button variant="outline" size="sm" onClick={() => {
                  setOrdemSelecionada(ordem);
                  setUploadModalOpen(true);
                }}>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Finalizar
                          </Button> : null}
                        
                        <ItemSelectionModal title="Peças Necessárias" items={ordem.pecas_necessarias || []} type="pecas" ordemId={ordem.id}>
                          <Button variant="outline" size="sm">
                            <Package className="h-4 w-4 mr-2" />
                            Peças
                          </Button>
                        </ItemSelectionModal>

                        <ItemSelectionModal title="Usinagem Necessária" items={ordem.usinagem_necessaria || []} type="usinagem" ordemId={ordem.id}>
                          <Button variant="outline" size="sm">
                            <Settings className="h-4 w-4 mr-2" />
                            Usinagem
                          </Button>
                        </ItemSelectionModal>

                        <ItemSelectionModal title="Serviços Necessários" items={ordem.servicos_necessarios || []} type="servicos" ordemId={ordem.id}>
                          <Button variant="outline" size="sm">
                            <Wrench className="h-4 w-4 mr-2" />
                            Serviços
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
          // Determinar status baseado em orcamento_id e recebimento_id
          let novoStatus = 'finalizada';
          
          if (ordemSelecionada.orcamento_id) {
            // Se tem orçamento vinculado, vai direto para finalizada
            novoStatus = 'finalizada';
          } else if (!ordemSelecionada.recebimento_id) {
            // Sem orçamento e sem recebimento, vai para faturado (precisa emitir NF de retorno)
            novoStatus = 'faturado';
          } else {
            // Com recebimento mas sem orçamento, vai para aguardando retorno
            novoStatus = 'aguardando_retorno';
          }
          
          const {
            error
          } = await supabase.from('ordens_servico').update({
            status: novoStatus
          }).eq('id', ordemSelecionada.id);
          if (error) throw error;

          // Enviar notificação para o n8n/Telegram com retry
          const maxTentativas = 3;
          const intervaloRetry = 2000; // 2 segundos
          let notificacaoEnviada = false;

          const notaFiscalEntrada = ordemSelecionada.recebimentos?.nota_fiscal || ordemSelecionada.recebimentos?.chave_acesso_nfe || 'n/a';
          const tipoNotificacao = ordemSelecionada.orcamento_id 
            ? 'ordem_finalizada' 
            : ordemSelecionada.recebimento_id 
              ? 'ordem_retorno' 
              : 'ordem_faturamento_sem_retorno';
          
          const payload = {
            tipo: tipoNotificacao,
            numero_ordem: ordemSelecionada.recebimentos?.numero_ordem || ordemSelecionada.numero_ordem,
            cliente: ordemSelecionada.recebimentos?.cliente_nome || ordemSelecionada.cliente_nome,
            equipamento: ordemSelecionada.equipamento,
            nota_fiscal_entrada: notaFiscalEntrada,
            data_finalizacao: format(new Date(), 'dd-MM-yyyy'),
            data_aprovacao: ordemSelecionada.updated_at ? format(parseISO(ordemSelecionada.updated_at), 'dd-MM-yyyy') : format(new Date(), 'dd-MM-yyyy')
          };

          for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
            try {
              console.log(`📤 Tentativa ${tentativa}/${maxTentativas} de envio da notificação...`);
              
              const webhookResponse = await fetch('https://primary-production-dc42.up.railway.app/webhook/f2cabfd9-4e4c-4dd0-802a-b27c4b0c9d17', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
              });

              if (webhookResponse.ok) {
                notificacaoEnviada = true;
                console.log('✅ Notificação de faturamento enviada com sucesso na tentativa', tentativa);
                break;
              } else {
                console.error(`❌ Tentativa ${tentativa} falhou com status:`, webhookResponse.status);
                if (tentativa < maxTentativas) {
                  console.log(`⏳ Aguardando ${intervaloRetry/1000}s antes da próxima tentativa...`);
                  await new Promise(resolve => setTimeout(resolve, intervaloRetry));
                }
              }
            } catch (webhookError) {
              console.error(`❌ Erro na tentativa ${tentativa}:`, webhookError);
              if (tentativa < maxTentativas) {
                console.log(`⏳ Aguardando ${intervaloRetry/1000}s antes da próxima tentativa...`);
                await new Promise(resolve => setTimeout(resolve, intervaloRetry));
              }
            }
          }

          if (!notificacaoEnviada) {
            toast({
              title: "Aviso",
              description: `Operação concluída, mas notificação não foi enviada após ${maxTentativas} tentativas.`,
              variant: "destructive"
            });
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