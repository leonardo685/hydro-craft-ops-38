import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Badge } from "@/components/ui/badge";
import { RadarChart, PolarAngleAxis, PolarGrid, Radar } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEmpresa } from "@/contexts/EmpresaContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { AlertTriangle, Loader2 } from "lucide-react";

// Mapeamento das chaves de motivo de falha para tradução
const FAILURE_REASONS = {
  revisao_completa: { ptBR: "Revisão Completa", en: "Complete Revision" },
  haste_quebrada: { ptBR: "Haste Quebrada", en: "Broken Rod" },
  vazamento_vedacoes: { ptBR: "Vazamento nas Vedações", en: "Seal Leakage" },
  outros: { ptBR: "Outros", en: "Others" },
};

export function FailureReasonChart() {
  const { empresaAtual } = useEmpresa();
  const { t, language } = useLanguage();

  const { data: chartData = [], isLoading } = useQuery({
    queryKey: ['failure-reasons', empresaAtual?.id],
    queryFn: async () => {
      if (!empresaAtual?.id) return [];

      const { data, error } = await supabase
        .from('ordens_servico')
        .select('motivo_falha')
        .eq('empresa_id', empresaAtual.id)
        .not('motivo_falha', 'is', null);

      if (error) throw error;

      // Contar ocorrências de cada motivo
      const counts: Record<string, number> = {};
      
      (data || []).forEach((ordem) => {
        const motivo = ordem.motivo_falha || 'outros';
        counts[motivo] = (counts[motivo] || 0) + 1;
      });

      // Transformar para formato do radar chart
      return Object.entries(FAILURE_REASONS).map(([key, labels]) => ({
        reason: language === 'pt-BR' ? labels.ptBR : labels.en,
        count: counts[key] || 0,
      }));
    },
    enabled: !!empresaAtual?.id,
  });

  const totalOrdens = chartData.reduce((acc, item) => acc + item.count, 0);

  const chartConfig: ChartConfig = {
    count: {
      label: language === 'pt-BR' ? "Quantidade" : "Count",
      color: "hsl(var(--primary))",
    },
  };

  const hasData = totalOrdens > 0;

  return (
    <Card>
      <CardHeader className="items-center pb-4">
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-warning" />
          {language === 'pt-BR' ? 'Motivos de Falha' : 'Failure Reasons'}
          {hasData && (
            <Badge
              variant="outline"
              className="text-primary bg-primary/10 border-none ml-2"
            >
              <span>{totalOrdens} {language === 'pt-BR' ? 'ordens' : 'orders'}</span>
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          {language === 'pt-BR' 
            ? 'Distribuição dos motivos de falha mais comuns' 
            : 'Distribution of the most common failure reasons'}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-[250px]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !hasData ? (
          <div className="flex flex-col items-center justify-center h-[250px] text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mb-2 opacity-50" />
            <p className="text-sm">
              {language === 'pt-BR' 
                ? 'Nenhum dado de falha registrado' 
                : 'No failure data recorded'}
            </p>
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="mx-auto aspect-square max-h-[250px]"
          >
            <RadarChart data={chartData}>
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              <PolarAngleAxis 
                dataKey="reason" 
                tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }}
              />
              <PolarGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <Radar
                stroke="hsl(var(--primary))"
                dataKey="count"
                fill="hsl(var(--primary))"
                fillOpacity={0.3}
                filter="url(#stroke-line-glow)"
              />
              <defs>
                <filter
                  id="stroke-line-glow"
                  x="-20%"
                  y="-20%"
                  width="140%"
                  height="140%"
                >
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
            </RadarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
