import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ChevronRight, ChevronLeft, Package, Settings, Search } from "lucide-react";
import { OrdemServicoModal } from "@/components/OrdemServicoModal";
import { EditableItemsModal } from "@/components/EditableItemsModal";

interface Compra {
  id: string;
  ordem_servico_id: string;
  status: 'aprovado' | 'cotando' | 'comprado';
  observacoes: string | null;
  data_cotacao: string | null;
  data_compra: string | null;
  fornecedor: string | null;
  numero_pedido: string | null;
  ordens_servico: {
    id: string;
    numero_ordem: string;
    cliente_nome: string;
    equipamento: string;
    pecas_necessarias: any[];
    usinagem_necessaria: any[];
    servicos_necessarios: any[];
    recebimento_id: number | null;
    observacoes_tecnicas: string | null;
    updated_at: string;
    recebimentos: {
      cliente_nome: string;
      numero_ordem: string;
      tipo_equipamento: string;
    } | null;
  };
}

export default function Compras() {
  const [compras, setCompras] = useState<Compra[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroNumero, setFiltroNumero] = useState("");

  const loadCompras = async () => {
    try {
      const { data, error } = await supabase
        .from("compras")
        .select(`
          *,
          ordens_servico (
            id,
            numero_ordem,
            cliente_nome,
            equipamento,
            pecas_necessarias,
            usinagem_necessaria,
            servicos_necessarios,
            recebimento_id,
            observacoes_tecnicas,
            updated_at,
            recebimentos (
              cliente_nome,
              numero_ordem,
              tipo_equipamento
            )
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCompras((data || []) as Compra[]);
    } catch (error: any) {
      toast.error("Erro ao carregar compras: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompras();
  }, []);

  const updateStatus = async (compraId: string, newStatus: 'aprovado' | 'cotando' | 'comprado') => {
    try {
      const updates: any = { status: newStatus };
      
      if (newStatus === 'cotando' && !compras.find(c => c.id === compraId)?.data_cotacao) {
        updates.data_cotacao = new Date().toISOString();
      }
      
      if (newStatus === 'comprado') {
        updates.data_compra = new Date().toISOString();
      }

      const { error } = await supabase
        .from("compras")
        .update(updates)
        .eq("id", compraId);

      if (error) throw error;
      
      toast.success("Status atualizado com sucesso!");
      loadCompras();
    } catch (error: any) {
      toast.error("Erro ao atualizar status: " + error.message);
    }
  };

  const renderColumn = (status: 'aprovado' | 'cotando' | 'comprado', title: string) => {
    const comprasStatus = compras.filter(c => {
      if (c.status !== status) return false;
      
      // Filtro por número de pedido
      if (filtroNumero && !c.ordens_servico.numero_ordem.toLowerCase().includes(filtroNumero.toLowerCase())) {
        return false;
      }
      
      // Para coluna "Comprado", mostrar apenas itens das últimas 24 horas
      if (status === 'comprado' && c.data_compra) {
        const dataCompra = new Date(c.data_compra);
        const agora = new Date();
        const diffHoras = (agora.getTime() - dataCompra.getTime()) / (1000 * 60 * 60);
        return diffHoras <= 24;
      }
      
      return true;
    });
    
    return (
      <div className="flex-1 min-w-[320px]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <span>{title}</span>
              <Badge variant="secondary">{comprasStatus.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {comprasStatus.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma compra neste status
              </div>
            ) : (
              comprasStatus.map((compra) => {
                const pecasCount = compra.ordens_servico.pecas_necessarias?.length || 0;
                
                return (
                  <Card key={compra.id} className="border-2">
                    <CardContent className="pt-4 space-y-3">
                      <div>
                        <OrdemServicoModal ordem={compra.ordens_servico}>
                          <button className="font-semibold text-lg text-primary hover:underline cursor-pointer">
                            {compra.ordens_servico.numero_ordem}
                          </button>
                        </OrdemServicoModal>
                        <div className="text-sm text-muted-foreground">
                          {compra.ordens_servico.recebimentos?.cliente_nome || compra.ordens_servico.cliente_nome}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {compra.ordens_servico.equipamento}
                        </div>
                      </div>
                      
                      <Badge variant="outline">
                        {pecasCount} {pecasCount === 1 ? 'peça' : 'peças'}
                      </Badge>
                      
                      <div className="flex flex-wrap gap-2">
                        <EditableItemsModal
                          title="Peças Necessárias"
                          type="pecas"
                          ordemId={compra.ordens_servico.id}
                          onUpdate={loadCompras}
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                          >
                            <Package className="h-4 w-4 mr-2" />
                            Peças
                          </Button>
                        </EditableItemsModal>
                        
                        <EditableItemsModal
                          title="Usinagem Necessária"
                          type="usinagem"
                          ordemId={compra.ordens_servico.id}
                          onUpdate={loadCompras}
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                          >
                            <Settings className="h-4 w-4 mr-2" />
                            Usinagem
                          </Button>
                        </EditableItemsModal>
                      </div>
                      
                      <div className="flex gap-2 pt-2">
                        {status !== 'aprovado' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const prevStatus = status === 'cotando' ? 'aprovado' : 'cotando';
                              updateStatus(compra.id, prevStatus);
                            }}
                            className="flex-1"
                          >
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            Voltar
                          </Button>
                        )}
                        
                        {status !== 'comprado' && (
                          <Button
                            size="sm"
                            onClick={() => {
                              const nextStatus = status === 'aprovado' ? 'cotando' : 'comprado';
                              updateStatus(compra.id, nextStatus);
                            }}
                            className="flex-1"
                          >
                            {status === 'aprovado' ? 'Iniciar Cotação' : 'Finalizar Compra'}
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando compras...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Compras</h1>
            <p className="text-muted-foreground">
              Gestão de compras de peças para ordens de serviço
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por número..."
              value={filtroNumero}
              onChange={(e) => setFiltroNumero(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-4">
          {renderColumn('aprovado', 'Aprovado')}
          {renderColumn('cotando', 'Cotando')}
          {renderColumn('comprado', 'Comprado')}
        </div>
      </div>
    </AppLayout>
  );
}
