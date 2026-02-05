import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Função para verificar se uma ordem está finalizada (tem laudo, fotos ou nota de retorno)
const verificarOrdemFinalizada = async (ordemId: string, recebimentoId: number | null): Promise<boolean> => {
  // Verificar se existe laudo técnico
  const { data: teste } = await supabase
    .from("testes_equipamentos")
    .select("id")
    .eq("ordem_servico_id", ordemId)
    .limit(1);
  
  if (teste && teste.length > 0) return true;

  // Verificar nota de retorno
  if (recebimentoId) {
    const { data: recebimento } = await supabase
      .from("recebimentos")
      .select("pdf_nota_retorno")
      .eq("id", recebimentoId)
      .maybeSingle();
    
    if (recebimento?.pdf_nota_retorno) return true;
  }

  // Verificar fotos
  const { data: fotos } = await supabase
    .from("fotos_equipamentos")
    .select("id")
    .eq("ordem_servico_id", ordemId)
    .limit(1);

  return fotos && fotos.length > 0;
};

// Função para encontrar a ordem correta (prioriza finalizada)
const encontrarOrdemCorreta = async (
  ordens: Array<{ id: string; status: string; recebimento_id: number | null }>
): Promise<{ id: string; status: string; recebimento_id: number | null } | null> => {
  if (!ordens || ordens.length === 0) return null;
  
  // Se só tem uma ordem, retorna ela
  if (ordens.length === 1) return ordens[0];
  
  // Tentar encontrar uma ordem finalizada
  for (const ordem of ordens) {
    const finalizada = await verificarOrdemFinalizada(ordem.id, ordem.recebimento_id);
    if (finalizada) return ordem;
  }
  
  // Se nenhuma está finalizada, retorna a primeira
  return ordens[0];
};

export default function OrdemPorQRCode() {
  const { numeroOrdem } = useParams<{ numeroOrdem: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    const buscarOrdem = async () => {
      if (!numeroOrdem) {
        toast.error("Número da ordem não encontrado");
        navigate("/");
        return;
      }

      try {
        // Buscar TODAS as ordens de serviço com este número (pode haver duplicatas)
        console.log("🔍 Buscando ordens com numero_ordem:", numeroOrdem);
        const { data: ordensServico, error: ordemError } = await supabase
          .from("ordens_servico")
          .select("id, status, recebimento_id")
          .eq("numero_ordem", numeroOrdem);

        if (ordemError) {
          console.error("❌ Erro na query:", ordemError);
          throw ordemError;
        }

        console.log("📦 Ordens encontradas:", ordensServico?.length || 0);

        // Encontrar a ordem correta (prioriza a que está finalizada)
        const ordemServico = await encontrarOrdemCorreta(ordensServico || []);
        
        if (!ordemServico) {
          toast.error("Ordem não encontrada");
          navigate("/");
          return;
        }

        console.log("✅ Ordem selecionada:", ordemServico.id);

        // Buscar recebimento se existir (para verificar nota de retorno)
        const ordemFinalizada = await verificarOrdemFinalizada(
          ordemServico.id, 
          ordemServico.recebimento_id
        );

        // Se a ordem está finalizada, permite acesso público
        if (ordemFinalizada) {
          navigate(`/acesso-ordem/${numeroOrdem}`);
        } else {
          toast.error("Esta ordem ainda não possui laudo disponível");
          navigate("/");
        }
      } catch (error) {
        console.error("Erro ao buscar ordem:", error);
        toast.error("Erro ao buscar ordem de serviço");
        navigate("/");
      }
    };

    buscarOrdem();
  }, [numeroOrdem, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Carregando ordem de serviço...</p>
      </div>
    </div>
  );
}
