import { useEmpresa } from "@/contexts/EmpresaContext";

interface EmpresaConfiguracoes {
  webhook_url?: string;
}

export const useEmpresaWebhook = () => {
  const { empresaAtual } = useEmpresa();

  const getWebhookUrl = (): string | null => {
    if (!empresaAtual) return null;
    
    const config = empresaAtual.configuracoes as EmpresaConfiguracoes | null;
    return config?.webhook_url || null;
  };

  const hasWebhook = (): boolean => {
    return !!getWebhookUrl();
  };

  return { getWebhookUrl, hasWebhook };
};
