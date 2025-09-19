import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Eye, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface OrdemAguardandoRetorno {
  id: string;
  numero_ordem: string;
  cliente_nome: string;
  equipamento: string;
  data_entrada: string;
  status: string;
  observacoes_tecnicas?: string;
}

export function OrdensAguardandoRetorno() {
  const [ordens, setOrdens] = useState<OrdemAguardandoRetorno[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadOrdens();
  }, []);

  const loadOrdens = async () => {
    try {
      const { data, error } = await supabase
        .from('ordens_servico')
        .select('*')
        .eq('status', 'aguardando_retorno')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrdens(data || []);
    } catch (error) {
      console.error('Erro ao carregar ordens:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar ordens aguardando retorno",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEmitirNotaRetorno = async (ordem: OrdemAguardandoRetorno) => {
    try {
      const { error } = await supabase
        .from('ordens_servico')
        .update({ status: 'retornado' })
        .eq('id', ordem.id);

      if (error) throw error;

      toast({
        title: "Nota de retorno emitida",
        description: `Nota de retorno para ordem ${ordem.numero_ordem} foi emitida`,
      });

      loadOrdens();
    } catch (error) {
      console.error('Erro ao emitir nota de retorno:', error);
      toast({
        title: "Erro",
        description: "Erro ao emitir nota de retorno",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-muted-foreground">Carregando ordens...</p>
        </CardContent>
      </Card>
    );
  }

  if (ordens.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            Nenhuma ordem aguardando retorno
          </h3>
          <p className="text-muted-foreground">
            Ordens finalizadas aparecerão aqui para emissão de nota de retorno
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {ordens.map((ordem) => (
        <Card key={ordem.id} className="shadow-soft hover:shadow-medium transition-smooth">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Ordem {ordem.numero_ordem}
                </CardTitle>
                <CardDescription className="mt-1">
                  {ordem.equipamento} - {ordem.cliente_nome}
                </CardDescription>
              </div>
              <Badge className="bg-purple-100 text-purple-700 border-purple-200">
                Aguardando Retorno
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4 p-4 bg-gradient-secondary rounded-lg">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Data de Entrada</p>
                  <p className="font-medium">
                    {new Date(ordem.data_entrada).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="font-medium">Teste Concluído</p>
                </div>
              </div>
            </div>

            {ordem.observacoes_tecnicas && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Observações Técnicas:</p>
                <p className="text-sm">{ordem.observacoes_tecnicas}</p>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button 
                size="sm" 
                className="bg-gradient-primary"
                onClick={() => handleEmitirNotaRetorno(ordem)}
              >
                <FileText className="h-4 w-4 mr-1" />
                Emitir Nota de Retorno
              </Button>
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-1" />
                Visualizar Ordem
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}