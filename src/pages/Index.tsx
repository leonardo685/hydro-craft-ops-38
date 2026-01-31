import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardList, Search, Calculator, CheckCircle, Receipt, TrendingUp, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RecentActivity } from "@/components/RecentActivity";
import { useEmpresaId } from "@/hooks/use-empresa-id";

const Index = () => {
  const navigate = useNavigate();
  const { empresaId, loading: empresaLoading } = useEmpresaId();

  // Buscar estatísticas reais do banco de dados - filtrado por empresa
  const {
    data: statsData
  } = useQuery({
    queryKey: ['dashboard-stats', empresaId],
    queryFn: async () => {
      if (!empresaId) return null;
      
      const [recebimentos, orcamentos, ordensAprovadas] = await Promise.all([
        supabase.from('recebimentos').select('status', { count: 'exact' }).eq('empresa_id', empresaId),
        supabase.from('orcamentos').select('status', { count: 'exact' }).eq('status', 'pendente').eq('empresa_id', empresaId),
        supabase.from('orcamentos').select('status', { count: 'exact' }).eq('status', 'aprovado').eq('empresa_id', empresaId)
      ]);
      
      const aguardandoAnalise = recebimentos.data?.filter(r => r.status === 'recebido').length || 0;
      return {
        totalRecebimentos: recebimentos.count || 0,
        emAnalise: aguardandoAnalise,
        orcamentosPendentes: orcamentos.count || 0,
        ordensAprovadas: ordensAprovadas.count || 0
      };
    },
    enabled: !!empresaId
  });

  // Buscar atividades recentes do banco de dados - filtrado por empresa
  const {
    data: atividadesRecentes
  } = useQuery({
    queryKey: ['atividades-recentes', empresaId],
    queryFn: async () => {
      if (!empresaId) return [];
      
      const { data, error } = await supabase
        .from('atividades_sistema')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: false })
        .limit(5);
        
      if (error) throw error;
      return data || [];
    },
    enabled: !!empresaId
  });

  // Função para formatar tempo relativo
  const formatarTempoRelativo = (dataStr: string) => {
    const data = new Date(dataStr);
    const agora = new Date();
    const diffMs = agora.getTime() - data.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHoras = Math.floor(diffMs / 3600000);
    const diffDias = Math.floor(diffMs / 86400000);
    if (diffMins < 60) {
      return diffMins <= 1 ? 'agora mesmo' : `${diffMins} minutos atrás`;
    } else if (diffHoras < 24) {
      return diffHoras === 1 ? '1 hora atrás' : `${diffHoras} horas atrás`;
    } else {
      return diffDias === 1 ? '1 dia atrás' : `${diffDias} dias atrás`;
    }
  };
  const stats = [{
    label: "Equipamentos Recebidos",
    value: statsData?.totalRecebimentos.toString() || "0",
    icon: ClipboardList,
    color: "text-primary"
  }, {
    label: "Aguardando Análise",
    value: statsData?.emAnalise.toString() || "0",
    icon: Search,
    color: "text-warning"
  }, {
    label: "Orçamentos Pendentes",
    value: statsData?.orcamentosPendentes.toString() || "0",
    icon: Calculator,
    color: "text-accent"
  }, {
    label: "Ordens Aprovadas",
    value: statsData?.ordensAprovadas.toString() || "0",
    icon: CheckCircle,
    color: "text-success"
  }];
  const quickActions = [{
    title: "Novo Recebimento",
    description: "Registrar equipamento recebido",
    icon: ClipboardList,
    path: "/recebimentos"
  }, {
    title: "Fazer Lançamento",
    description: "Registrar movimentação financeira",
    icon: Receipt,
    path: "/dfc?tab=extrato"
  }, {
    title: "Criar Orçamento",
    description: "Gerar proposta comercial",
    icon: Calculator,
    path: "/orcamentos"
  }, {
    title: "Emitir Nota Fiscal",
    description: "Faturar serviço concluído",
    icon: Receipt,
    path: "/faturamento"
  }];
  return <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-primary rounded-xl p-6 text-primary-foreground shadow-medium">
          <h1 className="text-3xl font-bold mb-2">Bem-vindo ao FixZys ERP</h1>
          <p className="text-lg opacity-90">Sistema completo de gestão para reforma de equipamentos industriais</p>
          <div className="flex items-center gap-2 mt-4 text-sm opacity-80">
            <Clock className="h-4 w-4" />
            <span>Última atualização: {new Date().toLocaleDateString('pt-BR')}</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => <Card key={index} className="shadow-soft hover:shadow-medium transition-smooth">
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
            </Card>)}
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
              {quickActions.map((action, index) => <Button key={index} variant="outline" className="h-auto p-4 flex flex-col items-center gap-3 hover:bg-primary-light hover:border-primary transition-smooth" onClick={() => navigate(action.path)}>
                  <action.icon className="h-8 w-8 text-primary" />
                  <div className="text-center">
                    <p className="font-medium">{action.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{action.description}</p>
                  </div>
                </Button>)}
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
              {atividadesRecentes && atividadesRecentes.length > 0 ? atividadesRecentes.map(atividade => <div key={atividade.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                    <div className="w-2 h-2 bg-primary rounded-full" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{atividade.descricao}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatarTempoRelativo(atividade.created_at)}
                      </p>
                    </div>
                  </div>) : <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">Nenhuma atividade registrada ainda</p>
                  <p className="text-xs mt-1">As atividades aparecerão aqui conforme você usar o sistema</p>
                </div>}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>;
};
export default Index;