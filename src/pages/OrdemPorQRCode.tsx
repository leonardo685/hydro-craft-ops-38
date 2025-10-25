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
          .select("id")
          .eq("numero_ordem", numeroOrdem)
          .maybeSingle();

        if (recebimentoError) throw recebimentoError;

        if (!recebimento) {
          toast.error("Ordem não encontrada");
          navigate("/");
          return;
        }

        // Buscar ordem de serviço pelo recebimento_id
        const { data: ordemServico, error: ordemError } = await supabase
          .from("ordens_servico")
          .select("id, status")
          .eq("recebimento_id", recebimento.id)
          .maybeSingle();

        if (ordemError) throw ordemError;

        if (ordemServico) {
          // Verificar se a ordem está finalizada (aguardando_retorno ou finalizado)
          if (ordemServico.status === 'finalizado' || ordemServico.status === 'aguardando_retorno') {
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
            // Ordem não finalizada, requer autenticação
            if (loading) return;
            
            if (!user) {
              navigate("/auth", { 
                state: { from: `/ordem/${numeroOrdem}` } 
              });
              return;
            }
            navigate(`/visualizar-ordem-servico/${ordemServico.id}`);
          }
        } else {
          // Se não existe ordem de serviço, redireciona para detalhes do recebimento
          if (loading) return;
          
          if (!user) {
            navigate("/auth", { 
              state: { from: `/ordem/${numeroOrdem}` } 
            });
            return;
          }
          navigate(`/detalhes-recebimento/${recebimento.id}`);
        }
      } catch (error) {
        console.error("Erro ao buscar ordem:", error);
        toast.error("Erro ao buscar ordem de serviço");
        navigate("/");
      }
    };

    buscarOrdem();
  }, [numeroOrdem, navigate, user, loading]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Carregando ordem de serviço...</p>
      </div>
    </div>
  );
}
