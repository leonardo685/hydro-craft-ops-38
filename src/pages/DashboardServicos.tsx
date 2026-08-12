import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wrench, ShieldCheck, ClipboardCheck, Factory, Users, Gauge, RotateCcw, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEmpresa } from "@/contexts/EmpresaContext";
import { useRealtimeSubscription } from "@/hooks/use-realtime-subscription";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";
import { format, parseISO, subMonths, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

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

export default function DashboardServicos() {
  const { empresaAtual } = useEmpresa();
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
          .select("id, numero_ordem, cliente_nome, equipamento, categoria_equipamento, status, data_entrada, data_finalizacao, updated_at, recebimento_id")
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
      .map(([name, value]) => ({ name, value }))
      .filter((d) => d.value > 0);
  }, [reformados]);

  const porMes = useMemo(() => {
    const meses = periodo === "all" ? 12 : parseInt(periodo, 10);
    const base = Array.from({ length: meses }, (_, i) => {
      const d = startOfMonth(subMonths(new Date(), meses - 1 - i));
      return { chave: format(d, "yyyy-MM"), mes: format(d, "MMM/yy", { locale: ptBR }), entradas: 0, entregas: 0 };
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
  }, [ordens, periodo]);

  const topClientes = useMemo(() => {
    const mapa = new Map<string, number>();
    reformados.forEach((o) => {
      const nome = (o.cliente_nome || "Não informado").trim();
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

  const ordensComTeste = useMemo(() => {
    const ids = new Set(testes.map((t) => t.ordem_servico_id));
    return reformados.filter((o) => ids.has(o.id)).length;
  }, [testes, reformados]);

  const coberturaTestes = reformados.length > 0 ? (ordensComTeste / reformados.length) * 100 : 0;
  const totalRetornos = retornos.length;
  const indiceGarantia = reformados.length > 0 ? (totalRetornos / reformados.length) * 100 : 0;
  const indiceSemGarantia = 100 - indiceGarantia;

  const garantiaChart = [
    { name: "Sem acionamento de garantia", value: Math.max(reformados.length - totalRetornos, 0) },
    { name: "Retornos em garantia", value: totalRetornos },
  ];

  return (
    <AppLayout>
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground md:text-3xl">Dashboard de Serviços</h1>
            <p className="text-sm text-muted-foreground">
              Panorama dos equipamentos reformados, tipos atendidos e desempenho de garantia
            </p>
          </div>
          <Select value={periodo} onValueChange={setPeriodo}>
            <SelectTrigger className="w-full md:w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">Últimos 3 meses</SelectItem>
              <SelectItem value="6">Últimos 6 meses</SelectItem>
              <SelectItem value="12">Últimos 12 meses</SelectItem>
              <SelectItem value="24">Últimos 24 meses</SelectItem>
              <SelectItem value="all">Todo o período</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Equipamentos reformados</CardTitle>
              <Wrench className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{reformados.length}</div>
              <p className="text-xs text-muted-foreground">
                de {ordensFiltradas.length} ordens no período
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Índice de garantia</CardTitle>
              <ShieldCheck className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{indiceSemGarantia.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                sem acionamento de garantia ({totalRetornos} retornos)
              </p>
              <Progress value={indiceSemGarantia} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Laudos de teste</CardTitle>
              <ClipboardCheck className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{testes.length}</div>
              <p className="text-xs text-muted-foreground">
                {testesAprovados} aprovados · {coberturaTestes.toFixed(0)}% de cobertura
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tempo médio de reforma</CardTitle>
              <Gauge className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{tempoMedioDias.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground">dias entre entrada e entrega</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Factory className="h-5 w-5 text-primary" />
                Tipos de equipamento atendidos
              </CardTitle>
              <CardDescription>Distribuição dos equipamentos reformados por família</CardDescription>
            </CardHeader>
            <CardContent>
              {distribuicao.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">Sem dados no período</p>
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
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
              <div className="mt-4 space-y-2">
                {distribuicao.map((d, i) => (
                  <div key={d.name} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                      />
                      {d.name}
                    </span>
                    <span className="font-medium">
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
                Confiabilidade e garantia
              </CardTitle>
              <CardDescription>
                Equipamentos que não retornaram por garantia após a reforma
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
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 grid grid-cols-2 gap-4">
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Taxa de retorno em garantia</p>
                  <p className="text-2xl font-bold">{indiceGarantia.toFixed(1)}%</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Retornos registrados</p>
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
              Volume de serviços por mês
            </CardTitle>
            <CardDescription>Equipamentos recebidos e entregues</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={porMes}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="entradas" name="Recebidos" stroke="hsl(var(--chart-1))" strokeWidth={2} />
                <Line type="monotone" dataKey="entregas" name="Entregues" stroke="hsl(var(--chart-2))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Principais clientes atendidos
            </CardTitle>
            <CardDescription>Quantidade de equipamentos reformados por cliente</CardDescription>
          </CardHeader>
          <CardContent>
            {topClientes.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">Sem dados no período</p>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(240, topClientes.length * 40)}>
                <BarChart data={topClientes} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                  <YAxis type="category" dataKey="cliente" width={160} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="total" name="Equipamentos" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {loading && (
          <div className="text-center text-sm text-muted-foreground">Carregando indicadores...</div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resumo para apresentação ao cliente</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Badge variant="secondary">{reformados.length} equipamentos reformados</Badge>
            {distribuicao.map((d) => (
              <Badge key={d.name} variant="outline">
                {d.name}: {d.value}
              </Badge>
            ))}
            <Badge variant="secondary">{indiceSemGarantia.toFixed(1)}% sem garantia acionada</Badge>
            <Badge variant="secondary">{testes.length} laudos de teste emitidos</Badge>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
