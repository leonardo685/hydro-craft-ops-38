import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Package, FileText, CheckCircle2, Receipt } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useEmpresaId } from "@/hooks/use-empresa-id";

export const RecentActivity = () => {
  const { empresaId } = useEmpresaId();
  
  const { data: atividades } = useQuery({
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
      return data;
    },
    enabled: !!empresaId,
    refetchInterval: 30000, // Atualiza a cada 30 segundos
  });

  const formatarTempo = (data: string) => {
    try {
      return formatDistanceToNow(new Date(data), {
        addSuffix: true,
        locale: ptBR
      });
    } catch {
      return 'recente';
    }
  };

  const getTipoAtividade = (tipo: string) => {
    const tipos: Record<string, { icon: any; color: string; bgColor: string }> = {
      'recebimento': { 
        icon: Package, 
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10'
      },
      'ordem_servico': { 
        icon: FileText, 
        color: 'text-purple-500',
        bgColor: 'bg-purple-500/10'
      },
      'ordem_finalizada': { 
        icon: CheckCircle2, 
        color: 'text-green-500',
        bgColor: 'bg-green-500/10'
      },
      'ordem_aguardando_retorno': { 
        icon: Clock, 
        color: 'text-orange-500',
        bgColor: 'bg-orange-500/10'
      },
      'orcamento': { 
        icon: FileText, 
        color: 'text-indigo-500',
        bgColor: 'bg-indigo-500/10'
      },
      'orcamento_aprovado': { 
        icon: CheckCircle2, 
        color: 'text-emerald-500',
        bgColor: 'bg-emerald-500/10'
      },
      'faturamento': { 
        icon: Receipt, 
        color: 'text-teal-500',
        bgColor: 'bg-teal-500/10'
      }
    };
    
    return tipos[tipo] || { 
      icon: Clock, 
      color: 'text-muted-foreground',
      bgColor: 'bg-muted'
    };
  };

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Atividades Recentes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!atividades || atividades.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma atividade recente
          </p>
        ) : (
          <div className="space-y-3">
            {atividades.map((atividade) => {
              const tipoInfo = getTipoAtividade(atividade.tipo);
              const IconComponent = tipoInfo.icon;
              
              return (
                <div 
                  key={atividade.id} 
                  className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                    tipoInfo.bgColor
                  )}>
                    <IconComponent className={cn("h-4 w-4", tipoInfo.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{atividade.descricao}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatarTempo(atividade.created_at)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
