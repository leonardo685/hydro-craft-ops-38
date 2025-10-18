import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificacaoPayload {
  orcamento: {
    id: string;
    numero: string;
    cliente_nome: string;
    equipamento: string;
    valor: number;
    data_aprovacao: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { orcamento }: NotificacaoPayload = await req.json();

    console.log('Processando notificação de aprovação:', orcamento);

    // Buscar URL do webhook nas configurações
    const { data: config, error: configError } = await supabase
      .from('configuracoes_sistema')
      .select('valor')
      .eq('chave', 'webhook_n8n_url')
      .single();

    if (configError) {
      console.error('Erro ao buscar configuração do webhook:', configError);
      return new Response(
        JSON.stringify({ error: 'Configuração do webhook não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const webhookUrl = config?.valor;

    if (!webhookUrl || webhookUrl.trim() === '') {
      console.log('Webhook não configurado, pulando notificação');
      return new Response(
        JSON.stringify({ success: true, message: 'Webhook não configurado' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Construir link do sistema
    const linkSistema = `${req.headers.get('origin') || 'https://seuapp.lovable.app'}/orcamentos?id=${orcamento.id}`;

    // Payload para n8n
    const payload = {
      evento: 'orcamento_aprovado',
      orcamento: {
        id: orcamento.id,
        numero: orcamento.numero,
        cliente_nome: orcamento.cliente_nome,
        equipamento: orcamento.equipamento,
        valor: orcamento.valor,
        data_aprovacao: orcamento.data_aprovacao,
      },
      link_sistema: linkSistema,
      timestamp: new Date().toISOString(),
    };

    console.log('Enviando payload para webhook:', payload);

    // Enviar para n8n
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!webhookResponse.ok) {
      console.error('Erro ao enviar webhook:', webhookResponse.statusText);
      return new Response(
        JSON.stringify({ error: 'Falha ao enviar webhook', details: webhookResponse.statusText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Webhook enviado com sucesso');

    return new Response(
      JSON.stringify({ success: true, message: 'Notificação enviada com sucesso' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro na função notificar-aprovacao:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
