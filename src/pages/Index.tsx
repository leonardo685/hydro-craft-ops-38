import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ClipboardList, 
  Search, 
  Calculator, 
  CheckCircle, 
  Receipt,
  TrendingUp,
  Clock,
  DollarSign
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const navigate = useNavigate();

  // Buscar estatísticas reais do banco de dados
  const { data: statsData } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const [recebimentos, orcamentos, ordens] = await Promise.all([
        supabase.from('recebimentos').select('status', { count: 'exact' }),
        supabase.from('orcamentos').select('status', { count: 'exact' }).eq('status', 'pendente'),
        supabase.from('ordens_servico').select('status', { count: 'exact' }).eq('status', 'em_andamento')
      ]);

      const emAnalise = recebimentos.data?.filter(r => r.status === 'em_analise').length || 0;

      return {
        totalRecebimentos: recebimentos.count || 0,
        emAnalise,
        orcamentosPendentes: orcamentos.count || 0,
        projetosAndamento: ordens.count || 0
      };
    }
  });

  const stats = [
    { label: "Equipamentos Recebidos", value: statsData?.totalRecebimentos.toString() || "0", icon: ClipboardList, color: "text-primary" },
    { label: "Em Análise", value: statsData?.emAnalise.toString() || "0", icon: Search, color: "text-warning" },
    { label: "Orçamentos Pendentes", value: statsData?.orcamentosPendentes.toString() || "0", icon: Calculator, color: "text-accent" },
    { label: "Projetos em Andamento", value: statsData?.projetosAndamento.toString() || "0", icon: CheckCircle, color: "text-primary" }
  ];

  const quickActions = [
    { title: "Novo Recebimento", description: "Registrar equipamento recebido", icon: ClipboardList, path: "/recebimentos" },
    { title: "Iniciar Análise", description: "Avaliar equipamento", icon: Search, path: "/analise" },
    { title: "Criar Orçamento", description: "Gerar proposta comercial", icon: Calculator, path: "/orcamentos" },
    { title: "Emitir Nota Fiscal", description: "Faturar serviço concluído", icon: Receipt, path: "/faturamento" }
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-primary rounded-xl p-6 text-primary-foreground shadow-medium">
          <h1 className="text-3xl font-bold mb-2">Bem-vindo ao HydroFix ERP</h1>
          <p className="text-lg opacity-90">
            Sistema completo de gestão para reforma de equipamentos hidráulicos
          </p>
          <div className="flex items-center gap-2 mt-4 text-sm opacity-80">
            <Clock className="h-4 w-4" />
            <span>Última atualização: {new Date().toLocaleDateString('pt-BR')}</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <Card key={index} className="shadow-soft hover:shadow-medium transition-smooth">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="bg-primary-light p-2 rounded-lg">
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Ações Rápidas
            </CardTitle>
            <CardDescription>
              Acesse rapidamente as principais funcionalidades do sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {quickActions.map((action, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-center gap-3 hover:bg-primary-light hover:border-primary transition-smooth"
                  onClick={() => navigate(action.path)}
                >
                  <action.icon className="h-8 w-8 text-primary" />
                  <div className="text-center">
                    <p className="font-medium">{action.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{action.description}</p>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Atividades Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { action: "Motor Hidráulico 10HP recebido", time: "2 horas atrás", type: "recebimento" },
                { action: "Orçamento ORC-2024-003 aprovado", time: "5 horas atrás", type: "aprovacao" },
                { action: "Análise de Bomba Centrífuga finalizada", time: "1 dia atrás", type: "analise" },
                { action: "Nota Fiscal NF-2024-002 emitida", time: "2 dias atrás", type: "faturamento" }
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <div className="w-2 h-2 bg-primary rounded-full" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.action}</p>
                    <p className="text-xs text-muted-foreground">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Index;
