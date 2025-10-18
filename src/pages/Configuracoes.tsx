import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, TestTube2, Save } from "lucide-react";

export default function Configuracoes() {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadWebhookConfig();
  }, []);

  const loadWebhookConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('configuracoes_sistema')
        .select('valor')
        .eq('chave', 'webhook_n8n_url')
        .single();

      if (error) throw error;
      if (data?.valor) {
        setWebhookUrl(data.valor);
      }
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('configuracoes_sistema')
        .upsert({
          chave: 'webhook_n8n_url',
          valor: webhookUrl,
        }, {
          onConflict: 'chave'
        });

      if (error) throw error;

      toast({
        title: "Configuração salva",
        description: "URL do webhook atualizada com sucesso",
      });
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar a configuração",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTest = async () => {
    if (!webhookUrl) {
      toast({
        title: "URL não configurada",
        description: "Configure a URL do webhook antes de testar",
        variant: "destructive",
      });
      return;
    }

    setIsTesting(true);
    try {
      const { error } = await supabase.functions.invoke('notificar-aprovacao', {
        body: {
          orcamento: {
            id: 'test-id',
            numero: 'ORC-2025-TESTE',
            cliente_nome: 'Cliente Teste',
            equipamento: 'Equipamento Teste',
            valor: 1000.00,
            data_aprovacao: new Date().toISOString(),
          }
        }
      });

      if (error) throw error;

      toast({
        title: "Teste enviado",
        description: "Verifique se a notificação foi recebida no Telegram",
      });
    } catch (error) {
      console.error('Erro ao testar webhook:', error);
      toast({
        title: "Erro no teste",
        description: "Não foi possível enviar o teste. Verifique a URL e tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie as integrações e configurações do sistema
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Webhook n8n - Notificações de Aprovação</CardTitle>
            <CardDescription>
              Configure a URL do webhook do n8n para receber notificações quando um orçamento for aprovado
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="webhook-url">URL do Webhook n8n</Label>
              <Input
                id="webhook-url"
                type="url"
                placeholder="https://seu-n8n.com/webhook/..."
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Cole aqui a URL do webhook gerada no n8n para receber notificações via Telegram
              </p>
            </div>

            <div className="flex gap-3">
              <Button 
                onClick={handleSave} 
                disabled={isLoading}
                className="gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Salvar Configuração
                  </>
                )}
              </Button>

              <Button 
                onClick={handleTest} 
                disabled={isTesting || !webhookUrl}
                variant="outline"
                className="gap-2"
              >
                {isTesting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Testando...
                  </>
                ) : (
                  <>
                    <TestTube2 className="h-4 w-4" />
                    Testar Webhook
                  </>
                )}
              </Button>
            </div>

            <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-2">
              <h4 className="font-medium text-sm">Como configurar no n8n:</h4>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Crie um novo workflow no n8n</li>
                <li>Adicione um nó "Webhook" como trigger (POST)</li>
                <li>Copie a URL do webhook e cole acima</li>
                <li>Adicione um nó "Telegram" para enviar mensagens</li>
                <li>Configure a mensagem com os dados do orçamento</li>
                <li>Ative o workflow</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
