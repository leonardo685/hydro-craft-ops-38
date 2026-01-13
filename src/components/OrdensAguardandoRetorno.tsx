import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Eye, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { EmitirNotaRetornoModal } from "./EmitirNotaRetornoModal";
import { useNavigate } from "react-router-dom";
interface OrdemAguardandoRetorno {
  id: string;
  numero_ordem: string;
  cliente_nome: string;
  equipamento: string;
  data_entrada: string;
  status: string;
  observacoes_tecnicas?: string;
  recebimento_id?: number;
  nota_fiscal?: string;
  orcamento_vinculado?: string;
}
export function OrdensAguardandoRetorno({
  isExpanded = true,
  onToggleExpand,
  ordensExternas
}: {
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  ordensExternas?: OrdemAguardandoRetorno[];
}) {
  const [ordens, setOrdens] = useState<OrdemAguardandoRetorno[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [ordemSelecionada, setOrdemSelecionada] = useState<OrdemAguardandoRetorno | null>(null);
  const {
    toast
  } = useToast();
  const navigate = useNavigate();
  
  useEffect(() => {
    // Se há ordens externas, usa elas e não carrega
    if (ordensExternas) {
      setOrdens(ordensExternas);
      setLoading(false);
    } else {
      loadOrdens();
    }
  }, [ordensExternas]);
  
  const loadOrdens = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('ordens_servico').select(`
          *,
          recebimentos!left(nota_fiscal, numero_ordem),
          orcamentos!ordem_servico_id(numero)
        `).eq('status', 'aguardando_retorno').order('created_at', {
        ascending: false
      });
      if (error) throw error;
      
      const ordensFormatadas = data?.map(ordem => {
        // Priorizar número do recebimento sempre
        const numeroExibicao = ordem.recebimentos?.numero_ordem || ordem.numero_ordem;
        const orcamento = Array.isArray(ordem.orcamentos) 
          ? ordem.orcamentos[0] 
          : ordem.orcamentos;
        
        console.log(`✅ Ordem ${ordem.id}: OS número = ${ordem.numero_ordem}, Recebimento número = ${ordem.recebimentos?.numero_ordem}, Exibindo = ${numeroExibicao}`);
        
        return {
          ...ordem,
          numero_ordem: numeroExibicao,
          nota_fiscal: ordem.recebimentos?.nota_fiscal,
          orcamento_vinculado: orcamento?.numero
        };
      }) || [];
      setOrdens(ordensFormatadas);
    } catch (error) {
      console.error('Erro ao carregar ordens:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar ordens aguardando retorno",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const handleAbrirModal = (ordem: OrdemAguardandoRetorno) => {
    setOrdemSelecionada(ordem);
    setModalOpen(true);
  };
  const handleVisualizarOrdem = (id: string) => {
    navigate(`/visualizar-ordem-servico/${id}`);
  };
  const handleEmitirNotaRetorno = async (ordemId: string) => {
    try {
      // Buscar o recebimento_id da ordem
      const { data: ordem, error: ordemError } = await supabase
        .from('ordens_servico')
        .select('recebimento_id')
        .eq('id', ordemId)
        .single();

      if (ordemError) throw ordemError;

      // Atualizar status da ordem para faturado
      const { error } = await supabase
        .from('ordens_servico')
        .update({ status: 'faturado' })
        .eq('id', ordemId);
      
      if (error) throw error;

      // Atualizar na_empresa do recebimento para false
      if (ordem?.recebimento_id) {
        const { error: recebimentoError } = await supabase
          .from('recebimentos')
          .update({ na_empresa: false })
          .eq('id', ordem.recebimento_id);

        if (recebimentoError) {
          console.error('Erro ao atualizar recebimento:', recebimentoError);
        }
      }

      toast({
        title: "Nota de retorno confirmada",
        description: "A ordem foi movida para faturadas"
      });
      loadOrdens();
    } catch (error) {
      console.error('Erro ao confirmar emissão:', error);
      toast({
        title: "Erro",
        description: "Erro ao confirmar emissão da nota",
        variant: "destructive"
      });
    }
  };
  if (loading) {
    return <div>
        {/* Header com controle de expansão */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Ordens Aguardando Retorno</h3>
          {onToggleExpand && <Button variant="ghost" size="sm" onClick={onToggleExpand} className="flex items-center gap-2">
              {isExpanded ? <>
                  <ChevronUp className="h-4 w-4" />
                  Recolher
                </> : <>
                  <ChevronDown className="h-4 w-4" />
                  Expandir
                </>}
            </Button>}
        </div>

        {isExpanded && <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">Carregando ordens...</p>
            </CardContent>
          </Card>}
      </div>;
  }
  return <div>
      {/* Header com controle de expansão */}
      <div className="flex items-center justify-between mb-4">
        
        {onToggleExpand && <Button variant="ghost" size="sm" onClick={onToggleExpand} className="flex items-center gap-2">
            {isExpanded ? <>
                <ChevronUp className="h-4 w-4" />
                Recolher
              </> : <>
                <ChevronDown className="h-4 w-4" />
                Expandir
              </>}
          </Button>}
      </div>

      {isExpanded && <>
          <div className="space-y-4">
            {ordens.map(ordem => <Card key={ordem.id} className="shadow-soft hover:shadow-medium transition-smooth">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Ordem {ordem.numero_ordem}
                  {ordem.numero_ordem.startsWith('OS-') && ordem.numero_ordem.match(/^OS-\d{13}/) && (
                    <Badge variant="destructive" className="text-xs">
                      Formato Antigo
                    </Badge>
                  )}
                  {ordem.orcamento_vinculado && (
                    <Badge className="bg-green-500 hover:bg-green-600 text-white text-xs">
                      #{ordem.orcamento_vinculado}
                    </Badge>
                  )}
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
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Nota de Entrada</p>
                        <p className="font-medium">{ordem.nota_fiscal || '-'}</p>
                      </div>
                    </div>
                  </div>

                  {ordem.observacoes_tecnicas && <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Observações Técnicas:</p>
                      <p className="text-sm">{ordem.observacoes_tecnicas}</p>
                    </div>}

                  <div className="flex gap-2 pt-2">
                    <Button size="sm" className="bg-gradient-primary" onClick={() => handleAbrirModal(ordem)}>
                      <FileText className="h-4 w-4 mr-1" />
                      Emitir Nota de Retorno
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleVisualizarOrdem(ordem.id)}>
                      <Eye className="h-4 w-4 mr-1" />
                      Visualizar Ordem
                    </Button>
                  </div>
                </CardContent>
              </Card>)}
          </div>

          {ordens.length === 0 && <Card>
              <CardContent className="p-12 text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  Nenhuma ordem aguardando retorno
                </h3>
                <p className="text-muted-foreground">
                  Ordens finalizadas aparecerão aqui para emissão de nota de retorno
                </p>
              </CardContent>
            </Card>}
        </>}

      {ordemSelecionada && <EmitirNotaRetornoModal open={modalOpen} onOpenChange={setModalOpen} ordem={ordemSelecionada} onConfirm={handleEmitirNotaRetorno} />}
    </div>;
}