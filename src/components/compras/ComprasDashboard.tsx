import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEmpresa } from "@/contexts/EmpresaContext";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { Package, ShoppingCart, Clock, Users, TrendingUp } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, subMonths, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DashboardData {
  abertas: number;
  cotando: number;
  compradasMes: number;
  prazoMedioFornecedores: number;
  totalFornecedores: number;
  comprasPorMes: { mes: string; total: number }[];
  topFornecedores: { nome: string; total: number }[];
  ordensAbertas: { numero_ordem: string; cliente_nome: string; status: string; dias: number }[];
}

const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2, 200 70% 50%))", "hsl(var(--chart-3, 30 80% 55%))", "hsl(var(--chart-4, 280 60% 55%))", "hsl(var(--chart-5, 160 60% 45%))"];

export function ComprasDashboard() {
  const { empresaAtual } = useEmpresa();
  const [data, setData] = useState<DashboardData>({
    abertas: 0,
    cotando: 0,
    compradasMes: 0,
    prazoMedioFornecedores: 0,
    totalFornecedores: 0,
    comprasPorMes: [],
    topFornecedores: [],
    ordensAbertas: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!empresaAtual?.id) return;
    loadData();
  }, [empresaAtual?.id]);

  const loadData = async () => {
    if (!empresaAtual?.id) return;
    setLoading(true);
    try {
      const [comprasRes, fornecRes] = await Promise.all([
        supabase
          .from("compras")
          .select(`
            id, status, data_compra, fornecedor, created_at,
            ordens_servico ( numero_ordem, cliente_nome, status )
          `)
          .eq("empresa_id", empresaAtual.id),
        supabase
          .from("fornecedores")
          .select("id, nome, prazo_pagamento_padrao_dias")
          .eq("empresa_id", empresaAtual.id),
      ]);

      const compras = comprasRes.data || [];
      const fornecedores = fornecRes.data || [];

      const inicioMes = startOfMonth(new Date()).getTime();
      const abertas = compras.filter((c) => c.status === "aprovado").length;
      const cotando = compras.filter((c) => c.status === "cotando").length;
      const compradasMes = compras.filter(
        (c) => c.status === "comprado" && c.data_compra && new Date(c.data_compra).getTime() >= inicioMes
      ).length;

      const prazos = fornecedores.map((f: any) => f.prazo_pagamento_padrao_dias || 0).filter((n) => n > 0);
      const prazoMedio = prazos.length ? Math.round(prazos.reduce((a, b) => a + b, 0) / prazos.length) : 0;

      // Compras por mês (últimos 6 meses)
      const comprasPorMes: { mes: string; total: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const ref = subMonths(new Date(), i);
        const ini = startOfMonth(ref).getTime();
        const fim = i === 0 ? Date.now() : startOfMonth(subMonths(new Date(), i - 1)).getTime();
        const total = compras.filter(
          (c) => c.status === "comprado" && c.data_compra && new Date(c.data_compra).getTime() >= ini && new Date(c.data_compra).getTime() < fim
        ).length;
        comprasPorMes.push({ mes: format(ref, "MMM/yy", { locale: ptBR }), total });
      }

      // Top fornecedores por nº de compras
      const contagem = new Map<string, number>();
      compras.forEach((c: any) => {
        if (c.status === "comprado" && c.fornecedor) {
          contagem.set(c.fornecedor, (contagem.get(c.fornecedor) || 0) + 1);
        }
      });
      const topFornecedores = Array.from(contagem.entries())
        .map(([nome, total]) => ({ nome, total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

      // Ordens em aberto + dias paradas
      const ordensAbertas = compras
        .filter((c: any) => c.status !== "comprado" && c.ordens_servico)
        .map((c: any) => ({
          numero_ordem: c.ordens_servico.numero_ordem,
          cliente_nome: c.ordens_servico.cliente_nome,
          status: c.status,
          dias: Math.floor((Date.now() - new Date(c.created_at).getTime()) / 86400000),
        }))
        .sort((a, b) => b.dias - a.dias)
        .slice(0, 10);

      setData({
        abertas,
        cotando,
        compradasMes,
        prazoMedioFornecedores: prazoMedio,
        totalFornecedores: fornecedores.length,
        comprasPorMes,
        topFornecedores,
        ordensAbertas,
      });
    } finally {
      setLoading(false);
    }
  };

  const kpis = useMemo(() => ([
    { title: "Compras em aberto", value: data.abertas, icon: ShoppingCart, hint: "Aguardando início" },
    { title: "Em cotação", value: data.cotando, icon: Package, hint: "Aguardando fornecedor" },
    { title: "Compradas no mês", value: data.compradasMes, icon: TrendingUp, hint: "Fechadas este mês" },
    { title: "Prazo médio (DDL)", value: `${data.prazoMedioFornecedores} dias`, icon: Clock, hint: "Negociado com fornecedores" },
    { title: "Fornecedores ativos", value: data.totalFornecedores, icon: Users, hint: "Cadastrados na base" },
  ]), [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpi.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{kpi.hint}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Compras finalizadas (últimos 6 meses)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.comprasPorMes}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="mes" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top 5 fornecedores (por nº de compras)</CardTitle>
          </CardHeader>
          <CardContent>
            {data.topFornecedores.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">
                Nenhuma compra fechada com fornecedor informado ainda.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={data.topFornecedores} dataKey="total" nameKey="nome" outerRadius={90} label>
                    {data.topFornecedores.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ordens com compras em aberto</CardTitle>
        </CardHeader>
        <CardContent>
          {data.ordensAbertas.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma ordem em aberto.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ordem</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Dias em aberto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.ordensAbertas.map((o, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{o.numero_ordem}</TableCell>
                    <TableCell>{o.cliente_nome}</TableCell>
                    <TableCell>
                      <Badge variant={o.status === "aprovado" ? "secondary" : "default"}>
                        {o.status === "aprovado" ? "Aprovado" : "Cotando"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={o.dias > 7 ? "destructive" : "outline"}>{o.dias} dias</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}