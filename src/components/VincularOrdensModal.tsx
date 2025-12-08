import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, Link2, Loader2, Unlink } from "lucide-react";

interface VincularOrdensModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orcamento: any;
  onSuccess: () => void;
}

export function VincularOrdensModal({ 
  open, 
  onOpenChange, 
  orcamento,
  onSuccess
}: VincularOrdensModalProps) {
  const [ordensDisponiveis, setOrdensDisponiveis] = useState<any[]>([]);
  const [ordensVinculadas, setOrdensVinculadas] = useState<any[]>([]);
  const [ordensSelecionadas, setOrdensSelecionadas] = useState<string[]>([]);
  const [ordensParaDesvincular, setOrdensParaDesvincular] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && orcamento) {
      carregarOrdens();
    }
  }, [open, orcamento]);

  const carregarOrdens = async () => {
    setLoading(true);
    try {
      // Buscar ordens já vinculadas a este orçamento
      const { data: vinculadas, error: errorVinculadas } = await supabase
        .from('ordens_servico')
        .select(`
          *,
          recebimentos:recebimento_id (
            numero_ordem
          )
        `)
        .eq('orcamento_id', orcamento.id)
        .order('created_at', { ascending: false });

      if (errorVinculadas) throw errorVinculadas;
      setOrdensVinculadas(vinculadas || []);

      // Buscar ordens disponíveis (sem vínculo com orçamento)
      const { data: disponiveis, error: errorDisponiveis } = await supabase
        .from('ordens_servico')
        .select(`
          *,
          recebimentos:recebimento_id (
            numero_ordem
          )
        `)
        .is('orcamento_id', null)
        .order('created_at', { ascending: false });

      if (errorDisponiveis) throw errorDisponiveis;
      setOrdensDisponiveis(disponiveis || []);

    } catch (error) {
      console.error('Erro ao carregar ordens:', error);
      toast.error('Erro ao carregar ordens de serviço');
    } finally {
      setLoading(false);
    }
  };

  const getNumeroOrdem = (ordem: any) => {
    return ordem.recebimentos?.numero_ordem || ordem.numero_ordem;
  };

  const filtrarOrdens = (ordens: any[]) => {
    if (!searchTerm) return ordens;
    const termo = searchTerm.toLowerCase();
    return ordens.filter(ordem => 
      getNumeroOrdem(ordem)?.toLowerCase().includes(termo) ||
      ordem.cliente_nome?.toLowerCase().includes(termo) ||
      ordem.equipamento?.toLowerCase().includes(termo)
    );
  };

  const toggleOrdemSelecionada = (ordemId: string) => {
    setOrdensSelecionadas(prev => 
      prev.includes(ordemId) 
        ? prev.filter(id => id !== ordemId)
        : [...prev, ordemId]
    );
  };

  const toggleOrdemParaDesvincular = (ordemId: string) => {
    setOrdensParaDesvincular(prev => 
      prev.includes(ordemId) 
        ? prev.filter(id => id !== ordemId)
        : [...prev, ordemId]
    );
  };

  const handleSalvar = async () => {
    if (ordensSelecionadas.length === 0 && ordensParaDesvincular.length === 0) {
      toast.error('Selecione pelo menos uma ordem para vincular ou desvincular');
      return;
    }

    setSaving(true);
    try {
      const isOrcamentoAprovado = orcamento.status === 'aprovado' || orcamento.status === 'faturamento';

      // Vincular novas ordens selecionadas
      if (ordensSelecionadas.length > 0) {
        const { error: errorVincular } = await supabase
          .from('ordens_servico')
          .update({ 
            orcamento_id: orcamento.id,
            valor_estimado: orcamento.valor,
            // Se orçamento já está aprovado, aprovar as OS também
            ...(isOrcamentoAprovado && { status: 'aprovada' })
          })
          .in('id', ordensSelecionadas);

        if (errorVincular) throw errorVincular;
      }

      // Desvincular ordens marcadas
      if (ordensParaDesvincular.length > 0) {
        const { error: errorDesvincular } = await supabase
          .from('ordens_servico')
          .update({ 
            orcamento_id: null,
            valor_estimado: null
          })
          .in('id', ordensParaDesvincular);

        if (errorDesvincular) throw errorDesvincular;
      }

      const mensagens = [];
      if (ordensSelecionadas.length > 0) {
        mensagens.push(`${ordensSelecionadas.length} ordem(ns) vinculada(s)`);
      }
      if (ordensParaDesvincular.length > 0) {
        mensagens.push(`${ordensParaDesvincular.length} ordem(ns) desvinculada(s)`);
      }

      toast.success(mensagens.join(' e '));
      
      setOrdensSelecionadas([]);
      setOrdensParaDesvincular([]);
      onSuccess();
      onOpenChange(false);

    } catch (error) {
      console.error('Erro ao vincular ordens:', error);
      toast.error('Erro ao vincular ordens de serviço');
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      'em_andamento': { label: 'Em Andamento', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
      'em_analise': { label: 'Em Análise', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
      'aprovada': { label: 'Aprovada', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
      'finalizada': { label: 'Finalizada', className: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400' },
    };
    return statusMap[status] || { label: status, className: 'bg-gray-100 text-gray-800' };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Vincular Ordens de Serviço
          </DialogTitle>
          <DialogDescription>
            Orçamento #{orcamento?.numero} - {orcamento?.cliente_nome}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por número, cliente ou equipamento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Ordens Vinculadas */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <span className="text-green-600">●</span>
                  Ordens Vinculadas ({ordensVinculadas.length})
                </h3>
                <ScrollArea className="h-[300px] border rounded-md p-2">
                  {ordensVinculadas.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhuma ordem vinculada
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {filtrarOrdens(ordensVinculadas).map((ordem) => {
                        const statusInfo = getStatusBadge(ordem.status);
                        const isSelected = ordensParaDesvincular.includes(ordem.id);
                        return (
                          <div
                            key={ordem.id}
                            className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                              isSelected 
                                ? 'border-red-500 bg-red-50 dark:bg-red-900/20' 
                                : 'hover:bg-muted/50'
                            }`}
                            onClick={() => toggleOrdemParaDesvincular(ordem.id)}
                          >
                            <div className="flex items-start gap-3">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleOrdemParaDesvincular(ordem.id)}
                                className="mt-1"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium text-sm">
                                    {getNumeroOrdem(ordem)}
                                  </span>
                                  <Badge className={statusInfo.className} variant="secondary">
                                    {statusInfo.label}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground truncate">
                                  {ordem.cliente_nome}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {ordem.equipamento}
                                </p>
                              </div>
                            </div>
                            {isSelected && (
                              <div className="mt-2 flex items-center gap-1 text-xs text-red-600">
                                <Unlink className="h-3 w-3" />
                                Será desvinculada
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </div>

              {/* Ordens Disponíveis */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <span className="text-gray-400">●</span>
                  Ordens Disponíveis ({ordensDisponiveis.length})
                </h3>
                <ScrollArea className="h-[300px] border rounded-md p-2">
                  {ordensDisponiveis.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhuma ordem disponível
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {filtrarOrdens(ordensDisponiveis).map((ordem) => {
                        const statusInfo = getStatusBadge(ordem.status);
                        const isSelected = ordensSelecionadas.includes(ordem.id);
                        return (
                          <div
                            key={ordem.id}
                            className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                              isSelected 
                                ? 'border-primary bg-primary/10' 
                                : 'hover:bg-muted/50'
                            }`}
                            onClick={() => toggleOrdemSelecionada(ordem.id)}
                          >
                            <div className="flex items-start gap-3">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleOrdemSelecionada(ordem.id)}
                                className="mt-1"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium text-sm">
                                    {getNumeroOrdem(ordem)}
                                  </span>
                                  <Badge className={statusInfo.className} variant="secondary">
                                    {statusInfo.label}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground truncate">
                                  {ordem.cliente_nome}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {ordem.equipamento}
                                </p>
                              </div>
                            </div>
                            {isSelected && (
                              <div className="mt-2 flex items-center gap-1 text-xs text-primary">
                                <Link2 className="h-3 w-3" />
                                Será vinculada
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>
          )}

          {/* Resumo */}
          {(ordensSelecionadas.length > 0 || ordensParaDesvincular.length > 0) && (
            <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg text-sm">
              {ordensSelecionadas.length > 0 && (
                <span className="text-primary">
                  <Link2 className="h-4 w-4 inline mr-1" />
                  {ordensSelecionadas.length} para vincular
                </span>
              )}
              {ordensParaDesvincular.length > 0 && (
                <span className="text-red-600">
                  <Unlink className="h-4 w-4 inline mr-1" />
                  {ordensParaDesvincular.length} para desvincular
                </span>
              )}
            </div>
          )}

          {/* Info sobre aprovação automática */}
          {(orcamento?.status === 'aprovado' || orcamento?.status === 'faturamento') && ordensSelecionadas.length > 0 && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-700 dark:text-green-400">
              As ordens vinculadas serão automaticamente aprovadas pois o orçamento já está aprovado.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSalvar}
            disabled={saving || (ordensSelecionadas.length === 0 && ordensParaDesvincular.length === 0)}
          >
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
