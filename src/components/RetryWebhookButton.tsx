import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "./ui/button";
import { toast } from "sonner";

export const RetryWebhookButton = () => {
  const [loading, setLoading] = useState(false);

  const handleRetry = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('retry-webhook', {
        body: {
          tipo: "ordem_aprovada",
          numero_ordem: "MH-033-25",
          cliente: "RECIVALE INDUSTRIA E COMERCIO DE METAIS S.A.",
          equipamento: "Cilindro Hidráulico",
          data_aprovacao: "10-11-2025"
        }
      });

      if (error) throw error;

      console.log("✅ Webhook retry successful:", data);
      toast.success("Webhook enviado com sucesso!");
    } catch (error) {
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
