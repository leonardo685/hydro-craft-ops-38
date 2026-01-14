import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { toast } from "sonner";
import { enviarWebhook } from "@/lib/webhook-utils";
import { useEmpresa } from "@/contexts/EmpresaContext";

export const RetryWebhookButton = () => {
  const [loading, setLoading] = useState(false);
  const { empresaAtual } = useEmpresa();

  const handleRetry = async () => {
    setLoading(true);
    try {
      const payload = {
        tipo: "ordem_aprovada",
        numero_ordem: "MH-033-25",
        cliente: "RECIVALE INDUSTRIA E COMERCIO DE METAIS S.A.",
        equipamento: "Cilindro Hidráulico",
        data_aprovacao: "10-11-2025",
        empresa: empresaAtual?.nome || 'Teste'
      };

      const success = await enviarWebhook(empresaAtual?.id || null, payload);

      if (success) {
        console.log("✅ Webhook retry successful");
        toast.success("Webhook enviado com sucesso!");
      } else {
        throw new Error("Falha ao enviar webhook");
      }
    } catch (error: any) {
      console.error("❌ Webhook retry failed:", error);
      toast.error("Erro ao enviar webhook: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Auto-execute on mount
  useEffect(() => {
    handleRetry();
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Button 
        onClick={handleRetry} 
        disabled={loading}
        variant="default"
      >
        {loading ? "Enviando..." : "🔄 Retry Webhook MH-033-25"}
      </Button>
    </div>
  );
};
