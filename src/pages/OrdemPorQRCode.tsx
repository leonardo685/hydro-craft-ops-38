import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function OrdemPorQRCode() {
  const { numeroOrdem } = useParams<{ numeroOrdem: string }>();
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    const buscarOrdem = async () => {
      if (!numeroOrdem) {
        toast.error("Número da ordem não encontrado");
        navigate("/");
        return;
      }

      try {
        // Buscar recebimento pelo numero_ordem
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

        // Buscar ordem de serviço pelo recebimento_id
        console.log("🔍 Buscando ordem com recebimento_id:", recebimento.id);
        const { data: ordemServico, error: ordemError } = await supabase
          .from("ordens_servico")
          .select("id, status")
          .eq("recebimento_id", recebimento.id)
          .maybeSingle();

        console.log("📦 Ordem encontrada:", ordemServico);
        if (ordemError) {
          console.error("❌ Erro na query ordens_servico:", ordemError);
          throw ordemError;
        }

        if (ordemServico) {
          // Verificar se existe laudo técnico criado (teste) para a ordem
          const { data: teste, error: testeError } = await supabase
            .from("testes_equipamentos")
            .select("id")
            .eq("ordem_servico_id", ordemServico.id)
            .maybeSingle();

          if (testeError) throw testeError;

          // Se existe laudo técnico OU nota de retorno, permite acesso público
          if (teste || recebimento.pdf_nota_retorno) {
            // Verificar se já existe registro de acesso no marketing
            const { data: registroMarketing, error: marketingError } = await supabase
              .from("clientes_marketing")
              .select("id")
              .eq("ordem_servico_id", ordemServico.id)
              .maybeSingle();

            if (marketingError) throw marketingError;

            if (!registroMarketing) {
              // Primeira vez acessando, redirecionar para formulário de captura
              navigate(`/acesso-ordem/${numeroOrdem}`);
            } else {
              // Já preencheu o formulário antes, liberar acesso direto ao laudo
              navigate(`/laudo-publico/${numeroOrdem}`);
            }
          } else {
            // Ordem não finalizada, bloquear acesso público
            toast.error("Esta ordem ainda não possui laudo disponível");
            navigate("/");
          }
        } else {
          // Se não existe ordem de serviço, ordem ainda não foi analisada
          toast.error("Esta ordem ainda não foi analisada");
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
