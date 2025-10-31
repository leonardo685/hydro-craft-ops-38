import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  FileText, 
  Download, 
  CheckCircle, 
  XCircle, 
  Calendar,
  Building2,
  Wrench,
  Video,
  Gauge,
  Thermometer,
  Clock,
  FileCheck
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface OrdemServico {
  id: string;
  numero_ordem: string;
  cliente_nome: string;
  equipamento: string;
  data_entrada: string;
  data_analise: string | null;
  status: string;
}

interface TesteEquipamento {
  id: string;
  tipo_teste: string;
  resultado_teste: string;
  data_hora_teste: string;
  pressao_teste: string | null;
  temperatura_operacao: string | null;
  check_vazamento_pistao: boolean | null;
  check_vazamento_vedacoes_estaticas: boolean | null;
  check_vazamento_haste: boolean | null;
  check_ok: boolean | null;
  observacoes_teste: string | null;
  video_url: string | null;
  curso: string | null;
  qtd_ciclos: string | null;
  pressao_maxima_trabalho: string | null;
  tempo_minutos: string | null;
  pressao_avanco: string | null;
  pressao_retorno: string | null;
  teste_performance_pr004: string | null;
  espessura_camada: string | null;
  observacao: string | null;
}

interface FotoEquipamento {
  id: string;
  arquivo_url: string;
  nome_arquivo: string;
}

