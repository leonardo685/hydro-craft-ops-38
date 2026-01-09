import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Building2, User, Phone, CheckCircle2 } from "lucide-react";

// Schema para etapa 1 (telefone)
const telefoneSchema = z.object({
  telefone: z.string()
    .trim()
    .regex(/^(\+55\s?)?(\(?\d{2}\)?[\s-]?)?9?\d{4}[\s-]?\d{4}$/, 
      "Telefone inválido. Use formato: (19) 99999-9999 ou 19999999999")
});

// Schema para etapa 2 (dados adicionais)
const dadosSchema = z.object({
  nome: z.string()
    .trim()
    .min(3, "Nome deve ter pelo menos 3 caracteres")
    .max(100, "Nome muito longo"),
  empresa: z.string()
    .trim()
    .min(2, "Nome da empresa deve ter pelo menos 2 caracteres")
    .max(100, "Nome da empresa muito longo"),
});

type TelefoneData = z.infer<typeof telefoneSchema>;
type DadosData = z.infer<typeof dadosSchema>;

export default function AcessoOrdemPublica() {
  const { numeroOrdem } = useParams<{ numeroOrdem: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [etapa, setEtapa] = useState<'telefone' | 'dados'>('telefone');
  const [telefoneVerificado, setTelefoneVerificado] = useState('');

  // Form para etapa 1 (telefone)
  const telefoneForm = useForm<TelefoneData>({
    resolver: zodResolver(telefoneSchema),
  });

  // Form para etapa 2 (dados adicionais)
  const dadosForm = useForm<DadosData>({
    resolver: zodResolver(dadosSchema),
  });

  // Função auxiliar para formatar telefone
  const formatarTelefone = (telefone: string) => {
    return telefone.startsWith('+55') 
      ? telefone 
      : `+55${telefone.replace(/\D/g, '')}`;
  };

  // Função para obter IP
  const obterIP = async () => {
    try {
      const ipResponse = await fetch('https://api.ipify.org?format=json');
      const ipData = await ipResponse.json();
      return ipData.ip;
    } catch {
      return null;
    }
  };

  // Função para verificar se ordem está finalizada
  const verificarOrdemFinalizada = async (ordemServicoId: string, recebimentoId: number | null) => {
    // Buscar recebimento se existir (para verificar nota de retorno)
    let pdfNotaRetorno = null;
    if (recebimentoId) {
      const { data: recebimento } = await supabase
        .from("recebimentos")
        .select("pdf_nota_retorno")
        .eq("id", recebimentoId)
        .maybeSingle();
      
      pdfNotaRetorno = recebimento?.pdf_nota_retorno;
    }

    // Verificar se existe laudo técnico
    const { data: teste } = await supabase
      .from("testes_equipamentos")
      .select("id")
      .eq("ordem_servico_id", ordemServicoId)
      .maybeSingle();

    // Buscar fotos da ordem
    const { data: fotosOrdem } = await supabase
      .from("fotos_equipamentos")
      .select("id")
      .eq("ordem_servico_id", ordemServicoId)
      .limit(1);

    const temFotos = fotosOrdem && fotosOrdem.length > 0;

    return !!(teste || pdfNotaRetorno || temFotos);
  };

  // Etapa 1: Verificar telefone
  const onVerificarTelefone = async (data: TelefoneData) => {
    if (!numeroOrdem) {
      toast.error("Número da ordem não encontrado");
      return;
    }

    setLoading(true);

    try {
      const telefoneFormatado = formatarTelefone(data.telefone);

      // Buscar ordem de serviço
      const { data: ordemServico, error: ordemError } = await supabase
        .from("ordens_servico")
        .select("id, status, recebimento_id")
        .eq("numero_ordem", numeroOrdem)
        .maybeSingle();

      if (ordemError) throw ordemError;

      if (!ordemServico) {
        toast.error("Ordem não encontrada");
        navigate("/");
        return;
      }

      // Verificar se ordem está finalizada
      const ordemFinalizada = await verificarOrdemFinalizada(
        ordemServico.id, 
        ordemServico.recebimento_id
      );

      if (!ordemFinalizada) {
        toast.error("Esta ordem ainda não foi finalizada");
        navigate("/");
        return;
      }

      // Verificar se telefone já existe
      const { data: clienteExistente } = await supabase
        .from("clientes_marketing")
        .select("id, nome")
        .eq("telefone", telefoneFormatado)
        .maybeSingle();

      if (clienteExistente) {
        // Cliente já existe - atualizar acesso e redirecionar
        const ipAcesso = await obterIP();
        const userAgent = navigator.userAgent;

        await supabase
          .from("clientes_marketing")
          .update({
            numero_ordem: numeroOrdem,
            ordem_servico_id: ordemServico.id,
            data_acesso: new Date().toISOString(),
            ip_acesso: ipAcesso,
            user_agent: userAgent,
          })
          .eq("id", clienteExistente.id);

        toast.success(`Bem-vindo de volta, ${clienteExistente.nome}!`);
        navigate(`/laudo-publico/${numeroOrdem}`);
      } else {
        // Cliente não existe - mostrar campos adicionais
        setTelefoneVerificado(telefoneFormatado);
        setEtapa('dados');
      }
    } catch (error) {
      console.error("Erro ao verificar telefone:", error);
      toast.error("Erro ao verificar telefone. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  // Etapa 2: Registrar dados completos
  const onSubmitDados = async (data: DadosData) => {
    if (!numeroOrdem || !telefoneVerificado) {
      toast.error("Dados incompletos");
      return;
    }

    setLoading(true);

    try {
      // Buscar ordem de serviço novamente
      const { data: ordemServico, error: ordemError } = await supabase
        .from("ordens_servico")
        .select("id")
        .eq("numero_ordem", numeroOrdem)
        .maybeSingle();

      if (ordemError) throw ordemError;

      if (!ordemServico) {
        toast.error("Ordem não encontrada");
        navigate("/");
        return;
      }

      const ipAcesso = await obterIP();
      const userAgent = navigator.userAgent;

      // Inserir novo registro
      const { error: insertError } = await supabase
        .from("clientes_marketing")
        .insert({
          ordem_servico_id: ordemServico.id,
          numero_ordem: numeroOrdem,
          nome: data.nome,
          empresa: data.empresa,
          telefone: telefoneVerificado,
          ip_acesso: ipAcesso,
          user_agent: userAgent,
        });

      if (insertError) throw insertError;

      toast.success("Dados registrados com sucesso!");
      navigate(`/laudo-publico/${numeroOrdem}`);
    } catch (error) {
      console.error("Erro ao registrar dados:", error);
      toast.error("Erro ao registrar seus dados. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Acesso ao Laudo Técnico</CardTitle>
          <CardDescription className="text-base">
            {etapa === 'telefone' ? (
              <>
                Para acessar o laudo da ordem <span className="font-semibold text-foreground">#{numeroOrdem}</span>, 
                digite seu telefone.
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 inline-block mr-1 text-green-500" />
                Telefone verificado! Complete seu cadastro.
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {etapa === 'telefone' ? (
            <form onSubmit={telefoneForm.handleSubmit(onVerificarTelefone)} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="telefone" className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  Telefone *
                </Label>
                <Input
                  id="telefone"
                  placeholder="(19) 99999-9999"
                  {...telefoneForm.register("telefone")}
                  className={telefoneForm.formState.errors.telefone ? "border-destructive" : ""}
                  autoFocus
                />
                {telefoneForm.formState.errors.telefone && (
                  <p className="text-sm text-destructive">{telefoneForm.formState.errors.telefone.message}</p>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                size="lg"
                disabled={loading}
              >
                {loading ? "Verificando..." : "Verificar Telefone"}
              </Button>

              <p className="text-xs text-center text-muted-foreground mt-4">
                Se você já acessou antes, será redirecionado automaticamente.
              </p>
            </form>
          ) : (
            <form onSubmit={dadosForm.handleSubmit(onSubmitDados)} className="space-y-5">
              <div className="p-3 bg-muted/50 rounded-lg mb-4">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  {telefoneVerificado}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nome" className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  Nome Completo *
                </Label>
                <Input
                  id="nome"
                  placeholder="Digite seu nome completo"
                  {...dadosForm.register("nome")}
                  className={dadosForm.formState.errors.nome ? "border-destructive" : ""}
                  autoFocus
                />
                {dadosForm.formState.errors.nome && (
                  <p className="text-sm text-destructive">{dadosForm.formState.errors.nome.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="empresa" className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  Empresa *
                </Label>
                <Input
                  id="empresa"
                  placeholder="Nome da sua empresa"
                  {...dadosForm.register("empresa")}
                  className={dadosForm.formState.errors.empresa ? "border-destructive" : ""}
                />
                {dadosForm.formState.errors.empresa && (
                  <p className="text-sm text-destructive">{dadosForm.formState.errors.empresa.message}</p>
                )}
              </div>

              <div className="flex gap-2">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => {
                    setEtapa('telefone');
                    setTelefoneVerificado('');
                  }}
                  disabled={loading}
                >
                  Voltar
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1" 
                  size="lg"
                  disabled={loading}
                >
                  {loading ? "Processando..." : "Acessar Laudo"}
                </Button>
              </div>

              <p className="text-xs text-center text-muted-foreground mt-4">
                Seus dados serão utilizados apenas para contato sobre serviços relacionados.
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
