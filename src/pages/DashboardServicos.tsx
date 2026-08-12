import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wrench, ShieldCheck, ClipboardCheck, Factory, Users, Gauge, RotateCcw, TrendingUp, Hammer, Download } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEmpresa } from "@/contexts/EmpresaContext";
import { useRealtimeSubscription } from "@/hooks/use-realtime-subscription";
import jsPDF from "jspdf";
import { addLogoToPDF } from "@/lib/pdf-logo-utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";
import { format, parseISO, subMonths, startOfMonth } from "date-fns";
import { ptBR, es, enUS } from "date-fns/locale";
import { useLanguage } from "@/contexts/LanguageContext";

type Ordem = {
  id: string;
  numero_ordem: string;
  cliente_nome: string | null;
  equipamento: string | null;
  categoria_equipamento: string | null;
  status: string;
  data_entrada: string | null;
  data_finalizacao: string | null;
  updated_at: string | null;
  recebimento_id: number | null;
  observacoes_tecnicas: string | null;
  descricao_problema: string | null;
  tipo_problema: string | null;
};

const CATEGORIAS = [
  "Cilindros Hidráulicos",
  "Cilindros Pneumáticos",
  "Unidades Hidráulicas",
  "Bombas e Motores",
  "Válvulas e Comandos",
  "Outros Equipamentos",
] as const;

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--muted-foreground))",
];


