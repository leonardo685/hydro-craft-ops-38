
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, User, FileText, Settings, Camera } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";

export default function DetalhesRecebimento() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [recebimento, setRecebimento] = useState<any>(null);

  useEffect(() => {
    const recebimentos = JSON.parse(localStorage.getItem('recebimentos') || '[]');
    const item = recebimentos.find((r: any) => r.id === id);
    setRecebimento(item);
  }, [id]);

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
            <h2 className="text-2xl font-bold text-foreground">Ordem {recebimento.numeroOrdem}</h2>
            <p className="text-muted-foreground">
              Detalhes do recebimento
            </p>
          </div>
          {recebimento.urgencia && (
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
                  <p className="font-medium text-red-500">{recebimento.cliente}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Data de Entrada</p>
                  <p className="font-medium">{recebimento.dataEntrada}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Nota Fiscal</p>
                  <p className="font-medium">{recebimento.notaFiscal}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">TAG</p>
                  <p className="font-medium">{recebimento.tag}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Solicitante</p>
                  <p className="font-medium">{recebimento.solicitante}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Nº de Série</p>
                  <p className="font-medium">{recebimento.numeroSerie}</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Tipo de Manutenção</p>
                <div className="flex gap-2">
                  {recebimento.manutencaoCorretiva && (
                    <Badge variant="outline">Corretiva</Badge>
                  )}
                  {recebimento.manutencaoPreventiva && (
                    <Badge variant="outline">Preventiva</Badge>
                  )}
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
                  <p className="text-sm font-medium text-muted-foreground">Tipo Equipamento</p>
                  <p className="font-medium">{recebimento.tipoEquipamento}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pressão de Trabalho</p>
                  <p className="font-medium">{recebimento.pressaoTrabalho}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Camisa</p>
                  <p className="font-medium">{recebimento.camisa}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Haste x Comprimento</p>
                  <p className="font-medium">{recebimento.hasteComprimento}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Curso</p>
                  <p className="font-medium">{recebimento.curso}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Conexão A</p>
                  <p className="font-medium">{recebimento.conexaoA}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Conexão B</p>
                  <p className="font-medium">{recebimento.conexaoB}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Observações */}
          {(recebimento.observacoesEntrada || recebimento.observacoesPeritagem) && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Observações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {recebimento.observacoesEntrada && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Observações de Entrada</p>
                    <p className="text-sm bg-muted p-3 rounded-md">{recebimento.observacoesEntrada}</p>
                  </div>
                )}
                {recebimento.observacoesPeritagem && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Observações de Peritagem</p>
                    <p className="text-sm bg-muted p-3 rounded-md">{recebimento.observacoesPeritagem}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Fotos */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Fotos do Equipamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {recebimento.fotos && recebimento.fotos.map((foto: any, index: number) => (
                  <div key={index} className="aspect-square bg-muted rounded-lg overflow-hidden">
                    {foto ? (
                      <img
                        src={foto}
                        alt={`Foto ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Camera className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    {recebimento.apresentarOrcamento[index] && (
                      <Badge variant="outline" className="mt-2">
                        Apresentar Orçamento
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
