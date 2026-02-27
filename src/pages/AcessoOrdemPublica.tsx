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
import { Shield, Building2, User, Phone, CheckCircle2, Globe } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Language } from "@/i18n/translations";

// Função para encontrar a ordem correta (prioriza finalizada)
const encontrarOrdemCorreta = async (
  ordens: Array<{ id: string; status?: string; recebimento_id?: number | null }>
): Promise<{ id: string; status?: string; recebimento_id?: number | null } | null> => {
  if (!ordens || ordens.length === 0) return null;
  if (ordens.length === 1) return ordens[0];
  
  for (const ordem of ordens) {
    const { data: teste } = await supabase
      .from("testes_equipamentos")
      .select("id")
      .eq("ordem_servico_id", ordem.id)
      .limit(1);
    if (teste && teste.length > 0) return ordem;

    if (ordem.recebimento_id) {
      const { data: recebimento } = await supabase
        .from("recebimentos")
        .select("pdf_nota_retorno")
        .eq("id", ordem.recebimento_id)
        .maybeSingle();
      if (recebimento?.pdf_nota_retorno) return ordem;
    }

    const { data: fotos } = await supabase
      .from("fotos_equipamentos")
      .select("id")
      .eq("ordem_servico_id", ordem.id)
      .limit(1);
    if (fotos && fotos.length > 0) return ordem;
  }
  
  return ordens[0];
};

