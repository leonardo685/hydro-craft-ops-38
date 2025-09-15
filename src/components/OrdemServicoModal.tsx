import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Calendar, Package, Settings, Wrench, FileText, Camera, MapPin, Thermometer, Gauge } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface OrdemServicoModalProps {
  ordem: any;
  children: React.ReactNode;
}

export function OrdemServicoModal({ ordem, children }: OrdemServicoModalProps) {
  const [open, setOpen] = useState(false);
  const [recebimento, setRecebimento] = useState<any>(null);
  const [fotos, setFotos] = useState<any[]>([]);

  useEffect(() => {
    if (open && ordem.recebimento_id) {
      carregarDadosCompletos();
    }
  }, [open, ordem.recebimento_id]);

  const carregarDadosCompletos = async () => {
    try {
      // Buscar dados do recebimento
      const { data: recebimentoData } = await supabase
        .from('recebimentos')
        .select('*')
        .eq('id', ordem.recebimento_id)
        .single();

      if (recebimentoData) {
        setRecebimento(recebimentoData);
      }

      // Buscar fotos do equipamento
      const { data: fotosData } = await supabase
        .from('fotos_equipamentos')
        .select('*')
        .eq('recebimento_id', ordem.recebimento_id);

      if (fotosData) {
        setFotos(fotosData);
      }
    } catch (error) {
      console.error('Erro ao carregar dados completos:', error);
    }
  };

  const renderItems = (items: any[], title: string, icon: React.ReactNode) => {
    if (!items || items.length === 0) return null;

    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            {icon}
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {items.map((item, index) => (
            <div key={index} className="p-3 bg-muted/50 rounded-lg">
              <div className="font-medium">{item.descricao || item.nome || 'Item não especificado'}</div>
              {item.quantidade && (
                <div className="text-sm text-muted-foreground">Quantidade: {item.quantidade}</div>
              )}
              {item.observacoes && (
                <div className="text-sm text-muted-foreground">Obs: {item.observacoes}</div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Ordem de Serviço - {ordem.recebimentos?.numero_ordem || ordem.numero_ordem}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações Básicas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações Gerais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Cliente:</span>
                  <span>{ordem.recebimentos?.cliente_nome || ordem.cliente_nome}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Equipamento:</span>
                  <span>{ordem.recebimentos?.tipo_equipamento || ordem.equipamento}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Data de Aprovação:</span>
                  <span>{new Date(ordem.updated_at).toLocaleDateString('pt-BR')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Status:</span>
                  <Badge className="bg-green-100 text-green-700 border-green-200">
                    Aprovada
                  </Badge>
                </div>
              </div>
              
              {ordem.observacoes_tecnicas && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-2">Observações Técnicas:</h4>
                    <p className="text-muted-foreground bg-muted/50 p-3 rounded-lg">
                      {ordem.observacoes_tecnicas}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Peças Necessárias */}
          {renderItems(
            ordem.pecas_necessarias,
            "Peças Necessárias",
            <Package className="h-4 w-4" />
          )}

          {/* Usinagem Necessária */}
          {renderItems(
            ordem.usinagem_necessaria,
            "Usinagem Necessária",
            <Settings className="h-4 w-4" />
          )}

          {/* Serviços Necessários */}
          {renderItems(
            ordem.servicos_necessarios,
            "Serviços Necessários",
            <Wrench className="h-4 w-4" />
          )}

          {/* Dados da Perícia */}
          {recebimento && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Dados da Perícia
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Data de Entrada:</span>
                    <span>{new Date(recebimento.data_entrada).toLocaleDateString('pt-BR')}</span>
                  </div>
                  {recebimento.numero_serie && (
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Número de Série:</span>
                      <span>{recebimento.numero_serie}</span>
                    </div>
                  )}
                  {recebimento.potencia && (
                    <div className="flex items-center gap-2">
                      <Gauge className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Potência:</span>
                      <span>{recebimento.potencia}</span>
                    </div>
                  )}
                  {recebimento.pressao_trabalho && (
                    <div className="flex items-center gap-2">
                      <Gauge className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Pressão de Trabalho:</span>
                      <span>{recebimento.pressao_trabalho}</span>
                    </div>
                  )}
                  {recebimento.temperatura_trabalho && (
                    <div className="flex items-center gap-2">
                      <Thermometer className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Temperatura de Trabalho:</span>
                      <span>{recebimento.temperatura_trabalho}</span>
                    </div>
                  )}
                  {recebimento.fluido_trabalho && (
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Fluido de Trabalho:</span>
                      <span>{recebimento.fluido_trabalho}</span>
                    </div>
                  )}
                  {recebimento.local_instalacao && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Local de Instalação:</span>
                      <span>{recebimento.local_instalacao}</span>
                    </div>
                  )}
                  {recebimento.urgente && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Urgente:</span>
                      <Badge variant="destructive">SIM</Badge>
                    </div>
                  )}
                </div>
                
                {recebimento.observacoes && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-medium mb-2">Observações:</h4>
                      <p className="text-muted-foreground bg-muted/50 p-3 rounded-lg">
                        {recebimento.observacoes}
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Fotos do Equipamento */}
          {fotos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  Fotos do Equipamento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {fotos.map((foto, index) => (
                    <div key={foto.id} className="space-y-2">
                      <img
                        src={foto.arquivo_url}
                        alt={foto.nome_arquivo}
                        className="w-full h-48 object-cover rounded-lg border"
                      />
                      <p className="text-sm text-muted-foreground text-center">
                        {foto.nome_arquivo}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}