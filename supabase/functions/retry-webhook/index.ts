import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

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

    // Substituir campos vazios/null/undefined por "."
    const sanitizePayload = (obj: any): any => {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = (value === null || value === undefined || value === '') 
          ? '.' 
          : value;
      }
      return sanitized;
    };

    const payload = sanitizePayload(bodyData);
    
    console.log('📦 Payload sanitizado:', payload);

    const webhookUrl = 'https://primary-production-dc42.up.railway.app/webhook/f2cabfd9-4e4c-4dd0-802a-b27c4b0c9d17';
    
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
