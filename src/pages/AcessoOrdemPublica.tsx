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
import { Shield, Building2, User, Phone } from "lucide-react";

const formSchema = z.object({
  nome: z.string()
    .trim()
    .min(3, "Nome deve ter pelo menos 3 caracteres")
    .max(100, "Nome muito longo"),
  empresa: z.string()
    .trim()
    .min(2, "Nome da empresa deve ter pelo menos 2 caracteres")
    .max(100, "Nome da empresa muito longo"),
  telefone: z.string()
    .trim()
    .regex(/^(\+55\s?)?(\(?\d{2}\)?[\s-]?)?9?\d{4}[\s-]?\d{4}$/, 
      "Telefone inválido. Use formato: (19) 99999-9999 ou 19999999999")
});

type FormData = z.infer<typeof formSchema>;

export default function AcessoOrdemPublica() {
  const { numeroOrdem } = useParams<{ numeroOrdem: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async (data: FormData) => {
    if (!numeroOrdem) {
      toast.error("Número da ordem não encontrado");
      return;
    }

    setLoading(true);

    try {
      // Buscar recebimento e ordem de serviço
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

      const { data: ordemServico, error: ordemError } = await supabase
        .from("ordens_servico")
        .select("id, status")
        .eq("recebimento_id", recebimento.id)
        .maybeSingle();

      if (ordemError) throw ordemError;

      if (!ordemServico) {
        toast.error("Ordem de serviço não encontrada");
        navigate("/");
        return;
      }

      // Verificar se existe laudo técnico criado (teste) para a ordem
      const { data: teste, error: testeError } = await supabase
        .from("testes_equipamentos")
        .select("id")
        .eq("ordem_servico_id", ordemServico.id)
        .maybeSingle();

      if (testeError) throw testeError;

      // Se não existe laudo técnico nem nota de retorno, ordem não está pronta
      if (!teste && !recebimento?.pdf_nota_retorno) {
        toast.error("Esta ordem ainda não foi finalizada");
        navigate("/");
        return;
      }

      // Capturar IP e User Agent (se disponível)
      let ipAcesso = null;
      try {
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipResponse.json();
        ipAcesso = ipData.ip;
      } catch (error) {
        console.log("Não foi possível obter IP", error);
      }

      const userAgent = navigator.userAgent;

      // Salvar dados de marketing
      const { error: insertError } = await supabase
        .from("clientes_marketing")
        .insert({
          ordem_servico_id: ordemServico.id,
          numero_ordem: numeroOrdem,
          nome: data.nome,
          empresa: data.empresa,
          telefone: data.telefone,
          ip_acesso: ipAcesso,
          user_agent: userAgent,
        });

      if (insertError) throw insertError;

      toast.success("Dados registrados com sucesso!");
      
      // Redirecionar para visualização do laudo
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
            Para acessar o laudo da ordem <span className="font-semibold text-foreground">#{numeroOrdem}</span>, 
            por favor preencha seus dados abaixo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="nome" className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                Nome Completo *
              </Label>
              <Input
                id="nome"
                placeholder="Digite seu nome completo"
                {...register("nome")}
                className={errors.nome ? "border-destructive" : ""}
              />
              {errors.nome && (
                <p className="text-sm text-destructive">{errors.nome.message}</p>
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
                {...register("empresa")}
                className={errors.empresa ? "border-destructive" : ""}
              />
              {errors.empresa && (
                <p className="text-sm text-destructive">{errors.empresa.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefone" className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                Telefone *
              </Label>
              <Input
                id="telefone"
                placeholder="(19) 99999-9999"
                {...register("telefone")}
                className={errors.telefone ? "border-destructive" : ""}
              />
              {errors.telefone && (
                <p className="text-sm text-destructive">{errors.telefone.message}</p>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              size="lg"
              disabled={loading}
            >
              {loading ? "Processando..." : "Acessar Laudo"}
            </Button>

            <p className="text-xs text-center text-muted-foreground mt-4">
              Seus dados serão utilizados apenas para contato sobre serviços relacionados. 
              Não compartilhamos suas informações com terceiros.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
