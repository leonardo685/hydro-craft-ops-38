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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', // Use service role for private bucket access
    );

    const { fileUrl, fileName } = await req.json();
    
    if (!fileUrl) {
      throw new Error('URL do arquivo não fornecida');
    }

    console.log('Baixando arquivo:', fileUrl);

    // Check if it's a Supabase Storage URL and extract bucket/path
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const isSupabaseStorageUrl = fileUrl.includes(supabaseUrl) && fileUrl.includes('/storage/v1/object/');
    
    let arrayBuffer: ArrayBuffer;
    let contentType = 'application/octet-stream';

    if (isSupabaseStorageUrl) {
      // Parse Supabase storage URL to extract bucket and path
      // Format: https://{project}.supabase.co/storage/v1/object/public/{bucket}/{path}
      // or: https://{project}.supabase.co/storage/v1/object/{bucket}/{path}
      const urlObj = new URL(fileUrl);
      const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/(?:public\/)?([^/]+)\/(.+)/);
      
      if (pathMatch) {
        const bucket = pathMatch[1];
        const filePath = decodeURIComponent(pathMatch[2]);
        
        console.log('Bucket:', bucket, 'Path:', filePath);
        
        // Download using Supabase Storage API (works for both public and private buckets)
        const { data, error } = await supabaseClient.storage
          .from(bucket)
          .download(filePath);
        
        if (error) {
          console.error('Erro Supabase Storage:', error);
          throw new Error(`Erro ao baixar do storage: ${error.message}`);
        }
        
        if (!data) {
          throw new Error('Arquivo não encontrado no storage');
        }
        
        arrayBuffer = await data.arrayBuffer();
        contentType = data.type || 'application/octet-stream';
        console.log('Arquivo baixado via Supabase Storage:', fileName);
      } else {
        throw new Error('URL de storage inválida');
      }
    } else {
      // For external URLs, use regular fetch
      const response = await fetch(fileUrl);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erro HTTP:', response.status, response.statusText, errorText);
        throw new Error(`Erro ao baixar arquivo: ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();
      arrayBuffer = await blob.arrayBuffer();
      contentType = blob.type || 'application/octet-stream';
      console.log('Arquivo baixado via fetch:', fileName);
    }

    // Retornar o arquivo com headers apropriados
    return new Response(arrayBuffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
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