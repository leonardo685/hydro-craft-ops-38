import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Calendar, User, Package, Settings, Wrench, Camera } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const VisualizarOrdemServico = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  
  const [ordem, setOrdem] = useState<any>(null);
  const [recebimento, setRecebimento] = useState<any>(null);
  const [fotos, setFotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [prazoEntrega, setPrazoEntrega] = useState<string>("");

  useEffect(() => {
    if (id) {
      carregarOrdemServico();
    }
  }, [id]);

  const carregarOrdemServico = async () => {
    try {
      // Buscar ordem de serviço
      const { data: ordemData } = await supabase
        .from('ordens_servico')
        .select('*')
        .eq('numero_ordem', id)
        .maybeSingle();

      if (ordemData) {
        setOrdem(ordemData);
        setPrazoEntrega(ordemData.tempo_estimado || "");

        // Buscar dados do recebimento
        if (ordemData.recebimento_id) {
          const { data: recebimentoData } = await supabase
            .from('recebimentos')
            .select('*')
            .eq('id', ordemData.recebimento_id)
            .maybeSingle();

          if (recebimentoData) {
            setRecebimento(recebimentoData);
          }

          // Buscar fotos do equipamento
          const { data: fotosData } = await supabase
            .from('fotos_equipamentos')
            .select('*')
            .eq('recebimento_id', ordemData.recebimento_id);

          if (fotosData) {
            setFotos(fotosData);
          }
        }
      }
    } catch (error) {
      console.error('Erro ao carregar ordem de serviço:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar ordem de serviço",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const atualizarPrazoEntrega = async () => {
    if (!ordem) return;

    try {
      const { error } = await supabase
        .from('ordens_servico')
        .update({ tempo_estimado: prazoEntrega })
        .eq('id', ordem.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Prazo de entrega atualizado com sucesso",
      });
    } catch (error) {
      console.error('Erro ao atualizar prazo:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar prazo de entrega",
        variant: "destructive",
      });
    }
  };

  const renderItems = (items: any[], title: string, icon: React.ReactNode) => {
    if (!items || items.length === 0) return null;

    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {icon}
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.map((item, index) => (
            <div key={index} className="p-3 bg-muted/50 rounded-lg">
              <div className="font-medium">
                {item.descricao || item.nome || 'Item não especificado'}
              </div>
              {item.quantidade && (
                <div className="text-sm text-muted-foreground">
                  Quantidade: {item.quantidade}
                </div>
              )}
              {item.observacoes && (
                <div className="text-sm text-muted-foreground">
                  Obs: {item.observacoes}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Carregando...</div>
        </div>
      </AppLayout>
    );
  }

  if (!ordem) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Ordem de serviço não encontrada</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            onClick={() => navigate('/aprovados')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Visualizar Ordem de Serviço</h1>
            <p className="text-muted-foreground">
              Visualizando ordem: {ordem.numero_ordem} - {ordem.cliente_nome}
            </p>
          </div>
        </div>

        {/* Informações Básicas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📋 Informações Básicas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Cliente</Label>
                <div className="text-red-600 font-medium">{ordem.cliente_nome}</div>
              </div>
              <div>
                <Label>Data de Entrada</Label>
                <div>{new Date(ordem.data_entrada).toLocaleDateString('pt-BR')}</div>
              </div>
              <div>
                <Label>Nota Fiscal</Label>
                <div>{recebimento?.nota_fiscal || '-'}</div>
              </div>
              <div>
                <Label>Nº da Ordem</Label>
                <div>{ordem.numero_ordem}</div>
              </div>
              <div>
                <Label>Tipo de Equipamento</Label>
                <div>{ordem.equipamento}</div>
              </div>
              <div>
                <Label>Nº de Série</Label>
                <div>{recebimento?.numero_serie || '-'}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fotos da Chegada do Equipamento */}
        {fotos.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Fotos da Chegada do Equipamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {fotos.map((foto, index) => (
                  <div key={foto.id} className="space-y-2">
                    <img
                      src={foto.arquivo_url}
                      alt={foto.nome_arquivo}
                      className="w-full h-48 object-cover rounded-lg border"
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={foto.apresentar_orcamento}
                        readOnly
                        className="h-4 w-4"
                      />
                      <Label className="text-sm">Apresentar Orçamento</Label>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Dados Técnicos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              ⚙️ Dados Técnicos (Editáveis)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Tipo Equipamento</Label>
                <div>{ordem.equipamento}</div>
              </div>
              <div>
                <Label>Pressão de Trabalho</Label>
                <div>{recebimento?.pressao_trabalho || 'Ex: 350 bar'}</div>
              </div>
              <div>
                <Label>Camisa</Label>
                <div>Ex: 100mm</div>
              </div>
              <div>
                <Label>Haste x Comprimento</Label>
                <div>Ex: 800mm</div>
              </div>
              <div>
                <Label>Curso</Label>
                <div>Ex: 600mm</div>
              </div>
              <div>
                <Label>Conexão A</Label>
                <div>Ex: 3/4 NPT</div>
              </div>
              <div>
                <Label>Conexão B</Label>
                <div>Ex: 1/2 NPT</div>
              </div>
              <div>
                <Label>Prazo de Entrega</Label>
                <div className="flex gap-2">
                  <Input
                    value={prazoEntrega}
                    onChange={(e) => setPrazoEntrega(e.target.value)}
                    placeholder="Ex: 5 dias úteis"
                  />
                  <Button onClick={atualizarPrazoEntrega} size="sm">
                    Salvar
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Observações */}
        {(ordem.observacoes_tecnicas || recebimento?.observacoes) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                📝 Observações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {ordem.observacoes_tecnicas && (
                  <div>
                    <Label>Observações de Entrada</Label>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      {ordem.observacoes_tecnicas}
                    </div>
                  </div>
                )}
                {recebimento?.observacoes && (
                  <div>
                    <Label>Observações Adicionais</Label>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      {recebimento.observacoes}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Dados de Peritagem */}
        {recebimento && (
          <Card>
            <CardHeader>
              <CardTitle>Dados de Peritagem</CardTitle>
              <CardDescription>Informações da peritagem técnica</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <Label className="text-sm font-medium">Problemas Identificados</Label>
                  <div className="p-3 bg-muted/50 rounded-lg mt-2">
                    {ordem.descricao_problema || ordem.tipo_problema || 'Nenhum problema específico identificado'}
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Observações Adicionais</Label>
                  <div className="p-3 bg-muted/50 rounded-lg mt-2">
                    {ordem.solucao_proposta || 'Nenhuma observação adicional'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Serviços */}
        {renderItems(
          ordem.servicos_necessarios,
          "Serviços",
          <Wrench className="h-5 w-5" />
        )}

        {/* Peças Utilizadas */}
        {renderItems(
          ordem.pecas_necessarias,
          "Peças Utilizadas",
          <Package className="h-5 w-5" />
        )}

        {/* Usinagem */}
        {renderItems(
          ordem.usinagem_necessaria,
          "Usinagem",
          <Settings className="h-5 w-5" />
        )}
      </div>
    </AppLayout>
  );
};

export default VisualizarOrdemServico;