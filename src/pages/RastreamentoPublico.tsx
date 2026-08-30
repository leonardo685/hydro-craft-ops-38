import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabasePublico as supabase, setOrdemPublica } from "@/integrations/supabase/ordemPublicaClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, Circle, Loader2, PackageCheck, Ruler, ClipboardCheck, Wrench, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { addLogoToPDF } from "@/lib/pdf-logo-utils";
import { format } from "date-fns";
import { ptBR, enUS, es } from "date-fns/locale";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageSelectorDropdown } from "@/components/LanguageSelectorDropdown";
import { translateTerm } from "@/i18n/dynamicTerms";
import defaultLogo from "@/assets/mec-hidro-logo-atualizado.jpg";

interface EmpresaData {
  logo_url: string | null;
  razao_social: string | null;
  nome: string;
  telefone: string | null;
  email: string | null;
}

interface DadosRastreio {
  numeroOrdem: string;
  clienteNome: string;
  equipamento: string;
  dataEntrada: string | null;
  dataAnalise: string | null;
  temOrdem: boolean;
  temOrcamento: boolean;
  statusOrdem: string | null;
  ordem: any | null;
}

// Somente ordens que já estão em "Aprovados" contam como produção
const STATUS_PRODUCAO = ["aprovada", "aprovado", "em_producao", "em_teste", "aguardando_retorno", "finalizada", "faturado"];

