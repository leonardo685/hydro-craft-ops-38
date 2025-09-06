
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, User, FileText, Settings, Camera } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useRecebimentos } from "@/hooks/use-recebimentos";
import { format } from "date-fns";

export default function DetalhesRecebimento() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { recebimentos, loading } = useRecebimentos();
  
  const recebimento = recebimentos.find(r => r.id === Number(id));

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </AppLayout>
    );
  }

  if (!recebimento) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Recebimento não encontrado</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            onClick={() => navigate("/recebimentos")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Ordem {recebimento.numero_ordem}</h2>
            <p className="text-muted-foreground">
              Detalhes do recebimento
            </p>
          </div>
          {recebimento.urgente && (
            <Badge variant="destructive" className="ml-auto">
              Urgente
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Informações Básicas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Informações Básicas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Cliente</p>
                  <p className="font-medium">{recebimento.cliente_nome}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Data de Entrada</p>
                  <p className="font-medium">{format(new Date(recebimento.data_entrada), 'dd/MM/yyyy')}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Nota Fiscal</p>
                  <p className="font-medium">{recebimento.nota_fiscal || '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Tipo Equipamento</p>
                  <p className="font-medium">{recebimento.tipo_equipamento}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Nº de Série</p>
                  <p className="font-medium">{recebimento.numero_serie || '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <Badge variant="outline">{recebimento.status}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dados Técnicos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Dados Técnicos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pressão de Trabalho</p>
                  <p className="font-medium">{recebimento.pressao_trabalho || '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Temperatura de Trabalho</p>
                  <p className="font-medium">{recebimento.temperatura_trabalho || '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Fluido de Trabalho</p>
                  <p className="font-medium">{recebimento.fluido_trabalho || '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Local de Instalação</p>
                  <p className="font-medium">{recebimento.local_instalacao || '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Potência</p>
                  <p className="font-medium">{recebimento.potencia || '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Na Empresa</p>
                  <Badge variant={recebimento.na_empresa ? "default" : "secondary"}>
                    {recebimento.na_empresa ? "Sim" : "Não"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Observações */}
          {recebimento.observacoes && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Observações</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm bg-muted p-3 rounded-md">{recebimento.observacoes}</p>
              </CardContent>
            </Card>
          )}

          {/* Fotos */}
          {recebimento.fotos && recebimento.fotos.length > 0 && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  Fotos do Equipamento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {recebimento.fotos.map((foto: any, index: number) => (
                    <div key={foto.id} className="space-y-2">
                      <div className="aspect-square bg-muted rounded-lg overflow-hidden">
                        <img
                          src={foto.arquivo_url}
                          alt={foto.nome_arquivo}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      {foto.apresentar_orcamento && (
                        <Badge variant="outline" className="text-xs">
                          Apresentar Orçamento
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
