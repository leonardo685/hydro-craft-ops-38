import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const bodyData = await req.json();
    
    console.log(`🔄 Retrying webhook - Tipo: ${bodyData.tipo}`);

    // Buscar webhook da empresa se empresa_id for fornecido
    let webhookUrl = bodyData.webhook_url;
    
    if (!webhookUrl && bodyData.empresa_id) {
      console.log('📡 Buscando webhook da empresa:', bodyData.empresa_id);
      
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      const { data: empresa, error } = await supabase
        .from('empresas')
        .select('configuracoes')
        .eq('id', bodyData.empresa_id)
        .single();
      
      if (error) {
        console.error('❌ Erro ao buscar empresa:', error);
        throw new Error(`Erro ao buscar empresa: ${error.message}`);
      }
      
      const config = empresa?.configuracoes as { webhook_url?: string } | null;
      webhookUrl = config?.webhook_url;
      
      if (!webhookUrl) {
        console.warn('⚠️ Webhook não configurado para esta empresa');
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Webhook não configurado para esta empresa' 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400 
          }
        );
      }
      
      console.log('✅ Webhook encontrado:', webhookUrl);
    }
    
    if (!webhookUrl) {
      throw new Error('URL do webhook não fornecida e empresa_id não especificado');
    }

    // Substituir campos vazios/null/undefined por "."
    const sanitizePayload = (obj: any): any => {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        // Não incluir campos internos no payload
        if (key === 'empresa_id' || key === 'webhook_url') continue;
        sanitized[key] = (value === null || value === undefined || value === '') 
          ? '.' 
          : value;
      }
      return sanitized;
    };

    const payload = sanitizePayload(bodyData);
    
    console.log('📦 Payload sanitizado:', payload);
    console.log('🌐 Enviando para webhook:', webhookUrl);
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Webhook failed with status: ${response.status}`);
    }

    const result = await response.text();
    console.log(`✅ Webhook sent successfully`);

    return new Response(
      JSON.stringify({ success: true, result, payload }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('❌ Error retrying webhook:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
