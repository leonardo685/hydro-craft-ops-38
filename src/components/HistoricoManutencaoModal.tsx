import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, FileText, TrendingUp, TrendingDown, Minus, Calendar, Wrench, AlertTriangle, Clock, X } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEmpresa } from "@/contexts/EmpresaContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { gerarPDFHistorico } from "@/lib/historico-pdf-utils";
import { format, differenceInDays, parseISO } from "date-fns";
import { ptBR, enUS } from "date-fns/locale";

interface HistoricoManutencaoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

export function HistoricoManutencaoModal({ open, onOpenChange }: HistoricoManutencaoModalProps) {
  const { toast } = useToast();
  const { empresaAtual } = useEmpresa();
  const { t, language } = useLanguage();
  const dateLocale = language === 'pt-BR' ? ptBR : enUS;
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [historico, setHistorico] = useState<ManutencaoHistorico[]>([]);
  const [searched, setSearched] = useState(false);
  const [buscasRecentes, setBuscasRecentes] = useState<string[]>([]);

  const STORAGE_KEY = 'historico-manutencao-buscas-recentes';

  // Carregar buscas recentes do localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setBuscasRecentes(JSON.parse(saved));
      } catch {
        setBuscasRecentes([]);
      }
    }
  }, []);

  // Salvar busca recente
  const salvarBuscaRecente = (termo: string) => {
    const normalizado = normalizarNumeroOrdem(termo);
    const novaLista = [normalizado, ...buscasRecentes.filter(b => b !== normalizado)].slice(0, 5);
    setBuscasRecentes(novaLista);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(novaLista));
  };

  // Limpar uma busca recente
  const removerBuscaRecente = (termo: string) => {
    const novaLista = buscasRecentes.filter(b => b !== termo);
    setBuscasRecentes(novaLista);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(novaLista));
  };

  // Normaliza o número da ordem (ex: "1-25" -> "MH-001-25")
  const normalizarNumeroOrdem = (input: string): string => {
    const limpo = input.trim().toUpperCase().replace(/^MH-?/i, '');
    const match = limpo.match(/^(\d+)-(\d+)$/);
    if (match) {
      const numero = match[1].padStart(3, '0');
      const ano = match[2];
      return `MH-${numero}-${ano}`;
    }
    return `MH-${limpo}`;
  };

  const buscarHistorico = async (termoBusca?: string) => {
    const termo = termoBusca || searchTerm;
    if (!termo.trim()) {
      toast({
        title: t('historicoManutencao.enterOrderNumber'),
        description: t('historicoManutencao.enterOrderNumberDesc'),
        variant: "destructive",
      });
      return;
    }

    const numeroNormalizado = normalizarNumeroOrdem(termo);
    salvarBuscaRecente(termo);

    setLoading(true);
    setSearched(true);

    try {
      // Primeiro buscar a ordem digitada
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
        .ilike('numero_ordem', `%${numeroNormalizado}%`)
        .limit(1)
        .maybeSingle();

      if (erroOrdemInicial) throw erroOrdemInicial;

      if (!ordemInicial) {
        setHistorico([]);
        toast({
          title: t('historicoManutencao.orderNotFound'),
          description: t('historicoManutencao.orderNotFoundDesc'),
          variant: "destructive",
        });
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

          // Buscar ordem anterior recursivamente
          if (ordemAnteriorDaOrdem) {
            await buscarAnterior(ordemAnteriorDaOrdem);
          }
        }
      };

      // Função para buscar ordens posteriores (que referenciam esta ordem)
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

                // Buscar posteriores recursivamente
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
        // Dias no serviço
        if (item.data_finalizacao) {
          item.dias_no_servico = differenceInDays(
            parseISO(item.data_finalizacao),
            parseISO(item.data_entrada)
          );
        }

        // Dias desde última manutenção
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

      if (historicoCompleto.length === 1) {
        toast({
          title: t('historicoManutencao.historyFound'),
          description: t('historicoManutencao.firstMaintenance'),
        });
      } else {
        toast({
          title: t('historicoManutencao.historyFound'),
          description: t('historicoManutencao.maintenancesFound').replace('{count}', String(historicoCompleto.length)),
        });
      }
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
      toast({
        title: t('historicoManutencao.searchError'),
        description: t('historicoManutencao.searchErrorDesc'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGerarPDF = async () => {
    if (historico.length === 0) return;
    
    try {
      await gerarPDFHistorico(historico, empresaAtual);
      toast({
        title: t('historicoManutencao.pdfGenerated'),
        description: t('historicoManutencao.pdfGeneratedDesc'),
      });
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast({
        title: t('historicoManutencao.pdfError'),
        description: t('historicoManutencao.pdfErrorDesc'),
        variant: "destructive",
      });
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
  const dadosGrafico = historico.map((item, index) => ({
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
            {t('historicoManutencao.title')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Busca */}
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="searchOrdem">{t('historicoManutencao.orderNumber')}</Label>
              <div className="flex gap-2 mt-1">
                <div className="flex flex-1">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-sm font-medium">
                    MH-
                  </span>
                  <Input
                    id="searchOrdem"
                    className="rounded-l-none"
                    placeholder="001-25 ou 1-25"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && buscarHistorico()}
                  />
                </div>
                <Button onClick={() => buscarHistorico()} disabled={loading}>
                  <Search className="h-4 w-4 mr-2" />
                  {loading ? t('historicoManutencao.searching') : t('historicoManutencao.search')}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {t('historicoManutencao.typeNumberHint')}
              </p>
            </div>
          </div>

          {/* Buscas Recentes */}
          {buscasRecentes.length > 0 && !searched && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {t('historicoManutencao.recentSearches')}:
              </span>
              {buscasRecentes.map((busca) => (
                <Badge
                  key={busca}
                  variant="secondary"
                  className="cursor-pointer hover:bg-secondary/80 group pr-1"
                  onClick={() => buscarHistorico(busca)}
                >
                  {busca}
                  <button
                    className="ml-1 opacity-50 hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      removerBuscaRecente(busca);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          {/* Resultados */}
          {searched && historico.length === 0 && !loading && (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center">
                <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">{t('historicoManutencao.noHistoryFoundOrder')}</p>
              </CardContent>
            </Card>
          )}

          {historico.length > 0 && (
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
                    <div className="text-2xl font-bold">
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
                      <LineChart data={dadosGrafico}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          dataKey="name" 
                          fontSize={12} 
                          tick={{ fill: 'hsl(var(--foreground))' }}
                          axisLine={{ stroke: 'hsl(var(--border))' }}
                        />
                        <YAxis 
                          fontSize={12} 
                          tick={{ fill: 'hsl(var(--foreground))' }}
                          axisLine={{ stroke: 'hsl(var(--border))' }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                        <Legend />
                        <Line 
                          type="monotone"
                          dataKey="diasEntreManutencoes" 
                          name={t('historicoManutencao.daysToReturn')}
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }}
                          activeDot={{ r: 6, fill: 'hsl(var(--primary))' }}
                        />
                        <Line 
                          type="monotone"
                          dataKey="diasNoServico" 
                          name={t('historicoManutencao.daysInService')}
                          stroke="hsl(var(--muted-foreground))"
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          dot={{ fill: 'hsl(var(--muted-foreground))', strokeWidth: 2 }}
                          activeDot={{ r: 6, fill: 'hsl(var(--muted-foreground))' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Timeline */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-sm">{t('historicoManutencao.maintenanceTimeline')}</CardTitle>
                  <Button onClick={handleGerarPDF} variant="outline" size="sm">
                    <FileText className="h-4 w-4 mr-2" />
                    {t('historicoManutencao.generatePdf')}
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {historico.map((item, index) => (
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
                          
                          {item.motivo_falha && (
                            <div className="mt-2 p-2 bg-amber-100 dark:bg-amber-950/30 rounded border border-amber-200 dark:border-amber-800">
                              <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">{t('historicoManutencao.failureReason')}:</span>
                              <p className="text-sm text-foreground">{item.motivo_falha}</p>
                            </div>
                          )}
                          
                          {item.ordem_anterior && (
                            <p className="text-xs text-muted-foreground mt-2">
                              {t('historicoManutencao.previousOrder')}: {item.ordem_anterior}
                            </p>
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
