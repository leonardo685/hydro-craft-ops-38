import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabasePublico as supabase, setOrdemPublica } from "@/integrations/supabase/ordemPublicaClient";
import { toast } from "sonner";
import defaultLogo from "@/assets/mec-hidro-logo-atualizado.jpg";
import { gerarLaudoPublicoModerno } from "@/lib/laudo-moderno-pdf";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  FileText, 
  Download, 
  CheckCircle, 
  XCircle, 
  Calendar,
  Building2,
  Wrench,
  Video,
  Gauge,
  Thermometer,
  Clock,
  FileCheck,
  TrendingUp,
  BarChart3,
  AlertTriangle,
  Globe
} from "lucide-react";
import { format } from "date-fns";
import { ptBR, enUS } from "date-fns/locale";
import { HistoricoManutencaoPublicoModal } from "@/components/HistoricoManutencaoPublicoModal";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageSelectorDropdown } from "@/components/LanguageSelectorDropdown";
import { translateTerm } from "@/i18n/dynamicTerms";

interface OrdemServico {
  id: string;
  numero_ordem: string;
  cliente_nome: string;
  equipamento: string;
  data_entrada: string;
  data_analise: string | null;
  status: string;
  empresa_id: string | null;
  pecas_necessarias: any;
  servicos_necessarios: any;
  usinagem_necessaria: any;
  motivo_falha: string | null;
  laudo_tecnico: string | null;
  laudo_tecnico_en: string | null;
  recebimento_id: number | null;
  recebimentos?: {
    numero_ordem: string;
  };
}

interface TesteEquipamento {
  id: string;
  tipo_teste: string;
  resultado_teste: string;
  data_hora_teste: string;
  pressao_teste: string | null;
  temperatura_operacao: string | null;
  check_vazamento_pistao: boolean | null;
  check_vazamento_vedacoes_estaticas: boolean | null;
  check_vazamento_haste: boolean | null;
  check_ok: boolean | null;
  observacoes_teste: string | null;
  video_url: string | null;
  curso: string | null;
  qtd_ciclos: string | null;
  pressao_maxima_trabalho: string | null;
  tempo_minutos: string | null;
  pressao_avanco: string | null;
  pressao_retorno: string | null;
  teste_performance_pr004: string | null;
  espessura_camada: string | null;
  observacao: string | null;
}

interface FotoEquipamento {
  id: string;
  arquivo_url: string;
  nome_arquivo: string;
}

interface DadosDimensionais {
  camisa: string | null;
  curso: string | null;
  haste_comprimento: string | null;
  conexao_a: string | null;
  conexao_b: string | null;
  pressao_trabalho: string | null;
  temperatura_trabalho: string | null;
  fluido_trabalho: string | null;
  ambiente_trabalho: string | null;
  potencia: string | null;
}

interface EmpresaData {
  logo_url: string | null;
  razao_social: string | null;
  nome: string;
  cnpj: string | null;
  telefone: string | null;
  email: string | null;
  tipo_identificacao: string | null;
}

// Função para verificar se ordem está finalizada
const verificarOrdemFinalizada = async (ordemId: string, recebimentoId: number | null): Promise<boolean> => {
  const { data: teste } = await supabase
    .from("testes_equipamentos")
    .select("id")
    .eq("ordem_servico_id", ordemId)
    .limit(1);
  if (teste && teste.length > 0) return true;

  if (recebimentoId) {
    const { data: recebimento } = await supabase
      .from("recebimentos")
      .select("pdf_nota_retorno")
      .eq("id", recebimentoId)
      .maybeSingle();
    if (recebimento?.pdf_nota_retorno) return true;
  }

  const { data: fotos } = await supabase
    .from("fotos_equipamentos")
    .select("id")
    .eq("ordem_servico_id", ordemId)
    .limit(1);
  return fotos && fotos.length > 0;
};