const telefoneSchema = z.object({
  telefone: z.string()
    .trim()
    .regex(/^(\+55\s?)?(\(?\d{2}\)?[\s-]?)?9?\d{4}[\s-]?\d{4}$/, 
      "Telefone inválido. Use formato: (19) 99999-9999 ou 19999999999")
});

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
  const { t, language, setLanguage } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [etapa, setEtapa] = useState<'telefone' | 'dados'>('telefone');
  const [telefoneVerificado, setTelefoneVerificado] = useState('');

  const telefoneForm = useForm<TelefoneData>({
    resolver: zodResolver(telefoneSchema),
  });

  const dadosForm = useForm<DadosData>({
    resolver: zodResolver(dadosSchema),
  });

  // Função para normalizar telefone - extrai apenas os 11 dígitos finais (DDD + número)
  const normalizarTelefone = (telefone: string): string => {
    let numeros = telefone.replace(/\D/g, '');
    if (numeros.startsWith('55') && numeros.length > 11) {
      numeros = numeros.slice(2);
    }
    if (numeros.startsWith('0')) {
      numeros = numeros.slice(1);
    }
    return numeros.slice(-11);
  };

  // Função para formatar telefone para salvar no banco
  const formatarTelefoneParaSalvar = (telefone: string): string => {
    return `+55${normalizarTelefone(telefone)}`;
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
    let pdfNotaRetorno = null;
    if (recebimentoId) {
      const { data: recebimento } = await supabase
        .from("recebimentos")
        .select("pdf_nota_retorno")
        .eq("id", recebimentoId)
        .maybeSingle();
      pdfNotaRetorno = recebimento?.pdf_nota_retorno;
    }

    const { data: teste } = await supabase
      .from("testes_equipamentos")
      .select("id")
      .eq("ordem_servico_id", ordemServicoId)
      .maybeSingle();

    const { data: fotosOrdem } = await supabase
      .from("fotos_equipamentos")
      .select("id")
      .eq("ordem_servico_id", ordemServicoId)
      .limit(1);

    const temFotos = fotosOrdem && fotosOrdem.length > 0;
    return !!(teste || pdfNotaRetorno || temFotos);
  };

  const onVerificarTelefone = async (data: TelefoneData) => {
    if (!numeroOrdem) {
      toast.error(t('acessoOrdem.orderNumberNotFound'));
      return;
    }

    setLoading(true);

    try {
      const telefoneFormatado = formatarTelefoneParaSalvar(data.telefone);

      const { data: ordensServico, error: ordemError } = await supabase
        .from("ordens_servico")
        .select("id, status, recebimento_id")
        .eq("numero_ordem", numeroOrdem);

      if (ordemError) throw ordemError;

      const ordemServico = await encontrarOrdemCorreta(ordensServico || []);

      if (!ordemServico) {
        toast.error(t('acessoOrdem.orderNotFound'));
        navigate("/");
        return;
      }

      const ordemFinalizada = await verificarOrdemFinalizada(
        ordemServico.id, 
        ordemServico.recebimento_id
      );

      if (!ordemFinalizada) {
        toast.error(t('acessoOrdem.orderNotFinished'));
        navigate("/");
        return;
      }

      const telefoneNormalizado = normalizarTelefone(data.telefone);
      const { data: clientesExistentes } = await supabase
        .from("clientes_marketing")
        .select("id, nome, telefone");

      const clienteExistente = clientesExistentes?.find(
        c => normalizarTelefone(c.telefone) === telefoneNormalizado
      );

      if (clienteExistente) {
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

        toast.success(`${t('acessoOrdem.welcomeBack')} ${clienteExistente.nome}!`);
        navigate(`/laudo-publico/${numeroOrdem}`);
      } else {
        setTelefoneVerificado(telefoneFormatado);
        setEtapa('dados');
      }
    } catch (error) {
      console.error("Erro ao verificar telefone:", error);
      toast.error(t('acessoOrdem.phoneError'));
    } finally {
      setLoading(false);
    }
  };

  const onSubmitDados = async (data: DadosData) => {
    if (!numeroOrdem || !telefoneVerificado) {
      toast.error(t('acessoOrdem.incompleteData'));
      return;
    }

    setLoading(true);

    try {
      const { data: ordensServico, error: ordemError } = await supabase
        .from("ordens_servico")
        .select("id")
        .eq("numero_ordem", numeroOrdem);

      if (ordemError) throw ordemError;

      const ordemServico = await encontrarOrdemCorreta(ordensServico || []);

      if (!ordemServico) {
        toast.error(t('acessoOrdem.orderNotFound'));
        navigate("/");
        return;
      }

      const ipAcesso = await obterIP();
      const userAgent = navigator.userAgent;

      const { error: insertError } = await supabase
        .from("clientes_marketing")
        .insert({
          ordem_servico_id: ordemServico.id,
          numero_ordem: numeroOrdem,
          nome: data.nome,
          empresa: data.empresa,
          telefone: formatarTelefoneParaSalvar(telefoneVerificado),
          ip_acesso: ipAcesso,
          user_agent: userAgent,
        });

      if (insertError) throw insertError;

      toast.success(t('acessoOrdem.dataSuccess'));
      navigate(`/laudo-publico/${numeroOrdem}`);
    } catch (error) {
      console.error("Erro ao registrar dados:", error);
      toast.error(t('acessoOrdem.dataError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-3 text-center">
          <div className="flex justify-center gap-2 items-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Shield className="w-8 h-8 text-primary" />
            </div>
          </div>
          
          {/* Language Selector */}
          <div className="flex items-center justify-center gap-2">
            <Globe className="w-4 h-4 text-muted-foreground" />
            <ToggleGroup
              type="single"
              value={language}
              onValueChange={(value) => {
                if (value) setLanguage(value as Language);
              }}
              className="border rounded-lg"
            >
              <ToggleGroupItem value="pt-BR" className="text-xs px-3 py-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                PT
              </ToggleGroupItem>
              <ToggleGroupItem value="en" className="text-xs px-3 py-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                EN
              </ToggleGroupItem>
              <ToggleGroupItem value="es" className="text-xs px-3 py-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                ES
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <CardTitle className="text-2xl">{t('acessoOrdem.title')}</CardTitle>
          <CardDescription className="text-base">
            {etapa === 'telefone' ? (
              <>
                {t('acessoOrdem.enterPhone')} <span className="font-semibold text-foreground">#{numeroOrdem}</span>
                {t('acessoOrdem.enterPhoneEnd')}
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 inline-block mr-1 text-green-500" />
                {t('acessoOrdem.phoneVerified')}
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
                  {t('acessoOrdem.phone')} *
                </Label>
                <Input
                  id="telefone"
                  placeholder={t('acessoOrdem.phonePlaceholder')}
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
                {loading ? t('acessoOrdem.verifying') : t('acessoOrdem.verifyPhone')}
              </Button>

              <p className="text-xs text-center text-muted-foreground mt-4">
                {t('acessoOrdem.alreadyAccessed')}
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
                  {t('acessoOrdem.fullName')} *
                </Label>
                <Input
                  id="nome"
                  placeholder={t('acessoOrdem.fullNamePlaceholder')}
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
                  {t('acessoOrdem.company')} *
                </Label>
                <Input
                  id="empresa"
                  placeholder={t('acessoOrdem.companyPlaceholder')}
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
                  {t('acessoOrdem.back')}
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1" 
                  size="lg"
                  disabled={loading}
                >
                  {loading ? t('acessoOrdem.processing') : t('acessoOrdem.accessReport')}
                </Button>
              </div>

              <p className="text-xs text-center text-muted-foreground mt-4">
                {t('acessoOrdem.dataDisclaimer')}
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