const DICT = {
  "pt-BR": {
    title: "Dashboard de Serviços",
    subtitle: "Panorama dos equipamentos reformados, tipos atendidos e desempenho de garantia",
    p3: "Últimos 3 meses", p6: "Últimos 6 meses", p12: "Últimos 12 meses", p24: "Últimos 24 meses", pall: "Todo o período",
    reformados: "Equipamentos reformados", deOrdens: (a: number) => `de ${a} ordens no período`,
    fabricados: "Cilindros fabricados", fabricadosSub: (p: string) => `${p}% das ordens concluídas no período`,
    indiceGarantia: "Índice de garantia", semAcionamento: (n: number) => `sem acionamento de garantia (${n} retornos)`,
    laudos: "Laudos de teste", laudosSub: (a: number, b: string) => `${a} aprovados · ${b}% de cobertura`,
    tempoMedio: "Tempo médio de reforma", diasEntre: "dias entre entrada e entrega",
    tipos: "Tipos de equipamento atendidos", tiposSub: "Distribuição dos equipamentos reformados por família",
    semDados: "Sem dados no período",
    confiabilidade: "Confiabilidade e garantia", confiabilidadeSub: "Equipamentos que não retornaram por garantia após a reforma",
    taxaRetorno: "Taxa de retorno em garantia", retornosRegistrados: "Retornos registrados",
    volume: "Volume de serviços por mês", volumeSub: "Equipamentos recebidos e entregues",
    recebidos: "Recebidos", entregues: "Entregues",
    clientes: "Principais clientes atendidos", clientesSub: "Quantidade de equipamentos reformados por cliente",
    equipamentos: "Equipamentos", carregando: "Carregando indicadores...",
    resumo: "Resumo para apresentação ao cliente",
    resumoReformados: (n: number) => `${n} equipamentos reformados`,
    resumoGarantia: (p: string) => `${p}% sem garantia acionada`,
    resumoLaudos: (n: number) => `${n} laudos de teste emitidos`,
    naoInformado: "Não informado",
    semGarantiaFatia: "Sem acionamento de garantia", retornosFatia: "Retornos em garantia",
    exportarPdf: "Exportar PDF",
    relatorioTitulo: "Relatório de Serviços",
    periodoRotulo: "Período",
    geradoEm: "Gerado em",
    indicadores: "Indicadores",
    categoria: "Categoria",
    quantidade: "Quantidade",
    mes: "Mês",
    cliente: "Cliente",
    total: "Total",
    pagina: "Página",
    cat: {
      "Cilindros Hidráulicos": "Cilindros Hidráulicos",
      "Cilindros Pneumáticos": "Cilindros Pneumáticos",
      "Unidades Hidráulicas": "Unidades Hidráulicas",
      "Bombas e Motores": "Bombas e Motores",
      "Válvulas e Comandos": "Válvulas e Comandos",
      "Outros Equipamentos": "Outros Equipamentos",
    } as Record<string, string>,
  },
  en: {
    title: "Service Dashboard",
    subtitle: "Overview of refurbished equipment, served types and warranty performance",
    p3: "Last 3 months", p6: "Last 6 months", p12: "Last 12 months", p24: "Last 24 months", pall: "All time",
    reformados: "Refurbished equipment", deOrdens: (a: number) => `of ${a} orders in the period`,
    fabricados: "Manufactured cylinders", fabricadosSub: (p: string) => `${p}% of completed orders in the period`,
    indiceGarantia: "Warranty index", semAcionamento: (n: number) => `without warranty claims (${n} returns)`,
    laudos: "Test reports", laudosSub: (a: number, b: string) => `${a} approved · ${b}% coverage`,
    tempoMedio: "Average turnaround", diasEntre: "days between intake and delivery",
    tipos: "Equipment types served", tiposSub: "Distribution of refurbished equipment by family",
    semDados: "No data in the period",
    confiabilidade: "Reliability and warranty", confiabilidadeSub: "Equipment that did not return under warranty after refurbishing",
    taxaRetorno: "Warranty return rate", retornosRegistrados: "Registered returns",
    volume: "Monthly service volume", volumeSub: "Equipment received and delivered",
    recebidos: "Received", entregues: "Delivered",
    clientes: "Top clients served", clientesSub: "Number of refurbished units per client",
    equipamentos: "Equipment", carregando: "Loading indicators...",
    resumo: "Summary for client presentation",
    resumoReformados: (n: number) => `${n} refurbished units`,
    resumoGarantia: (p: string) => `${p}% with no warranty claims`,
    resumoLaudos: (n: number) => `${n} test reports issued`,
    naoInformado: "Not informed",
    semGarantiaFatia: "No warranty claim", retornosFatia: "Warranty returns",
    exportarPdf: "Export PDF",
    relatorioTitulo: "Service Report",
    periodoRotulo: "Period",
    geradoEm: "Generated on",
    indicadores: "Indicators",
    categoria: "Category",
    quantidade: "Quantity",
    mes: "Month",
    cliente: "Client",
    total: "Total",
    pagina: "Page",
    cat: {
      "Cilindros Hidráulicos": "Hydraulic Cylinders",
      "Cilindros Pneumáticos": "Pneumatic Cylinders",
      "Unidades Hidráulicas": "Hydraulic Power Units",
      "Bombas e Motores": "Pumps and Motors",
      "Válvulas e Comandos": "Valves and Controls",
      "Outros Equipamentos": "Other Equipment",
    } as Record<string, string>,
  },
  es: {
    title: "Panel de Servicios",
    subtitle: "Panorama de los equipos reacondicionados, tipos atendidos y desempeño de garantía",
    p3: "Últimos 3 meses", p6: "Últimos 6 meses", p12: "Últimos 12 meses", p24: "Últimos 24 meses", pall: "Todo el período",
    reformados: "Equipos reacondicionados", deOrdens: (a: number) => `de ${a} órdenes en el período`,
    fabricados: "Cilindros fabricados", fabricadosSub: (p: string) => `${p}% de las órdenes concluidas en el período`,
    indiceGarantia: "Índice de garantía", semAcionamento: (n: number) => `sin reclamos de garantía (${n} retornos)`,
    laudos: "Informes de prueba", laudosSub: (a: number, b: string) => `${a} aprobados · ${b}% de cobertura`,
    tempoMedio: "Tiempo medio de reacondicionamiento", diasEntre: "días entre ingreso y entrega",
    tipos: "Tipos de equipos atendidos", tiposSub: "Distribución de los equipos reacondicionados por familia",
    semDados: "Sin datos en el período",
    confiabilidade: "Confiabilidad y garantía", confiabilidadeSub: "Equipos que no retornaron por garantía después del servicio",
    taxaRetorno: "Tasa de retorno por garantía", retornosRegistrados: "Retornos registrados",
    volume: "Volumen de servicios por mes", volumeSub: "Equipos recibidos y entregados",
    recebidos: "Recibidos", entregues: "Entregados",
    clientes: "Principales clientes atendidos", clientesSub: "Cantidad de equipos reacondicionados por cliente",
    equipamentos: "Equipos", carregando: "Cargando indicadores...",
    resumo: "Resumen para presentación al cliente",
    resumoReformados: (n: number) => `${n} equipos reacondicionados`,
    resumoGarantia: (p: string) => `${p}% sin garantía reclamada`,
    resumoLaudos: (n: number) => `${n} informes de prueba emitidos`,
    naoInformado: "No informado",
    semGarantiaFatia: "Sin reclamo de garantía", retornosFatia: "Retornos por garantía",
    exportarPdf: "Exportar PDF",
    relatorioTitulo: "Informe de Servicios",
    periodoRotulo: "Período",
    geradoEm: "Generado el",
    indicadores: "Indicadores",
    categoria: "Categoría",
    quantidade: "Cantidad",
    mes: "Mes",
    cliente: "Cliente",
    total: "Total",
    pagina: "Página",
    cat: {
      "Cilindros Hidráulicos": "Cilindros Hidráulicos",
      "Cilindros Pneumáticos": "Cilindros Neumáticos",
      "Unidades Hidráulicas": "Unidades Hidráulicas",
      "Bombas e Motores": "Bombas y Motores",
      "Válvulas e Comandos": "Válvulas y Mandos",
      "Outros Equipamentos": "Otros Equipos",
    } as Record<string, string>,
  },
} as const;