// Função para encontrar a ordem correta (prioriza finalizada)
const encontrarOrdemCorreta = async (
  ordens: Array<OrdemServico & { recebimento_id: number | null }>
): Promise<OrdemServico | null> => {
  if (!ordens || ordens.length === 0) return null;
  if (ordens.length === 1) return ordens[0];
  
  for (const ordem of ordens) {
    const finalizada = await verificarOrdemFinalizada(ordem.id, ordem.recebimento_id);
    if (finalizada) return ordem;
  }
  return ordens[0];
};

export default function LaudoPublico() {
  const { numeroOrdem } = useParams<{ numeroOrdem: string }>();
  setOrdemPublica(numeroOrdem);
  const [searchParams] = useSearchParams();
  const ordemIdParam = searchParams.get('ordemId');
  // Empresa do QR Code: o mesmo número de ordem pode existir em empresas diferentes
  const empresaIdParam = searchParams.get('e');
  const navigate = useNavigate();
  const { t, language, setLanguage } = useLanguage();
  /** Traduz conteúdo dinâmico (peças, serviços, usinagem) mantendo números e códigos */
  const tr = (v: string | null | undefined) => translateTerm(v, language);
  const dateLocale = language === 'pt-BR' ? ptBR : enUS;
  const [loading, setLoading] = useState(true);
  const [ordemServico, setOrdemServico] = useState<OrdemServico | null>(null);
  const [teste, setTeste] = useState<TesteEquipamento | null>(null);
  const [fotos, setFotos] = useState<FotoEquipamento[]>([]);
  const [empresaLogo, setEmpresaLogo] = useState<string | null>(null);
  const [empresaData, setEmpresaData] = useState<EmpresaData | null>(null);
  const [dadosDimensionais, setDadosDimensionais] = useState<DadosDimensionais | null>(null);
  const [historicoModalOpen, setHistoricoModalOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const verificarAcessoECarregarDados = async () => {
      if (!numeroOrdem) {
        toast.error(t('laudoPublico.orderNumberNotFound'));
        navigate("/");
        return;
      }

      try {
        let ordem: OrdemServico | null = null;

        if (ordemIdParam) {
          // Acesso interno (via Aprovados): buscar pelo ID específico da ordem
          const { data: ordemById, error: ordemByIdError } = await supabase
            .from("ordens_servico")
            .select(`
              *,
              recebimentos(numero_ordem)
            `)
            .eq("id", ordemIdParam)
            .maybeSingle();

          if (ordemByIdError) throw ordemByIdError;
          ordem = ordemById;
        } else {
          // Acesso externo (QR code/link público): buscar por numero_ordem
          let ordensQuery = supabase
            .from("ordens_servico")
            .select(`
              *,
              recebimentos(numero_ordem)
            `)
            .eq("numero_ordem", numeroOrdem);
          if (empresaIdParam) ordensQuery = ordensQuery.eq("empresa_id", empresaIdParam);

          const { data: ordensServico, error: ordemError } = await ordensQuery;

          if (ordemError) throw ordemError;

          // Encontrar a ordem correta (prioriza finalizada)
          ordem = await encontrarOrdemCorreta(ordensServico || []);
        }

        if (!ordem) {
          toast.error(t('laudoPublico.orderNotFound'));
          navigate("/");
          return;
        }

        // Buscar recebimento se existir (para verificar nota de retorno e dados dimensionais)
        let pdfNotaRetorno = null;
        let recebimentoId = null;
        if (ordem.recebimento_id) {
          const { data: recebimento } = await supabase
            .from("recebimentos")
            .select("id, pdf_nota_retorno, camisa, curso, haste_comprimento, conexao_a, conexao_b, pressao_trabalho, temperatura_trabalho, fluido_trabalho, ambiente_trabalho, potencia")
            .eq("id", ordem.recebimento_id)
            .maybeSingle();
          
          pdfNotaRetorno = recebimento?.pdf_nota_retorno;
          recebimentoId = recebimento?.id;
          
          // Salvar dados dimensionais
          if (recebimento) {
            setDadosDimensionais({
              camisa: recebimento.camisa,
              curso: recebimento.curso,
              haste_comprimento: recebimento.haste_comprimento,
              conexao_a: recebimento.conexao_a,
              conexao_b: recebimento.conexao_b,
              pressao_trabalho: recebimento.pressao_trabalho,
              temperatura_trabalho: recebimento.temperatura_trabalho,
              fluido_trabalho: recebimento.fluido_trabalho,
              ambiente_trabalho: recebimento.ambiente_trabalho,
              potencia: recebimento.potencia
            });
          }
        }

        // Verificar se existe laudo técnico criado (teste) para a ordem
        const { data: testeCheck, error: testeCheckError } = await supabase
          .from("testes_equipamentos")
          .select("id")
          .eq("ordem_servico_id", ordem.id)
          .maybeSingle();

        if (testeCheckError) throw testeCheckError;

        // Buscar fotos da ordem para verificar se existe alguma
        const { data: fotosOrdemCheck } = await supabase
          .from("fotos_equipamentos")
          .select("id")
          .eq("ordem_servico_id", ordem.id)
          .limit(1);

        const temFotos = fotosOrdemCheck && fotosOrdemCheck.length > 0;

        // Se não existe laudo técnico, nota de retorno NEM fotos, ordem não está pronta
        if (!testeCheck && !pdfNotaRetorno && !temFotos) {
          toast.error(t('laudoPublico.orderNotFinished'));
          navigate("/");
          return;
        }

        setOrdemServico(ordem);

        // Buscar teste do equipamento
        const { data: testeData, error: testeError } = await supabase
          .from("testes_equipamentos")
          .select("*")
          .eq("ordem_servico_id", ordem.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (testeError) throw testeError;

        setTeste(testeData);

        // Buscar fotos do equipamento (pelo recebimento E pela ordem de serviço)
        let fotosData = [];
        
        // Primeiro busca por recebimento_id
        if (recebimentoId) {
          const { data: fotos } = await supabase
            .from("fotos_equipamentos")
            .select("id, arquivo_url, nome_arquivo, legenda")
            .eq("recebimento_id", recebimentoId);

          fotosData = fotos || [];
        }

        // Depois busca por ordem_servico_id (fotos de produção)
        const { data: fotosOrdem } = await supabase
          .from("fotos_equipamentos")
          .select("id, arquivo_url, nome_arquivo, legenda")
          .eq("ordem_servico_id", ordem.id);

        if (fotosOrdem && fotosOrdem.length > 0) {
          // Combinar arrays evitando duplicatas
          fotosData = [...fotosData, ...fotosOrdem.filter(fo => 
            !fotosData.some(fd => fd.id === fo.id)
          )];
        }

        setFotos(fotosData);

        // Buscar dados públicos da empresa via RPC (somente campos seguros)
        if (ordem.empresa_id) {
          const { data: empresaRows } = await supabase
            .rpc("get_empresa_public_info", { p_empresa_id: ordem.empresa_id });
          const empresa = Array.isArray(empresaRows) ? empresaRows[0] : empresaRows;
          if (empresa) {
            setEmpresaData(empresa);
            if (empresa.logo_url) {
              setEmpresaLogo(empresa.logo_url);
            }
          }
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        toast.error(t('laudoPublico.loadError'));
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    verificarAcessoECarregarDados();
  }, [numeroOrdem, navigate, t]);

  const handleExportPDF = async () => {
    if (!ordemServico) return;

    try {
      toast.loading(t('laudoPublico.pdfGenerating'));
      await gerarLaudoPublicoModerno({
        ordem: ordemServico,
        teste,
        fotos,
        dadosDimensionais,
        empresa: empresaData,
        language,
        t,
        tr,
      });
      toast.dismiss();
      toast.success(t('laudoPublico.pdfSuccess'));
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast.dismiss();
      toast.error(t('laudoPublico.pdfError'));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">{t('laudoPublico.loading')}</p>
        </div>
      </div>
    );
  }

  if (!ordemServico) {
    return null;
  }

  const ResultadoBadge = ({ resultado }: { resultado: string }) => {
    if (resultado === 'aprovado') {
      return <Badge className="bg-green-500 hover:bg-green-600"><CheckCircle className="w-3 h-3 mr-1" /> {t('laudoPublico.approved')}</Badge>;
    }
    return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> {t('laudoPublico.rejected')}</Badge>;
  };

  return (
    <div ref={contentRef} className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Seletor de Idioma */}
        <div className="flex justify-end">
          <LanguageSelectorDropdown />
        </div>

        {/* Cabeçalho */}
        <Card className="border-2 border-primary/20">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <img 
                src={empresaLogo || defaultLogo} 
                alt="Logo" 
                className="h-16 object-contain"
                crossOrigin="anonymous"
              />
            </div>
            <div>
              <CardTitle className="text-3xl font-bold">{t('laudoPublico.technicalReport')}</CardTitle>
              <p className="text-muted-foreground text-lg mt-2">
                {t('laudoPublico.serviceOrder')} <span className="font-semibold text-primary">#{ordemServico.recebimentos?.numero_ordem || ordemServico.numero_ordem}</span>
              </p>
              <Button
                onClick={handleExportPDF}
                className="mt-4"
                variant="outline"
              >
                <Download className="w-4 h-4 mr-2" />
                {t('laudoPublico.exportPdf')}
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Dados da Ordem */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {t('laudoPublico.orderInfo')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <Building2 className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">{t('laudoPublico.client')}</p>
                  <p className="font-semibold">{ordemServico.cliente_nome}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Wrench className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">{t('laudoPublico.equipment')}</p>
                  <p className="font-semibold">{tr(ordemServico.equipamento)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">{t('laudoPublico.entryDate')}</p>
                  <p className="font-semibold">
                    {format(new Date(ordemServico.data_entrada), language === 'pt-BR' ? "dd 'de' MMMM 'de' yyyy" : "MMMM dd, yyyy", { locale: dateLocale })}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <FileCheck className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">{t('laudoPublico.status')}</p>
                  <Badge variant="outline" className="mt-1">{t('laudoPublico.finished')}</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card de Motivo da Falha */}
        {ordemServico.motivo_falha && (
          <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <AlertTriangle className="w-5 h-5" />
                {t('laudoPublico.failureDiagnosis')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground whitespace-pre-wrap">
                {(() => {
                  const motivo = ordemServico.motivo_falha || '';
                  const translationMap: Record<string, Record<string, string>> = {
                    'revisao_completa': { 'pt-BR': 'Revisão Completa', 'en': 'Complete Revision', 'es': 'Revisión Completa' },
                    'haste_quebrada': { 'pt-BR': 'Haste Quebrada', 'en': 'Broken Rod', 'es': 'Vástago Roto' },
                    'vazamento_vedacoes': { 'pt-BR': 'Vazamento nas Vedações', 'en': 'Seal Leakage', 'es': 'Fuga en Sellos' },
                    'outros': { 'pt-BR': 'Outros', 'en': 'Others', 'es': 'Otros' },
                  };
                  // Try exact key match
                  if (translationMap[motivo]) return translationMap[motivo][language] || motivo;
                  // Try matching by Portuguese label
                  const byLabel = Object.values(translationMap).find(t => t['pt-BR']?.toLowerCase() === motivo.toLowerCase());
                  if (byLabel) return byLabel[language] || tr(motivo);
                  return tr(motivo);
                })()}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Laudo do Teste */}
        {teste && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Gauge className="w-5 h-5" />
                  {t('laudoPublico.testResult')}
                </CardTitle>
                <ResultadoBadge resultado={teste.resultado_teste} />
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Informações Básicas do Teste */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{t('laudoPublico.testType')}</p>
                  <p className="font-semibold capitalize">{tr(teste.tipo_teste)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('laudoPublico.testDate')}</p>
                  <p className="font-semibold">
                    {format(new Date(teste.data_hora_teste), language === 'pt-BR' ? "dd/MM/yyyy 'às' HH:mm" : "MM/dd/yyyy 'at' HH:mm", { locale: dateLocale })}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Parâmetros de Teste ISO10100 */}
              <div>
                <p className="font-semibold mb-3">{t('laudoPublico.testParametersISO')}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {teste.pressao_teste && (
                    <div className="flex items-start gap-3">
                      <Gauge className="w-5 h-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">{t('laudoPublico.testPressure')}</p>
                        <p className="font-semibold">{teste.pressao_teste}</p>
                      </div>
                    </div>
                  )}
                  {teste.temperatura_operacao && (
                    <div className="flex items-start gap-3">
                      <Thermometer className="w-5 h-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">{t('laudoPublico.operatingTemp')}</p>
                        <p className="font-semibold">{teste.temperatura_operacao}</p>
                      </div>
                    </div>
                  )}
                  {teste.tempo_minutos && (
                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">{t('laudoPublico.testTime')}</p>
                        <p className="font-semibold">{teste.tempo_minutos} {t('laudoPublico.minutes')}</p>
                      </div>
                    </div>
                  )}
                  {teste.curso && (
                    <div>
                      <p className="text-sm text-muted-foreground">{t('laudoPublico.stroke')}</p>
                      <p className="font-semibold">{teste.curso}</p>
                    </div>
                  )}
                  {teste.qtd_ciclos && (
                    <div>
                      <p className="text-sm text-muted-foreground">{t('laudoPublico.cycleQty')}</p>
                      <p className="font-semibold">{teste.qtd_ciclos}</p>
                    </div>
                  )}
                  {teste.pressao_maxima_trabalho && (
                    <div>
                      <p className="text-sm text-muted-foreground">{t('laudoPublico.maxWorkPressure')}</p>
                      <p className="font-semibold">{teste.pressao_maxima_trabalho}</p>
                    </div>
                  )}
                  {teste.pressao_avanco && (
                    <div>
                      <p className="text-sm text-muted-foreground">{t('laudoPublico.advancePressure')}</p>
                      <p className="font-semibold">{teste.pressao_avanco}</p>
                    </div>
                  )}
                  {teste.pressao_retorno && (
                    <div>
                      <p className="text-sm text-muted-foreground">{t('laudoPublico.returnPressure')}</p>
                      <p className="font-semibold">{teste.pressao_retorno}</p>
                    </div>
                  )}
                  {teste.espessura_camada && (
                    <div>
                      <p className="text-sm text-muted-foreground">{t('laudoPublico.layerThickness')}</p>
                      <p className="font-semibold">{teste.espessura_camada}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Verificações */}
              {(teste.check_vazamento_pistao !== null || 
                teste.check_vazamento_vedacoes_estaticas !== null || 
                teste.check_vazamento_haste !== null) && (
                <>
                  <Separator />
                  <div>
                    <p className="font-semibold mb-3">{t('laudoPublico.leakChecks')}</p>
                    <div className="space-y-2">
                      {teste.check_vazamento_pistao !== null && (
                        <div className="flex items-center gap-2">
                          {teste.check_vazamento_pistao ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                          <span>{t('laudoPublico.pistonLeak')}</span>
                        </div>
                      )}
                      {teste.check_vazamento_vedacoes_estaticas !== null && (
                        <div className="flex items-center gap-2">
                          {teste.check_vazamento_vedacoes_estaticas ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                          <span>{t('laudoPublico.staticSealsLeak')}</span>
                        </div>
                      )}
                      {teste.check_vazamento_haste !== null && (
                        <div className="flex items-center gap-2">
                          {teste.check_vazamento_haste ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                          <span>{t('laudoPublico.stemLeak')}</span>
                        </div>
                      )}
                      {/* Verificação Geral calculada */}
                      {(() => {
                        const todasVerificacoesOK = 
                          (teste.check_vazamento_pistao === null || teste.check_vazamento_pistao === true) &&
                          (teste.check_vazamento_vedacoes_estaticas === null || teste.check_vazamento_vedacoes_estaticas === true) &&
                          (teste.check_vazamento_haste === null || teste.check_vazamento_haste === true);
                        return (
                          <div className="flex items-center gap-2 pt-2 border-t mt-2">
                            {todasVerificacoesOK ? (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-500" />
                            )}
                            <span className="font-semibold">{t('laudoPublico.generalCheck')}</span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </>
              )}

              {/* Observações */}
              {(teste.observacoes_teste || teste.observacao) && (
                <>
                  <Separator />
                  <div>
                    <p className="font-semibold mb-2">{t('laudoPublico.observations')}</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {tr(teste.observacoes_teste || teste.observacao)}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Dados Dimensionais */}
        {dadosDimensionais && (dadosDimensionais.camisa || dadosDimensionais.curso || dadosDimensionais.haste_comprimento || dadosDimensionais.conexao_a || dadosDimensionais.conexao_b || dadosDimensionais.pressao_trabalho) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gauge className="w-5 h-5 text-amber-500" />
                {t('laudoPublico.dimensionalData')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dadosDimensionais.camisa && (
                  <div>
                    <p className="text-sm text-muted-foreground">{t('laudoPublico.shirtDiameter')}</p>
                    <p className="font-semibold">{dadosDimensionais.camisa}</p>
                  </div>
                )}
                {dadosDimensionais.curso && (
                  <div>
                    <p className="text-sm text-muted-foreground">{t('laudoPublico.stroke')}</p>
                    <p className="font-semibold">{dadosDimensionais.curso}</p>
                  </div>
                )}
                {dadosDimensionais.haste_comprimento && (
                  <div>
                    <p className="text-sm text-muted-foreground">{t('laudoPublico.rodLength')}</p>
                    <p className="font-semibold">{dadosDimensionais.haste_comprimento}</p>
                  </div>
                )}
                {dadosDimensionais.conexao_a && (
                  <div>
                    <p className="text-sm text-muted-foreground">{t('laudoPublico.connectionA')}</p>
                    <p className="font-semibold">{dadosDimensionais.conexao_a}</p>
                  </div>
                )}
                {dadosDimensionais.conexao_b && (
                  <div>
                    <p className="text-sm text-muted-foreground">{t('laudoPublico.connectionB')}</p>
                    <p className="font-semibold">{dadosDimensionais.conexao_b}</p>
                  </div>
                )}
                {dadosDimensionais.pressao_trabalho && (
                  <div>
                    <p className="text-sm text-muted-foreground">{t('laudoPublico.workPressure')}</p>
                    <p className="font-semibold">{dadosDimensionais.pressao_trabalho}</p>
                  </div>
                )}
                {dadosDimensionais.temperatura_trabalho && (
                  <div>
                    <p className="text-sm text-muted-foreground">{t('laudoPublico.workTemperature')}</p>
                    <p className="font-semibold">{dadosDimensionais.temperatura_trabalho}</p>
                  </div>
                )}
                {dadosDimensionais.fluido_trabalho && (
                  <div>
                    <p className="text-sm text-muted-foreground">{t('laudoPublico.workFluid')}</p>
                    <p className="font-semibold">{tr(dadosDimensionais.fluido_trabalho)}</p>
                  </div>
                )}
                {dadosDimensionais.ambiente_trabalho && (
                  <div>
                    <p className="text-sm text-muted-foreground">{t('laudoPublico.workEnvironment')}</p>
                    <p className="font-semibold">{tr(dadosDimensionais.ambiente_trabalho)}</p>
                  </div>
                )}
                {dadosDimensionais.potencia && (
                  <div>
                    <p className="text-sm text-muted-foreground">{t('laudoPublico.power')}</p>
                    <p className="font-semibold">{dadosDimensionais.potencia}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Peças Utilizadas */}
        {ordemServico && Array.isArray(ordemServico.pecas_necessarias) && ordemServico.pecas_necessarias.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-blue-500" />
                {t('laudoPublico.partsUsed')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {ordemServico.pecas_necessarias.map((item: any, index: number) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-muted/50 rounded">
                    <span className="font-medium">{tr(item.peca || item.descricao || item.nome) || t('laudoPublico.partsUsed')}</span>
                    <span className="text-sm text-muted-foreground">
                      {t('laudoPublico.qty')}: {item.quantidade || 1}
                      {item.codigo && ` | ${t('laudoPublico.code')}: ${item.codigo}`}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Serviços Realizados */}
        {ordemServico && Array.isArray(ordemServico.servicos_necessarios) && ordemServico.servicos_necessarios.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-green-500" />
                {t('laudoPublico.servicesPerformed')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {ordemServico.servicos_necessarios.map((servico: any, index: number) => (
                  <div key={index} className="p-2 bg-muted/50 rounded">
                    <p className="font-medium">{tr(servico.descricao || servico.nome) || t('laudoPublico.servicesPerformed')}</p>
                    {(servico.detalhes || servico.observacao) && (
                      <p className="text-sm text-muted-foreground mt-1">{tr(servico.detalhes || servico.observacao)}</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Usinagem */}
        {ordemServico && Array.isArray(ordemServico.usinagem_necessaria) && ordemServico.usinagem_necessaria.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gauge className="w-5 h-5 text-purple-500" />
                {t('laudoPublico.machining')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {ordemServico.usinagem_necessaria.map((item: any, index: number) => (
                  <div key={index} className="p-2 bg-muted/50 rounded">
                    <p className="font-medium">{tr(item.descricao || item.nome) || t('laudoPublico.machining')}</p>
                    {(item.detalhes || item.observacao) && (
                      <p className="text-sm text-muted-foreground mt-1">{tr(item.detalhes || item.observacao)}</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Fotos do Equipamento */}
        {fotos.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {t('laudoPublico.equipmentPhotos')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {fotos.map((foto) => (
                  <div key={foto.id} className="space-y-2">
                    <img
                      src={foto.arquivo_url}
                      alt={foto.nome_arquivo}
                      className="w-full h-64 object-cover rounded-lg border"
                    />
                    <p className="text-sm text-muted-foreground text-center">{foto.nome_arquivo}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Vídeo do Teste */}
        {teste && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="w-5 h-5" />
                {t('laudoPublico.testVideo')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {teste.video_url ? (
                <>
                  <div className="aspect-video bg-black rounded-lg overflow-hidden">
                    <video 
                      controls 
                      className="w-full h-full"
                      src={teste.video_url}
                    >
                      {t('laudoPublico.browserNotSupported')}
                    </video>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      if (teste.video_url) {
                        window.open(teste.video_url, '_blank');
                      }
                    }}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {t('laudoPublico.downloadVideo')}
                  </Button>
                </>
              ) : (
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <Video className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>{t('laudoPublico.noVideoAttached')}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Histórico de Manutenções */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              {t('laudoPublico.maintenanceTrend')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              {t('laudoPublico.maintenanceTrendDesc')}
            </p>
            <Button 
              onClick={() => setHistoricoModalOpen(true)}
              className="w-full"
              variant="outline"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              {t('laudoPublico.viewHistoryCharts')}
            </Button>
          </CardContent>
        </Card>

        {/* Rodapé */}
        <Card className="bg-muted/50">
          <CardContent className="pt-6 text-center text-sm text-muted-foreground">
            <p>{t('laudoPublico.footerGenerated')}</p>
            <p className="mt-1">
              {t('laudoPublico.issueDate')}: {format(new Date(), language === 'pt-BR' ? "dd 'de' MMMM 'de' yyyy 'às' HH:mm" : "MMMM dd, yyyy 'at' HH:mm", { locale: dateLocale })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Modal de Histórico */}
      <HistoricoManutencaoPublicoModal
        open={historicoModalOpen}
        onOpenChange={setHistoricoModalOpen}
        numeroOrdem={numeroOrdem || ""}
        ordemId={ordemServico?.id}
      />
    </div>
  );
}
