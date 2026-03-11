import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Receipt, DollarSign, Clock, CheckCircle, TrendingUp, FileText, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEmpresa } from "@/contexts/EmpresaContext";
import { useRealtimeSubscription } from "@/hooks/use-realtime-subscription";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DashboardData {
  ordensAguardandoRetorno: number;
  orcamentosAguardandoFaturamento: number;
  notasFaturadas: number;
  totalFaturado: number;
  faturamentoMensal: { mes: string; valor: number }[];
  distribuicaoTipo: { name: string; value: number }[];
  ultimasNotas: {
    numero_ordem: string;
    cliente_nome: string;
    equipamento: string;
    tipo: string;
    data: string;
  }[];
}

export default function DashboardFaturamento() {
  const { empresaAtual } = useEmpresa();
  const [data, setData] = useState<DashboardData>({
    ordensAguardandoRetorno: 0,
    orcamentosAguardandoFaturamento: 0,
    notasFaturadas: 0,
    totalFaturado: 0,
    faturamentoMensal: [],
    distribuicaoTipo: [],
    ultimasNotas: [],
  });
  const [loading, setLoading] = useState(true);

  useRealtimeSubscription({
    tables: ["ordens_servico", "orcamentos", "recebimentos"],
    empresaId: empresaAtual?.id,
    onDataChange: () => loadDashboardData(),
    enabled: !!empresaAtual?.id,
  });

  useEffect(() => {
    if (empresaAtual?.id) loadDashboardData();
  }, [empresaAtual?.id]);

  const loadDashboardData = async () => {
    if (!empresaAtual?.id) return;
    setLoading(true);

    try {
      // Ordens aguardando retorno
      const { count: ordensCount } = await supabase
        .from("ordens_servico")
        .select("*", { count: "exact", head: true })
        .eq("empresa_id", empresaAtual.id)
        .in("status", ["aguardando_retorno", "reprovada", "aguardando_faturamento_sem_retorno"]);

      // Orçamentos aguardando faturamento
      const { count: orcamentosCount } = await supabase
        .from("orcamentos")
        .select("*", { count: "exact", head: true })
        .eq("empresa_id", empresaAtual.id)
        .eq("status", "aprovado");

      // Notas faturadas (ordens finalizadas)
      const { data: ordensFinalizadas } = await supabase
        .from("ordens_servico")
        .select(`
          numero_ordem, cliente_nome, equipamento, status, updated_at,
          recebimentos!left(numero_ordem, pdf_nota_retorno, nota_fiscal)
        `)
        .eq("empresa_id", empresaAtual.id)
        .eq("status", "finalizada")
        .order("updated_at", { ascending: false })
        .limit(50);

      // Orçamentos finalizados
      const { data: orcamentosFinalizados } = await supabase
        .from("orcamentos")
        .select("*")
        .eq("empresa_id", empresaAtual.id)
        .eq("status", "finalizado")
        .order("updated_at", { ascending: false })
        .limit(50);

      const totalNotas = (ordensFinalizadas?.length || 0) + (orcamentosFinalizados?.length || 0);
      const totalFaturado = (orcamentosFinalizados || []).reduce((acc, orc) => acc + (orc.valor || 0), 0);

      // Faturamento mensal (últimos 6 meses)
      const faturamentoMensal: { mes: string; valor: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const mesDate = subMonths(new Date(), i);
        const inicio = startOfMonth(mesDate).toISOString();
        const fim = endOfMonth(mesDate).toISOString();

        const { data: orcMes } = await supabase
          .from("orcamentos")
          .select("valor")
          .eq("empresa_id", empresaAtual.id)
          .eq("status", "finalizado")
          .gte("updated_at", inicio)
          .lte("updated_at", fim);

        const valorMes = (orcMes || []).reduce((acc, o) => acc + (o.valor || 0), 0);
        faturamentoMensal.push({
          mes: format(mesDate, "MMM/yy", { locale: ptBR }),
          valor: valorMes,
        });
      }

      // Distribuição por tipo
      const notasRetorno = ordensFinalizadas?.filter(o => {
        const rec = Array.isArray(o.recebimentos) ? o.recebimentos[0] : o.recebimentos;
        return rec?.pdf_nota_retorno;
      }).length || 0;

      const notasFiscais = orcamentosFinalizados?.filter(o => o.numero_nf).length || 0;
      const semNota = totalNotas - notasRetorno - notasFiscais;

      const distribuicaoTipo = [
        { name: "Notas de Retorno", value: notasRetorno },
        { name: "Notas Fiscais", value: notasFiscais },
        { name: "Sem Nota", value: Math.max(0, semNota) },
      ].filter(d => d.value > 0);

      // Últimas notas
      const ultimasNotas = [
        ...(ordensFinalizadas || []).slice(0, 5).map(o => {
          const rec = Array.isArray(o.recebimentos) ? o.recebimentos[0] : o.recebimentos;
          return {
            numero_ordem: rec?.numero_ordem || o.numero_ordem,
            cliente_nome: o.cliente_nome,
            equipamento: o.equipamento,
            tipo: rec?.pdf_nota_retorno ? "Nota de Retorno" : "Ordem Finalizada",
            data: o.updated_at,
          };
        }),
        ...(orcamentosFinalizados || []).slice(0, 5).map(o => ({
          numero_ordem: o.numero || o.ordem_referencia || "-",
          cliente_nome: o.cliente_nome,
          equipamento: o.equipamento,
          tipo: o.numero_nf ? "Nota Fiscal" : "Orçamento Finalizado",
          data: o.updated_at,
        })),
      ]
        .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
        .slice(0, 10);

      setData({
        ordensAguardandoRetorno: ordensCount || 0,
        orcamentosAguardandoFaturamento: orcamentosCount || 0,
        notasFaturadas: totalNotas,
        totalFaturado,
        faturamentoMensal,
        distribuicaoTipo,
        ultimasNotas,
      });
    } catch (error) {
      console.error("Erro ao carregar dashboard de faturamento:", error);
    } finally {
      setLoading(false);
    }
  };

  const CHART_COLORS = [
    "hsl(var(--primary))",
    "hsl(var(--accent))",
    "hsl(var(--muted-foreground))",
  ];

  const formatCurrency = (value: number) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard de Faturamento</h1>
          <p className="text-muted-foreground mt-1">Visão geral do faturamento e notas fiscais</p>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Aguardando Retorno</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{data.ordensAguardandoRetorno}</div>
              <p className="text-xs text-muted-foreground mt-1">Ordens pendentes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Aguardando Faturamento</CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{data.orcamentosAguardandoFaturamento}</div>
              <p className="text-xs text-muted-foreground mt-1">Orçamentos aprovados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Notas Emitidas</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{data.notasFaturadas}</div>
              <p className="text-xs text-muted-foreground mt-1">Total faturadas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Faturado</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{formatCurrency(data.totalFaturado)}</div>
              <p className="text-xs text-muted-foreground mt-1">Valor acumulado</p>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Faturamento Mensal</CardTitle>
              <CardDescription>Últimos 6 meses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {data.faturamentoMensal.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.faturamentoMensal}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="mes" className="text-xs fill-muted-foreground" />
                      <YAxis
                        className="text-xs fill-muted-foreground"
                        tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                      />
                      <Tooltip
                        formatter={(value: number) => [formatCurrency(value), "Faturado"]}
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          color: "hsl(var(--foreground))",
                        }}
                      />
                      <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    Sem dados para exibir
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Distribuição por Tipo</CardTitle>
              <CardDescription>Notas emitidas por categoria</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {data.distribuicaoTipo.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.distribuicaoTipo}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {data.distribuicaoTipo.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          color: "hsl(var(--foreground))",
                        }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    Sem dados para exibir
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabela de últimas notas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Últimas Movimentações</CardTitle>
            <CardDescription>Últimas notas e ordens finalizadas</CardDescription>
          </CardHeader>
          <CardContent>
            {data.ultimasNotas.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ordem</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Equipamento</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.ultimasNotas.map((nota, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{nota.numero_ordem}</TableCell>
                      <TableCell>{nota.cliente_nome}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{nota.equipamento}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{nota.tipo}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(nota.data), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma movimentação recente encontrada
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