export default function LaudoPublico() {
  const { numeroOrdem } = useParams<{ numeroOrdem: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [ordemServico, setOrdemServico] = useState<OrdemServico | null>(null);
  const [teste, setTeste] = useState<TesteEquipamento | null>(null);
  const [fotos, setFotos] = useState<FotoEquipamento[]>([]);

  useEffect(() => {
    const verificarAcessoECarregarDados = async () => {
      if (!numeroOrdem) {
        toast.error("Número da ordem não encontrado");
        navigate("/");
        return;
      }

      try {
        // Buscar recebimento
        const { data: recebimento, error: recebimentoError } = await supabase
          .from("recebimentos")
          .select("id, pdf_nota_retorno")
          .eq("numero_ordem", numeroOrdem)
          .maybeSingle();

        if (recebimentoError) throw recebimentoError;

        if (!recebimento) {
          toast.error("Ordem não encontrada");
          navigate("/");
          return;
        }

        // Buscar ordem de serviço
        const { data: ordem, error: ordemError } = await supabase
          .from("ordens_servico")
          .select("*")
          .eq("recebimento_id", recebimento.id)
          .maybeSingle();

        if (ordemError) throw ordemError;

        if (!ordem) {
          toast.error("Ordem de serviço não encontrada");
          navigate("/");
          return;
        }

        // Verificar se existe laudo técnico criado (teste) para a ordem
        const { data: testeCheck, error: testeCheckError } = await supabase
          .from("testes_equipamentos")
          .select("id")
          .eq("ordem_servico_id", ordem.id)
          .maybeSingle();

        if (testeCheckError) throw testeCheckError;

        // Se não existe laudo técnico nem nota de retorno, ordem não está pronta
        if (!testeCheck && !recebimento?.pdf_nota_retorno) {
          toast.error("Esta ordem ainda não foi finalizada");
          navigate("/");
          return;
        }

        setOrdemServico(ordem);

        // Buscar teste do equipamento
        const { data: testeData, error: testeError } = await supabase
          .from("testes_equipamentos")
          .select("*")
          .eq("ordem_servico_id", ordem.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (testeError) throw testeError;

        setTeste(testeData);

        // Buscar fotos do equipamento
        const { data: fotosData, error: fotosError } = await supabase
          .from("fotos_equipamentos")
          .select("id, arquivo_url, nome_arquivo")
          .eq("recebimento_id", recebimento.id);

        if (fotosError) throw fotosError;

        setFotos(fotosData || []);
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        toast.error("Erro ao carregar laudo");
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    verificarAcessoECarregarDados();
  }, [numeroOrdem, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando laudo...</p>
        </div>
      </div>
    );
  }

  if (!ordemServico) {
    return null;
  }

  const ResultadoBadge = ({ resultado }: { resultado: string }) => {
    if (resultado === 'aprovado') {
      return <Badge className="bg-green-500 hover:bg-green-600"><CheckCircle className="w-3 h-3 mr-1" /> Aprovado</Badge>;
    }
    return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Reprovado</Badge>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Cabeçalho */}
        <Card className="border-2 border-primary/20">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <img 
                src="/src/assets/mec-hidro-logo.png" 
                alt="MEC-HIDRO Logo" 
                className="h-16 object-contain"
              />
            </div>
            <div>
              <CardTitle className="text-3xl font-bold">Laudo Técnico</CardTitle>
              <p className="text-muted-foreground text-lg mt-2">
                Ordem de Serviço <span className="font-semibold text-primary">#{ordemServico.numero_ordem}</span>
              </p>
            </div>
          </CardHeader>
        </Card>

        {/* Dados da Ordem */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Informações da Ordem
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <Building2 className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Cliente</p>
                  <p className="font-semibold">{ordemServico.cliente_nome}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Wrench className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Equipamento</p>
                  <p className="font-semibold">{ordemServico.equipamento}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Data de Entrada</p>
                  <p className="font-semibold">
                    {format(new Date(ordemServico.data_entrada), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <FileCheck className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant="outline" className="mt-1">Finalizado</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Laudo do Teste */}
        {teste && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Gauge className="w-5 h-5" />
                  Resultado do Teste
                </CardTitle>
                <ResultadoBadge resultado={teste.resultado_teste} />
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Informações Básicas do Teste */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Tipo de Teste</p>
                  <p className="font-semibold capitalize">{teste.tipo_teste}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data do Teste</p>
                  <p className="font-semibold">
                    {format(new Date(teste.data_hora_teste), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Parâmetros de Teste */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {teste.pressao_teste && (
                  <div className="flex items-start gap-3">
                    <Gauge className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Pressão de Teste</p>
                      <p className="font-semibold">{teste.pressao_teste}</p>
                    </div>
                  </div>
                )}
                {teste.temperatura_operacao && (
                  <div className="flex items-start gap-3">
                    <Thermometer className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Temperatura de Operação</p>
                      <p className="font-semibold">{teste.temperatura_operacao}</p>
                    </div>
                  </div>
                )}
                {teste.tempo_minutos && (
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Tempo de Teste</p>
                      <p className="font-semibold">{teste.tempo_minutos} minutos</p>
                    </div>
                  </div>
                )}
                {teste.curso && (
                  <div>
                    <p className="text-sm text-muted-foreground">Curso</p>
                    <p className="font-semibold">{teste.curso}</p>
                  </div>
                )}
                {teste.qtd_ciclos && (
                  <div>
                    <p className="text-sm text-muted-foreground">Quantidade de Ciclos</p>
                    <p className="font-semibold">{teste.qtd_ciclos}</p>
                  </div>
                )}
                {teste.pressao_maxima_trabalho && (
                  <div>
                    <p className="text-sm text-muted-foreground">Pressão Máxima de Trabalho</p>
                    <p className="font-semibold">{teste.pressao_maxima_trabalho}</p>
                  </div>
                )}
                {teste.pressao_avanco && (
                  <div>
                    <p className="text-sm text-muted-foreground">Pressão de Avanço</p>
                    <p className="font-semibold">{teste.pressao_avanco}</p>
                  </div>
                )}
                {teste.pressao_retorno && (
                  <div>
                    <p className="text-sm text-muted-foreground">Pressão de Retorno</p>
                    <p className="font-semibold">{teste.pressao_retorno}</p>
                  </div>
                )}
                {teste.espessura_camada && (
                  <div>
                    <p className="text-sm text-muted-foreground">Espessura da Camada</p>
                    <p className="font-semibold">{teste.espessura_camada}</p>
                  </div>
                )}
              </div>

              {/* Verificações */}
              {(teste.check_vazamento_pistao !== null || 
                teste.check_vazamento_vedacoes_estaticas !== null || 
                teste.check_vazamento_haste !== null) && (
                <>
                  <Separator />
                  <div>
                    <p className="font-semibold mb-3">Verificações de Vazamento</p>
                    <div className="space-y-2">
                      {teste.check_vazamento_pistao !== null && (
                        <div className="flex items-center gap-2">
                          {teste.check_vazamento_pistao ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                          <span>Vazamento no Pistão</span>
                        </div>
                      )}
                      {teste.check_vazamento_vedacoes_estaticas !== null && (
                        <div className="flex items-center gap-2">
                          {teste.check_vazamento_vedacoes_estaticas ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                          <span>Vazamento nas Vedações Estáticas</span>
                        </div>
                      )}
                      {teste.check_vazamento_haste !== null && (
                        <div className="flex items-center gap-2">
                          {teste.check_vazamento_haste ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                          <span>Vazamento na Haste</span>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Observações */}
              {(teste.observacoes_teste || teste.observacao) && (
                <>
                  <Separator />
                  <div>
                    <p className="font-semibold mb-2">Observações</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {teste.observacoes_teste || teste.observacao}
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
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Fotos do Equipamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {fotos.map((foto) => (
                  <div key={foto.id} className="space-y-2">
                    <img
                      src={foto.arquivo_url}
                      alt={foto.nome_arquivo}
                      className="w-full h-64 object-cover rounded-lg border"
                    />
                    <p className="text-sm text-muted-foreground text-center">{foto.nome_arquivo}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Vídeo do Teste */}
        {teste?.video_url && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="w-5 h-5" />
                Vídeo do Teste
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                <video 
                  controls 
                  className="w-full h-full"
                  src={teste.video_url}
                >
                  Seu navegador não suporta a reprodução de vídeos.
                </video>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  if (teste.video_url) {
                    window.open(teste.video_url, '_blank');
                  }
                }}
              >
                <Download className="w-4 h-4 mr-2" />
                Baixar Vídeo
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Rodapé */}
        <Card className="bg-muted/50">
          <CardContent className="pt-6 text-center text-sm text-muted-foreground">
            <p>Este laudo foi gerado automaticamente pelo sistema MEC-HIDRO</p>
            <p className="mt-1">
              Data de emissão: {format(new Date(), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
