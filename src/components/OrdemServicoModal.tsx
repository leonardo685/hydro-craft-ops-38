import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Calendar, Package, Settings, Wrench, FileText } from "lucide-react";

interface OrdemServicoModalProps {
  ordem: any;
  children: React.ReactNode;
}

export function OrdemServicoModal({ ordem, children }: OrdemServicoModalProps) {
  const [open, setOpen] = useState(false);

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
        </div>
      </DialogContent>
    </Dialog>
  );
}