export default function RastreamentoPublico() {
  const { numeroOrdem } = useParams<{ numeroOrdem: string }>();
  setOrdemPublica(numeroOrdem);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Empresa do QR Code: o mesmo número de ordem pode existir em empresas diferentes
  const empresaIdParam = searchParams.get("e");
  const queryEmpresa = empresaIdParam ? `?e=${empresaIdParam}` : "";
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [dados, setDados] = useState<DadosRastreio | null>(null);
  const [empresa, setEmpresa] = useState<EmpresaData | null>(null);
  const [gerandoPdf, setGerandoPdf] = useState(false);

  const dateLocale = language === "en" ? enUS : language === "es" ? es : ptBR;

  const formatarData = (valor?: string | null) => {
    if (!valor) return null;
    try {
      return format(new Date(valor), language === "pt-BR" ? "dd/MM/yyyy" : "MM/dd/yyyy", { locale: dateLocale });
    } catch {
      return null;
    }
  };

  useEffect(() => {
    const carregar = async () => {
      if (!numeroOrdem) {
        setLoading(false);
        return;
      }
      setOrdemPublica(numeroOrdem);

      try {
        let recebimentoQuery = supabase
          .from("recebimentos")
          .select("id, numero_ordem, cliente_nome, tipo_equipamento, descricao_nfe, data_entrada, data_analise, empresa_id, pdf_nota_retorno")
          .eq("numero_ordem", numeroOrdem);
        if (empresaIdParam) recebimentoQuery = recebimentoQuery.eq("empresa_id", empresaIdParam);
        const { data: recebimento } = await recebimentoQuery
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        let ordensQuery = supabase
          .from("ordens_servico")
          .select("id, numero_ordem, cliente_nome, equipamento, data_entrada, data_analise, status, orcamento_id, empresa_id, recebimento_id, created_at, tecnico, tipo_problema, descricao_problema, solucao_proposta, categoria_equipamento, numero_serie, camisa, haste_comprimento, curso, conexao_a, conexao_b, pressao_trabalho, temperatura_trabalho, fluido_trabalho, ambiente_trabalho, potencia, local_instalacao")
          .eq("numero_ordem", numeroOrdem);
        if (empresaIdParam) ordensQuery = ordensQuery.eq("empresa_id", empresaIdParam);
        const { data: ordens } = await ordensQuery.order("created_at", { ascending: false });

        const ordem = ordens && ordens.length > 0 ? ordens[0] : null;

        if (!recebimento && !ordem) {
          setLoading(false);
          return;
        }

        // Se o serviço já foi finalizado (laudo, fotos ou nota de retorno), vai para o laudo
        if (ordem) {
          const [{ data: teste }, { data: fotos }] = await Promise.all([
            supabase.from("testes_equipamentos").select("id").eq("ordem_servico_id", ordem.id).limit(1),
            supabase.from("fotos_equipamentos").select("id").eq("ordem_servico_id", ordem.id).limit(1),
          ]);
          const finalizada =
            (teste && teste.length > 0) ||
            (fotos && fotos.length > 0) ||
            !!recebimento?.pdf_nota_retorno;

          if (finalizada) {
            navigate(`/laudo-publico/${encodeURIComponent(numeroOrdem)}${queryEmpresa}`, { replace: true });
            return;
          }
        }

        const empresaId = ordem?.empresa_id || recebimento?.empresa_id;
        if (empresaId) {
          const { data: empresaInfo } = await supabase
            .rpc("get_empresa_public_info", { p_empresa_id: empresaId })
            .maybeSingle();
          if (empresaInfo) setEmpresa(empresaInfo as EmpresaData);
        }

        setDados({
          numeroOrdem,
          clienteNome: ordem?.cliente_nome || recebimento?.cliente_nome || "",
          equipamento:
            ordem?.equipamento ||
            recebimento?.descricao_nfe ||
            recebimento?.tipo_equipamento ||
            "",
          dataEntrada: recebimento?.data_entrada || ordem?.data_entrada || null,
          dataAnalise: ordem?.data_analise || ordem?.created_at || recebimento?.data_analise || null,
          temOrdem: !!ordem,
          temOrcamento: !!ordem?.orcamento_id,
          statusOrdem: ordem?.status || null,
          ordem: ordem || null,
        });
      } catch (error) {
        console.error("Erro ao carregar rastreamento:", error);
      } finally {
        setLoading(false);
      }
    };

    carregar();
  }, [numeroOrdem, navigate, empresaIdParam, queryEmpresa]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">{t("rastreamento.loading")}</p>
        </div>
      </div>
    );
  }

  if (!dados) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-2">
            <p className="text-lg font-semibold">{t("rastreamento.notFound")}</p>
            <p className="text-sm text-muted-foreground">{numeroOrdem}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const emProducao = !!dados.statusOrdem && STATUS_PRODUCAO.includes(dados.statusOrdem);
  const aguardandoAprovacao = !emProducao && dados.temOrcamento;

  const etapas = [
    {
      icon: PackageCheck,
      titulo: t("rastreamento.stage1"),
      descricao: t("rastreamento.stage1Desc"),
      concluida: true,
      data: formatarData(dados.dataEntrada),
    },
    {
      icon: Ruler,
      titulo: t("rastreamento.stage2"),
      descricao: t("rastreamento.stage2Desc"),
      concluida: dados.temOrdem,
      data: dados.temOrdem ? formatarData(dados.dataAnalise) : null,
    },
    {
      icon: ClipboardCheck,
      titulo: t("rastreamento.stage3"),
      descricao: t("rastreamento.stage3Desc"),
      concluida: aguardandoAprovacao || emProducao,
      data: null,
    },
    {
      icon: Wrench,
      titulo: t("rastreamento.stage4"),
      descricao: t("rastreamento.stage4Desc"),
      concluida: emProducao,
      data: null,
    },
  ];

  const etapaAtualIndex = Math.max(
    0,
    etapas.reduce((acc, etapa, index) => (etapa.concluida ? index : acc), 0)
  );

  const logo = empresa?.logo_url || defaultLogo;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <img src={logo} alt={empresa?.nome || "Logo"} className="h-12 object-contain" />
          <LanguageSelectorDropdown />
        </div>

        <Card className="shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">{t("rastreamento.title")}</CardTitle>
            <p className="text-muted-foreground">{t("rastreamento.subtitle")}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">{t("rastreamento.order")}</p>
                <p className="font-semibold">{dados.numeroOrdem}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t("rastreamento.client")}</p>
                <p className="font-semibold">{dados.clienteNome}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t("rastreamento.equipment")}</p>
                <p className="font-semibold">{translateTerm(dados.equipamento, language)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t("rastreamento.entryDate")}</p>
                <p className="font-semibold">{formatarData(dados.dataEntrada) || "-"}</p>
              </div>
            </div>

            <Separator />

            <div>
              <p className="text-sm text-muted-foreground mb-1">{t("rastreamento.currentStage")}</p>
              <Badge className="text-sm py-1 px-3">{etapas[etapaAtualIndex].titulo}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardContent className="p-6">
            <ol className="relative space-y-6">
              {etapas.map((etapa, index) => {
                const Icone = etapa.icon;
                const atual = index === etapaAtualIndex;
                return (
                  <li key={etapa.titulo} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                          etapa.concluida
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted text-muted-foreground border-border"
                        }`}
                      >
                        <Icone className="w-5 h-5" />
                      </div>
                      {index < etapas.length - 1 && (
                        <div
                          className={`w-0.5 flex-1 min-h-8 mt-1 ${
                            etapas[index + 1].concluida ? "bg-primary" : "bg-border"
                          }`}
                        />
                      )}
                    </div>
                    <div className="pb-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className={`font-semibold ${etapa.concluida ? "" : "text-muted-foreground"}`}>
                          {etapa.titulo}
                        </p>
                        {etapa.concluida && !atual && (
                          <Badge variant="secondary" className="gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            {t("rastreamento.concluded")}
                          </Badge>
                        )}
                        {atual && (
                          <Badge className="gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            {t("rastreamento.inProgress")}
                          </Badge>
                        )}
                        {!etapa.concluida && (
                          <Badge variant="outline" className="gap-1">
                            <Circle className="w-3 h-3" />
                            {t("rastreamento.pending")}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{etapa.descricao}</p>
                      {etapa.data && (
                        <p className="text-xs text-muted-foreground mt-1">{etapa.data}</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center space-y-2">
            <p className="text-sm text-muted-foreground">{t("rastreamento.questions")}</p>
            <p className="font-medium">{empresa?.razao_social || empresa?.nome}</p>
            {empresa?.telefone && <p className="text-sm">{empresa.telefone}</p>}
            {empresa?.email && <p className="text-sm">{empresa.email}</p>}

          </CardContent>
        </Card>
      </div>
    </div>
  );
}