function classificar(ordem: Ordem): string {
  const texto = `${ordem.categoria_equipamento || ""} ${ordem.equipamento || ""}`
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (/CILINDRO/.test(texto)) {
    if (/PNEUMAT/.test(texto)) return "Cilindros Pneumáticos";
    return "Cilindros Hidráulicos";
  }
  if (/(UNIDADE|CENTRAL)\s*(HIDRAUL|OLEO)/.test(texto) || /POWER\s*PACK/.test(texto)) {
    return "Unidades Hidráulicas";
  }
  if (/(BOMBA|MOTOR|MACACO)/.test(texto)) return "Bombas e Motores";
  if (/(VALVULA|COMANDO|DISTRIBUIDOR|BLOCO)/.test(texto)) return "Válvulas e Comandos";
  return "Outros Equipamentos";
}

const STATUS_CONCLUIDO = ["finalizada", "faturado", "aguardando_retorno"];

const normalizar = (v: string) =>
  v.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

// Detecta fabricação (cilindro novo) pelo texto do equipamento/observações
function isFabricacao(ordem: Ordem): boolean {
  const texto = normalizar(
    `${ordem.categoria_equipamento || ""} ${ordem.equipamento || ""} ${ordem.tipo_problema || ""} ${ordem.descricao_problema || ""} ${ordem.observacoes_tecnicas || ""}`
  );
  if (!/CILINDRO/.test(texto)) return false;
  return /(FABRICA|CONFECC|CILINDRO NOVO|NOVO CILINDRO|MONTAGEM NOVA|EQUIPAMENTO NOVO)/.test(texto);
}

