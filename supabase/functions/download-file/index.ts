import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { fileUrl, fileName } = await req.json();
    
    if (!fileUrl) {
      throw new Error('URL do arquivo não fornecida');
    }

    console.log('Baixando arquivo:', fileUrl);

    // Encode URL properly (keep the protocol and domain, encode the path)
    let urlToFetch = fileUrl;
    try {
      const urlObj = new URL(fileUrl);
      // Encode each path segment individually to handle special characters
      const pathSegments = urlObj.pathname.split('/').map(segment => 
        segment ? encodeURIComponent(decodeURIComponent(segment)) : segment
      );
      urlObj.pathname = pathSegments.join('/');
      urlToFetch = urlObj.toString();
      console.log('URL processada:', urlToFetch);
    } catch (e) {
      console.log('Usando URL original:', fileUrl);
    }

    // Fazer o download do arquivo
    const response = await fetch(urlToFetch);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro HTTP:', response.status, response.statusText, errorText);
      throw new Error(`Erro ao baixar arquivo: ${response.status} ${response.statusText}`);
    }

    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();

    console.log('Arquivo baixado com sucesso:', fileName);

    // Retornar o arquivo com headers apropriados
    return new Response(arrayBuffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': blob.type || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${fileName || 'download'}"`,
        'Content-Length': arrayBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error('Erro na edge function download-file:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
