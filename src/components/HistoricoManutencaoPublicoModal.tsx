import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Wrench, AlertTriangle } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format, differenceInDays, parseISO } from "date-fns";
import { ptBR, enUS } from "date-fns/locale";
import { useLanguage } from "@/contexts/LanguageContext";

interface HistoricoManutencaoPublicoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  numeroOrdem: string;
}

interface ManutencaoHistorico {
  id: string;
  numero_ordem: string;
  cliente_nome: string;
  equipamento: string;
  data_entrada: string;
  data_finalizacao: string | null;
  motivo_falha: string | null;
  status: string;
  ordem_anterior: string | null;
  dias_no_servico: number | null;
  dias_desde_ultima: number | null;
}

export function HistoricoManutencaoPublicoModal({ open, onOpenChange, numeroOrdem }: HistoricoManutencaoPublicoModalProps) {
  const { t, language } = useLanguage();
  const dateLocale = language === 'pt-BR' ? ptBR : enUS;
  const [loading, setLoading] = useState(false);
  const [historico, setHistorico] = useState<ManutencaoHistorico[]>([]);

  useEffect(() => {
    if (open && numeroOrdem) {
      buscarHistorico();
    }
  }, [open, numeroOrdem]);

  const buscarHistorico = async () => {
    if (!numeroOrdem) return;

    setLoading(true);

    try {
      // Primeiro buscar a ordem pelo numero_ordem
      const { data: ordemInicial, error: erroOrdemInicial } = await supabase
        .from('ordens_servico')
        .select(`
          id,
          numero_ordem,
          cliente_nome,
          equipamento,
          data_entrada,
          data_finalizacao,
          motivo_falha,
          status,
          recebimento_id
        `)
        .eq('numero_ordem', numeroOrdem)
        .maybeSingle();

      if (erroOrdemInicial || !ordemInicial) {
        setHistorico([]);
        setLoading(false);
        return;
      }

      // Buscar ordem_anterior do recebimento
      let ordemAnterior: string | null = null;
      if (ordemInicial.recebimento_id) {
        const { data: recebimento } = await supabase
          .from('recebimentos')
          .select('ordem_anterior')
          .eq('id', ordemInicial.recebimento_id)
          .maybeSingle();
        ordemAnterior = recebimento?.ordem_anterior || null;
      }

      // Montar cadeia de manutenções
      const historicoCompleto: ManutencaoHistorico[] = [];
      const ordensProcessadas = new Set<string>();

      // Função recursiva para buscar ordens anteriores
      const buscarAnterior = async (numOrdem: string): Promise<void> => {
        if (ordensProcessadas.has(numOrdem)) return;

        const { data: ordem } = await supabase
          .from('ordens_servico')
          .select(`
            id,
            numero_ordem,
            cliente_nome,
            equipamento,
            data_entrada,
            data_finalizacao,
            motivo_falha,
            status,
            recebimento_id
          `)
          .ilike('numero_ordem', numOrdem)
          .maybeSingle();

        if (ordem) {
          ordensProcessadas.add(ordem.numero_ordem);

          let ordemAnteriorDaOrdem: string | null = null;
          if (ordem.recebimento_id) {
            const { data: rec } = await supabase
              .from('recebimentos')
              .select('ordem_anterior')
              .eq('id', ordem.recebimento_id)
              .maybeSingle();
            ordemAnteriorDaOrdem = rec?.ordem_anterior || null;
          }

          historicoCompleto.push({
            id: ordem.id,
            numero_ordem: ordem.numero_ordem,
            cliente_nome: ordem.cliente_nome,
            equipamento: ordem.equipamento,
            data_entrada: ordem.data_entrada,
            data_finalizacao: ordem.data_finalizacao,
            motivo_falha: ordem.motivo_falha,
            status: ordem.status,
            ordem_anterior: ordemAnteriorDaOrdem,
            dias_no_servico: null,
            dias_desde_ultima: null,
          });

          if (ordemAnteriorDaOrdem) {
            await buscarAnterior(ordemAnteriorDaOrdem);
          }
        }
      };

      // Função para buscar ordens posteriores
      const buscarPosteriores = async (numOrdem: string): Promise<void> => {
        const { data: recebimentos } = await supabase
          .from('recebimentos')
          .select('id, ordem_anterior, numero_ordem')
          .ilike('ordem_anterior', numOrdem);

        if (recebimentos && recebimentos.length > 0) {
          for (const rec of recebimentos) {
            if (!ordensProcessadas.has(rec.numero_ordem)) {
              const { data: ordem } = await supabase
                .from('ordens_servico')
                .select(`
                  id,
                  numero_ordem,
                  cliente_nome,
                  equipamento,
                  data_entrada,
                  data_finalizacao,
                  motivo_falha,
                  status,
                  recebimento_id
                `)
                .eq('recebimento_id', rec.id)
                .maybeSingle();

              if (ordem && !ordensProcessadas.has(ordem.numero_ordem)) {
                ordensProcessadas.add(ordem.numero_ordem);
                historicoCompleto.push({
                  id: ordem.id,
                  numero_ordem: ordem.numero_ordem,
                  cliente_nome: ordem.cliente_nome,
                  equipamento: ordem.equipamento,
                  data_entrada: ordem.data_entrada,
                  data_finalizacao: ordem.data_finalizacao,
                  motivo_falha: ordem.motivo_falha,
                  status: ordem.status,
                  ordem_anterior: rec.ordem_anterior,
                  dias_no_servico: null,
                  dias_desde_ultima: null,
                });

                await buscarPosteriores(ordem.numero_ordem);
              }
            }
          }
        }
      };

      // Adicionar ordem inicial
      historicoCompleto.push({
        id: ordemInicial.id,
        numero_ordem: ordemInicial.numero_ordem,
        cliente_nome: ordemInicial.cliente_nome,
        equipamento: ordemInicial.equipamento,
        data_entrada: ordemInicial.data_entrada,
        data_finalizacao: ordemInicial.data_finalizacao,
        motivo_falha: ordemInicial.motivo_falha,
        status: ordemInicial.status,
        ordem_anterior: ordemAnterior,
        dias_no_servico: null,
        dias_desde_ultima: null,
      });
      ordensProcessadas.add(ordemInicial.numero_ordem);

      // Buscar anteriores
      if (ordemAnterior) {
        await buscarAnterior(ordemAnterior);
      }

      // Buscar posteriores
      await buscarPosteriores(ordemInicial.numero_ordem);

      // Ordenar por data de entrada (mais antiga primeiro)
      historicoCompleto.sort((a, b) => 
        new Date(a.data_entrada).getTime() - new Date(b.data_entrada).getTime()
      );

      // Calcular dias no serviço e dias desde última manutenção
      historicoCompleto.forEach((item, index) => {
        if (item.data_finalizacao) {
          item.dias_no_servico = differenceInDays(
            parseISO(item.data_finalizacao),
            parseISO(item.data_entrada)
          );
        }

        if (index > 0) {
          const ordemAnteriorItem = historicoCompleto[index - 1];
          const dataAnterior = ordemAnteriorItem.data_finalizacao || ordemAnteriorItem.data_entrada;
          item.dias_desde_ultima = differenceInDays(
            parseISO(item.data_entrada),
            parseISO(dataAnterior)
          );
        }
      });

      setHistorico(historicoCompleto);
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      recebido: { label: t('historicoManutencao.received'), variant: "secondary" },
      em_andamento: { label: t('historicoManutencao.inProgress'), variant: "default" },
      aguardando_orcamento: { label: t('historicoManutencao.awaitingQuote'), variant: "outline" },
      aguardando_aprovacao: { label: t('historicoManutencao.awaitingApproval'), variant: "outline" },
      aprovada: { label: t('historicoManutencao.approved'), variant: "default" },
      em_producao: { label: t('historicoManutencao.inProduction'), variant: "default" },
      finalizada: { label: t('historicoManutencao.finished'), variant: "secondary" },
      aguardando_retorno: { label: t('historicoManutencao.awaitingReturn'), variant: "secondary" },
      faturado: { label: t('historicoManutencao.billed'), variant: "secondary" },
      reprovada: { label: t('historicoManutencao.rejected'), variant: "destructive" },
    };
    
    const config = statusMap[status] || { label: status, variant: "outline" as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getTendencia = () => {
    if (historico.length < 2) return null;
    
    const temposEntreManutenções = historico
      .filter(h => h.dias_desde_ultima !== null)
      .map(h => h.dias_desde_ultima as number);
    
    if (temposEntreManutenções.length < 2) return null;
    
    const ultimo = temposEntreManutenções[temposEntreManutenções.length - 1];
    const penultimo = temposEntreManutenções[temposEntreManutenções.length - 2];
    
    if (ultimo > penultimo) return "aumentando";
    if (ultimo < penultimo) return "diminuindo";
    return "estavel";
  };

  const tendencia = getTendencia();

  // Dados para o gráfico
  const dadosGrafico = historico.map((item) => ({
    name: item.numero_ordem,
    diasEntreManutencoes: item.dias_desde_ultima || 0,
    diasNoServico: item.dias_no_servico || 0,
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            {t('historicoManutencao.title')} - {numeroOrdem}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}

          {!loading && historico.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center">
                <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">{t('historicoManutencao.noHistoryFound')}</p>
              </CardContent>
            </Card>
          )}

          {!loading && historico.length > 0 && (
            <>
              {/* Resumo */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold">{historico.length}</div>
                    <p className="text-sm text-muted-foreground">{t('historicoManutencao.registeredMaintenances')}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold truncate">
                      {historico[0]?.cliente_nome || "-"}
                    </div>
                    <p className="text-sm text-muted-foreground">{t('historicoManutencao.client')}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      {tendencia === "aumentando" && (
                        <>
                          <TrendingUp className="h-6 w-6 text-green-500" />
                          <span className="text-lg font-medium text-green-600">{t('historicoManutencao.timeIncreasing')}</span>
                        </>
                      )}
                      {tendencia === "diminuindo" && (
                        <>
                          <TrendingDown className="h-6 w-6 text-red-500" />
                          <span className="text-lg font-medium text-red-600">{t('historicoManutencao.timeDecreasing')}</span>
                        </>
                      )}
                      {tendencia === "estavel" && (
                        <>
                          <Minus className="h-6 w-6 text-yellow-500" />
                          <span className="text-lg font-medium text-yellow-600">{t('historicoManutencao.timeStable')}</span>
                        </>
                      )}
                      {!tendencia && (
                        <span className="text-lg font-medium text-muted-foreground">-</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{t('historicoManutencao.trendBetweenReforms')}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Gráfico */}
              {historico.length > 1 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">{t('historicoManutencao.timeBetweenMaintenances')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={dadosGrafico}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" fontSize={12} />
                        <YAxis fontSize={12} />
                        <Tooltip />
                        <Legend />
                        <Bar 
                          dataKey="diasEntreManutencoes" 
                          name={t('historicoManutencao.daysToReturn')}
                          fill="hsl(var(--primary))"
                        />
                        <Bar 
                          dataKey="diasNoServico" 
                          name={t('historicoManutencao.daysInService')}
                          fill="hsl(var(--muted-foreground))"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">{t('historicoManutencao.maintenanceTimeline')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {historico.map((item) => (
                      <div key={item.id} className="relative pl-6 pb-4 border-l-2 border-muted last:border-l-0">
                        <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-primary" />
                        
                        <div className="bg-muted/30 rounded-lg p-4 ml-2">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-primary">{item.numero_ordem}</span>
                            {getStatusBadge(item.status)}
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">{t('historicoManutencao.entry')}:</span>
                              <p className="font-medium">
                                {format(parseISO(item.data_entrada), "dd/MM/yyyy", { locale: dateLocale })}
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">{t('historicoManutencao.exit')}:</span>
                              <p className="font-medium">
                                {item.data_finalizacao 
                                  ? format(parseISO(item.data_finalizacao), "dd/MM/yyyy", { locale: dateLocale })
                                  : "-"
                                }
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">{t('historicoManutencao.daysInService')}:</span>
                              <p className="font-medium">
                                {item.dias_no_servico !== null ? `${item.dias_no_servico} ${t('historicoManutencao.days')}` : "-"}
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">{t('historicoManutencao.daysSinceLast')}:</span>
                              <p className="font-medium">
                                {item.dias_desde_ultima !== null ? `${item.dias_desde_ultima} ${t('historicoManutencao.days')}` : "-"}
                              </p>
                            </div>
                          </div>
                          
                          {item.ordem_anterior && (
                            <p className="text-xs text-muted-foreground mt-2">
                              {t('historicoManutencao.previousOrder')}: {item.ordem_anterior}
                            </p>
                          )}
                          
                          {item.motivo_falha && (
                            <div className="mt-2 p-2 bg-amber-100 dark:bg-amber-950/30 rounded border border-amber-200 dark:border-amber-800">
                              <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">{t('historicoManutencao.failureReason')}:</span>
                              <p className="text-sm text-foreground">{item.motivo_falha}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