export default function DashboardServicos() {
  const { empresaAtual } = useEmpresa();
  const { language } = useLanguage();
  const L = DICT[(language as keyof typeof DICT)] ?? DICT["pt-BR"];
  const dateLocale = language === "en" ? enUS : language === "es" ? es : ptBR;
  const tCat = (c: string) => L.cat[c] ?? c;
  const [ordens, setOrdens] = useState<Ordem[]>([]);
  const [retornos, setRetornos] = useState<{ ordem_anterior: string | null; created_at: string }[]>([]);
  const [testes, setTestes] = useState<{ ordem_servico_id: string; resultado_teste: string | null }[]>([]);
  const [periodo, setPeriodo] = useState<string>("12");
  const [loading, setLoading] = useState(true);

  const carregar = async () => {
    if (!empresaAtual?.id) return;
    setLoading(true);
    try {
      const [{ data: os }, { data: recs }, { data: tst }] = await Promise.all([
        supabase
          .from("ordens_servico")
          .select("id, numero_ordem, cliente_nome, equipamento, categoria_equipamento, status, data_entrada, data_finalizacao, updated_at, recebimento_id, observacoes_tecnicas, descricao_problema, tipo_problema")
          .eq("empresa_id", empresaAtual.id)
          .order("data_entrada", { ascending: false })
          .limit(1000),
        supabase
          .from("recebimentos")
          .select("ordem_anterior, created_at")
          .eq("empresa_id", empresaAtual.id)
          .limit(1000),
        supabase
          .from("testes_equipamentos")
          .select("ordem_servico_id, resultado_teste")
          .eq("empresa_id", empresaAtual.id)
          .limit(1000),
      ]);

      setOrdens((os as Ordem[]) || []);
      setRetornos((recs || []).filter((r: any) => r.ordem_anterior && r.ordem_anterior.trim() !== ""));
      setTestes((tst as any[]) || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (empresaAtual?.id) carregar();
  }, [empresaAtual?.id]);

  useRealtimeSubscription({
    tables: ["ordens_servico", "recebimentos", "testes_equipamentos"],
    empresaId: empresaAtual?.id,
    onDataChange: () => carregar(),
    enabled: !!empresaAtual?.id,
  });

  const limite = useMemo(() => {
    if (periodo === "all") return null;
    return startOfMonth(subMonths(new Date(), parseInt(periodo, 10) - 1));
  }, [periodo]);

  const ordensFiltradas = useMemo(() => {
    if (!limite) return ordens;
    return ordens.filter((o) => {
      const ref = o.data_entrada || o.updated_at;
      return ref ? parseISO(ref) >= limite : false;
    });
  }, [ordens, limite]);

  const reformados = useMemo(
    () => ordensFiltradas.filter((o) => STATUS_CONCLUIDO.includes(o.status)),
    [ordensFiltradas]
  );

  const distribuicao = useMemo(() => {
    const mapa = new Map<string, number>();
    CATEGORIAS.forEach((c) => mapa.set(c, 0));
    reformados.forEach((o) => {
      const cat = classificar(o);
      mapa.set(cat, (mapa.get(cat) || 0) + 1);
    });
    return Array.from(mapa.entries())
      .map(([name, value]) => ({ name: tCat(name), value }))
      .filter((d) => d.value > 0);
  }, [reformados, language]);

  const porMes = useMemo(() => {
    const meses = periodo === "all" ? 12 : parseInt(periodo, 10);
    const base = Array.from({ length: meses }, (_, i) => {
      const d = startOfMonth(subMonths(new Date(), meses - 1 - i));
      return { chave: format(d, "yyyy-MM"), mes: format(d, "MMM/yy", { locale: dateLocale }), entradas: 0, entregas: 0 };
    });
    const idx = new Map(base.map((b) => [b.chave, b]));

    ordens.forEach((o) => {
      if (o.data_entrada) {
        const k = format(parseISO(o.data_entrada), "yyyy-MM");
        const item = idx.get(k);
        if (item) item.entradas += 1;
      }
      const entrega = o.data_finalizacao || (STATUS_CONCLUIDO.includes(o.status) ? o.updated_at : null);
      if (entrega) {
        const k = format(parseISO(entrega), "yyyy-MM");
        const item = idx.get(k);
        if (item) item.entregas += 1;
      }
    });

    return base;
  }, [ordens, periodo, dateLocale]);

  const topClientes = useMemo(() => {
    const mapa = new Map<string, number>();
    reformados.forEach((o) => {
      const nome = (o.cliente_nome || L.naoInformado).trim();
      mapa.set(nome, (mapa.get(nome) || 0) + 1);
    });
    return Array.from(mapa.entries())
      .map(([cliente, total]) => ({ cliente: cliente.length > 22 ? `${cliente.slice(0, 22)}…` : cliente, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [reformados]);

  const tempoMedioDias = useMemo(() => {
    const durações = reformados
      .map((o) => {
        const fim = o.data_finalizacao || o.updated_at;
        if (!o.data_entrada || !fim) return null;
        const dias = (parseISO(fim).getTime() - parseISO(o.data_entrada).getTime()) / 86400000;
        return dias >= 0 && dias < 365 ? dias : null;
      })
      .filter((d): d is number => d !== null);
    if (durações.length === 0) return 0;
    return durações.reduce((a, b) => a + b, 0) / durações.length;
  }, [reformados]);

  const testesAprovados = useMemo(
    () => testes.filter((t) => (t.resultado_teste || "").toLowerCase().includes("aprov")).length,
    [testes]
  );

  const fabricados = useMemo(() => reformados.filter(isFabricacao).length, [reformados]);
  const percentualFabricados = reformados.length > 0 ? (fabricados / reformados.length) * 100 : 0;

  const ordensComTeste = useMemo(() => {
    const ids = new Set(testes.map((t) => t.ordem_servico_id));
    return reformados.filter((o) => ids.has(o.id)).length;
  }, [testes, reformados]);

  const coberturaTestes = reformados.length > 0 ? (ordensComTeste / reformados.length) * 100 : 0;
  const totalRetornos = retornos.length;
  const indiceGarantia = reformados.length > 0 ? (totalRetornos / reformados.length) * 100 : 0;
  const indiceSemGarantia = 100 - indiceGarantia;

  const garantiaChart = [
    { name: L.semGarantiaFatia, value: Math.max(reformados.length - totalRetornos, 0) },
    { name: L.retornosFatia, value: totalRetornos },
  ];

  const periodoTexto = () =>
    periodo === "3" ? L.p3 : periodo === "6" ? L.p6 : periodo === "12" ? L.p12 : periodo === "24" ? L.p24 : L.pall;

  const exportarPDF = async () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 15;
    let y = 12;

    await addLogoToPDF(doc, empresaAtual?.logo_url, pageWidth - 50, 8, 35, 20);

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(empresaAtual?.razao_social || empresaAtual?.nome || "", margin, y + 5);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`${L.periodoRotulo}: ${periodoTexto()}`, margin, y + 12);
    doc.text(`${L.geradoEm}: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, margin, y + 17);

    doc.setDrawColor(220, 38, 38);
    doc.setLineWidth(1);
    doc.line(margin, y + 22, pageWidth - margin, y + 22);

    y += 34;
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(220, 38, 38);
    doc.text(L.relatorioTitulo.toUpperCase(), pageWidth / 2, y, { align: "center" });
    doc.setTextColor(0, 0, 0);
    y += 10;

    const secao = (titulo: string) => {
      if (y > pageHeight - 40) {
        doc.addPage();
        y = 20;
      }
      doc.setFillColor(128, 128, 128);
      doc.rect(margin, y, pageWidth - margin * 2, 9, "F");
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text(titulo.toUpperCase(), pageWidth / 2, y + 6.3, { align: "center" });
      doc.setTextColor(0, 0, 0);
      y += 13;
    };

    const tabela = (colunas: [string, string], linhas: [string, string][]) => {
      const w = pageWidth - margin * 2;
      const c1 = w * 0.68;
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setFillColor(235, 235, 235);
      doc.rect(margin, y, w, 8, "F");
      doc.setDrawColor(200, 200, 200);
      doc.rect(margin, y, w, 8);
      doc.text(colunas[0], margin + 2, y + 5.5);
      doc.text(colunas[1], margin + c1 + 2, y + 5.5);
      y += 8;
      doc.setFont("helvetica", "normal");
      linhas.forEach((linha, i) => {
        if (y > pageHeight - 25) {
          doc.addPage();
          y = 20;
        }
        if (i % 2 === 0) {
          doc.setFillColor(248, 248, 248);
          doc.rect(margin, y, w, 7, "F");
        }
        doc.setDrawColor(220, 220, 220);
        doc.rect(margin, y, w, 7);
        doc.text(String(linha[0]).slice(0, 60), margin + 2, y + 5);
        doc.text(String(linha[1]), margin + c1 + 2, y + 5);
        y += 7;
      });
      y += 8;
    };

    secao(L.indicadores);
    tabela([L.indicadores, L.total], [
      [L.reformados, String(reformados.length)],
      [L.fabricados, `${fabricados} (${percentualFabricados.toFixed(0)}%)`],
      [L.indiceGarantia, `${indiceSemGarantia.toFixed(1)}%`],
      [L.taxaRetorno, `${indiceGarantia.toFixed(1)}%`],
      [L.retornosRegistrados, String(totalRetornos)],
      [L.laudos, `${testes.length} (${testesAprovados} / ${coberturaTestes.toFixed(0)}%)`],
      [L.tempoMedio, `${tempoMedioDias.toFixed(1)} ${L.diasEntre}`],
    ]);

    secao(L.tipos);
    tabela(
      [L.categoria, L.quantidade],
      distribuicao.length > 0
        ? distribuicao.map((d) => [d.name, String(d.value)] as [string, string])
        : [[L.semDados, "-"]]
    );

    secao(L.volume);
    tabela(
      [L.mes, `${L.recebidos} / ${L.entregues}`],
      porMes.map((m) => [m.mes, `${m.entradas} / ${m.entregas}`] as [string, string])
    );

    secao(L.clientes);
    tabela(
      [L.cliente, L.equipamentos],
      topClientes.length > 0
        ? topClientes.map((c) => [c.cliente, String(c.total)] as [string, string])
        : [[L.semDados, "-"]]
    );

    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(`${L.pagina} ${i}/${totalPages}`, margin, pageHeight - 10);
      doc.text(`${L.geradoEm}: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, pageWidth - margin, pageHeight - 10, { align: "right" });
    }

    doc.save(`${L.relatorioTitulo.replace(/\s+/g, "_")}_${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  return (
    <AppLayout>
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground md:text-3xl">{L.title}</h1>
            <p className="text-sm text-muted-foreground">
              {L.subtitle}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Select value={periodo} onValueChange={setPeriodo}>
              <SelectTrigger className="w-full md:w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">{L.p3}</SelectItem>
                <SelectItem value="6">{L.p6}</SelectItem>
                <SelectItem value="12">{L.p12}</SelectItem>
                <SelectItem value="24">{L.p24}</SelectItem>
                <SelectItem value="all">{L.pall}</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={exportarPDF} variant="outline" className="gap-2" disabled={loading}>
              <Download className="h-4 w-4" />
              {L.exportarPdf}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{L.reformados}</CardTitle>
              <Wrench className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{reformados.length}</div>
              <p className="text-xs text-muted-foreground">
                {L.deOrdens(ordensFiltradas.length)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{L.fabricados}</CardTitle>
              <Hammer className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{fabricados}</div>
              <p className="text-xs text-muted-foreground">
                {L.fabricadosSub(percentualFabricados.toFixed(0))}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{L.indiceGarantia}</CardTitle>
              <ShieldCheck className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{indiceSemGarantia.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                {L.semAcionamento(totalRetornos)}
              </p>
              <Progress value={indiceSemGarantia} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{L.laudos}</CardTitle>
              <ClipboardCheck className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{testes.length}</div>
              <p className="text-xs text-muted-foreground">
                {L.laudosSub(testesAprovados, coberturaTestes.toFixed(0))}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{L.tempoMedio}</CardTitle>
              <Gauge className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{tempoMedioDias.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground">{L.diasEntre}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Factory className="h-5 w-5 text-primary" />
                {L.tipos}
              </CardTitle>
              <CardDescription>{L.tiposSub}</CardDescription>
            </CardHeader>
            <CardContent>
              {distribuicao.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">{L.semDados}</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={distribuicao}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      label={(entry: any) => `${entry.value}`}
                    >
                      {distribuicao.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
              <div className="mt-4 space-y-2">
                {distribuicao.map((d, i) => (
                  <div key={d.name} className="flex items-start justify-between gap-3 text-sm">
                    <span className="flex min-w-0 items-start gap-2">
                      <span
                        className="mt-1 h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                      />
                      <span className="break-words">{d.name}</span>
                    </span>
                    <span className="shrink-0 font-medium">
                      {d.value}{" "}
                      <span className="text-muted-foreground">
                        ({reformados.length ? ((d.value / reformados.length) * 100).toFixed(1) : "0"}%)
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                {L.confiabilidade}
              </CardTitle>
              <CardDescription>
                {L.confiabilidadeSub}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={garantiaChart}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={70}
                    outerRadius={105}
                    startAngle={90}
                    endAngle={-270}
                  >
                    <Cell fill="hsl(var(--chart-2))" />
                    <Cell fill="hsl(var(--destructive))" />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 space-y-2">
                {garantiaChart.map((g, i) => (
                  <div key={g.name} className="flex items-start justify-between gap-3 text-sm">
                    <span className="flex min-w-0 items-start gap-2">
                      <span
                        className="mt-1 h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: i === 0 ? "hsl(var(--chart-2))" : "hsl(var(--destructive))" }}
                      />
                      <span className="break-words">{g.name}</span>
                    </span>
                    <span className="shrink-0 font-medium">{g.value}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">{L.taxaRetorno}</p>
                  <p className="text-2xl font-bold">{indiceGarantia.toFixed(1)}%</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">{L.retornosRegistrados}</p>
                  <p className="text-2xl font-bold flex items-center gap-2">
                    <RotateCcw className="h-5 w-5 text-muted-foreground" />
                    {totalRetornos}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              {L.volume}
            </CardTitle>
            <CardDescription>{L.volumeSub}</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={porMes}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="entradas" name={L.recebidos} stroke="hsl(var(--chart-1))" strokeWidth={2} />
                <Line type="monotone" dataKey="entregas" name={L.entregues} stroke="hsl(var(--chart-2))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              {L.clientes}
            </CardTitle>
            <CardDescription>{L.clientesSub}</CardDescription>
          </CardHeader>
          <CardContent>
            {topClientes.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">{L.semDados}</p>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(240, topClientes.length * 40)}>
                <BarChart data={topClientes} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                  <YAxis type="category" dataKey="cliente" width={160} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="total" name={L.equipamentos} fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {loading && (
          <div className="text-center text-sm text-muted-foreground">{L.carregando}</div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{L.resumo}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Badge variant="secondary">{L.resumoReformados(reformados.length)}</Badge>
            {distribuicao.map((d) => (
              <Badge key={d.name} variant="outline">
                {d.name}: {d.value}
              </Badge>
            ))}
            <Badge variant="secondary">{L.resumoGarantia(indiceSemGarantia.toFixed(1))}</Badge>
            <Badge variant="secondary">{L.resumoLaudos(testes.length)}</Badge>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
