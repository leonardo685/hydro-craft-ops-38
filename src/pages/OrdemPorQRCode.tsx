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
    if (loading) return;
    
    if (!user) {
      navigate("/auth", { 
        state: { from: `/ordem/${numeroOrdem}` } 
      });
      return;
    }

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
          .select("id")
          .eq("recebimento_id", recebimento.id)
          .maybeSingle();

        if (ordemError) throw ordemError;

        if (ordemServico) {
          // Se existe ordem de serviço, redireciona para visualização
          navigate(`/visualizar-ordem-servico/${ordemServico.id}`);
        } else {
          // Se não existe ordem de serviço, redireciona para detalhes do recebimento
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
