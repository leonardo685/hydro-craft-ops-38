import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabasePublico as supabase, setOrdemPublica } from "@/integrations/supabase/ordemPublicaClient";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Building2, User, Phone, CheckCircle2, Globe } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageSelectorDropdown } from "@/components/LanguageSelectorDropdown";

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

// DDDs válidos no Brasil (para diferenciar de números dos EUA com 10 dígitos)
const DDDS_BR = new Set([
  11,12,13,14,15,16,17,18,19,
  21,22,24,27,28,
  31,32,33,34,35,37,38,
  41,42,43,44,45,46,47,48,49,
  51,53,54,55,
  61,62,63,64,65,66,67,68,69,
  71,73,74,75,77,79,
  81,82,83,84,85,86,87,88,89,
  91,92,93,94,95,96,97,98,99,
]);

// Detecta se o número informado é dos EUA (+1 / 10 dígitos NANP)
const isTelefoneUS = (telefone: string): boolean => {
  const raw = telefone.trim();
  let numeros = raw.replace(/\D/g, '');
  if (raw.startsWith('+55') || numeros.startsWith('55') && numeros.length >= 12) return false;
  if (raw.startsWith('+1') && numeros.length >= 11) return true;
  if (numeros.length === 11 && numeros.startsWith('1')) return true;
  if (numeros.length === 10) {
    // 10 dígitos: BR só é válido se o DDD existir; caso contrário tratamos como EUA
    return !DDDS_BR.has(Number(numeros.slice(0, 2)));
  }
  return false;
};

const telefoneSchema = z.object({
  telefone: z.string()
    .trim()
    .refine((val) => {
      const numeros = val.replace(/\D/g, '');
      return numeros.length >= 10 && numeros.length <= 15;
    }, "Telefone inválido. Use (19) 99999-9999, 19999999999 ou +1 (254) 733-0842")
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
  setOrdemPublica(numeroOrdem);
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

  // Normaliza telefone: BR -> 11 dígitos finais (DDD + número); EUA -> 10 dígitos (area code + número)
  const normalizarTelefone = (telefone: string): string => {
    let numeros = telefone.replace(/\D/g, '');

    if (isTelefoneUS(telefone)) {
      if (numeros.length === 11 && numeros.startsWith('1')) {
        numeros = numeros.slice(1);
      }
      return numeros.slice(-10);
    }

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
    const ddi = isTelefoneUS(telefone) ? '+1' : '+55';
    return `${ddi}${normalizarTelefone(telefone)}`;
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
        // Pode existir apenas o recebimento (equipamento acabou de chegar)
        const { data: recebimento } = await supabase
          .from("recebimentos")
          .select("id")
          .eq("numero_ordem", numeroOrdem)
          .limit(1)
          .maybeSingle();

        if (!recebimento) {
          toast.error(t('acessoOrdem.orderNotFound'));
          navigate("/");
          return;
        }

        navigate(`/rastreamento/${numeroOrdem}`);
        return;
      }

      const ordemFinalizada = await verificarOrdemFinalizada(
        ordemServico.id, 
        ordemServico.recebimento_id
      );

      const destinoFinal = ordemFinalizada
        ? `/laudo-publico/${numeroOrdem}`
        : `/rastreamento/${numeroOrdem}`;

      const telefoneNormalizado = normalizarTelefone(data.telefone);
      const { data: clienteExistente } = await supabase
        .rpc('buscar_cliente_marketing_por_telefone', { p_telefone: telefoneNormalizado })
        .maybeSingle();

      if (clienteExistente) {
        const ipAcesso = await obterIP();
        const userAgent = navigator.userAgent;

        await supabase.rpc('registrar_acesso_publico', {
          p_numero_ordem: numeroOrdem,
          p_telefone: telefoneFormatado,
          p_nome: null,
          p_empresa: null,
          p_ip: ipAcesso,
          p_user_agent: userAgent,
        });

        toast.success(`${t('acessoOrdem.welcomeBack')} ${clienteExistente.nome}!`);
        navigate(destinoFinal);
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
        .select("id, recebimento_id")
        .eq("numero_ordem", numeroOrdem);

      if (ordemError) throw ordemError;

      const ordemServico = await encontrarOrdemCorreta(ordensServico || []);

      if (!ordemServico) {
        const { data: recebimento } = await supabase
          .from("recebimentos")
          .select("id")
          .eq("numero_ordem", numeroOrdem)
          .limit(1)
          .maybeSingle();

        if (!recebimento) {
          toast.error(t('acessoOrdem.orderNotFound'));
          navigate("/");
          return;
        }

        toast.success(t('acessoOrdem.dataSuccess'));
        navigate(`/rastreamento/${numeroOrdem}`);
        return;
      }

      const ordemFinalizada = await verificarOrdemFinalizada(
        ordemServico.id,
        ordemServico.recebimento_id ?? null
      );

      const ipAcesso = await obterIP();
      const userAgent = navigator.userAgent;

      const { error: insertError } = await supabase.rpc('registrar_acesso_publico', {
        p_numero_ordem: numeroOrdem,
        p_telefone: telefoneVerificado,
        p_nome: data.nome,
        p_empresa: data.empresa,
        p_ip: ipAcesso,
        p_user_agent: userAgent,
      });

      if (insertError) throw insertError;

      toast.success(t('acessoOrdem.dataSuccess'));
      navigate(ordemFinalizada ? `/laudo-publico/${numeroOrdem}` : `/rastreamento/${numeroOrdem}`);

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
          <div className="flex justify-center">
            <LanguageSelectorDropdown />
          </div>

          <CardTitle className="text-2xl">
            {searchParams.get('destino') === 'rastreamento' ? t('rastreamento.title') : t('acessoOrdem.title')}
          </CardTitle>

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
