import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { testeId, videoContent, fileName } = await req.json()

    if (!testeId || !videoContent) {
      throw new Error('testeId e videoContent são obrigatórios')
    }

    console.log('Iniciando upload para teste:', testeId)

    // Buscar informações do teste
    const { data: teste, error: testeError } = await supabaseClient
      .from('testes_equipamentos')
      .select('ordem_servico_id')
      .eq('id', testeId)
      .single()

    if (testeError) {
      console.error('Erro ao buscar teste:', testeError)
      throw testeError
    }

    console.log('Teste encontrado, ordem_servico_id:', teste.ordem_servico_id)

    // Decodificar o vídeo de base64
    const binaryString = atob(videoContent)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    const finalFileName = fileName || `video_${Date.now()}.mp4`
    const storagePath = `teste_${teste.ordem_servico_id}_${Date.now()}_${finalFileName}`

    console.log('Fazendo upload para:', storagePath)

    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('videos-teste')
      .upload(storagePath, bytes, {
        contentType: 'video/mp4',
        upsert: false
      })

    if (uploadError) {
      console.error('Erro no upload:', uploadError)
      throw uploadError
    }

    console.log('Upload concluído:', uploadData)

    // Obter URL pública do vídeo
    const { data: urlData } = supabaseClient.storage
      .from('videos-teste')
      .getPublicUrl(storagePath)
    
    const videoUrl = urlData.publicUrl
    console.log('URL pública:', videoUrl)

    // Atualizar teste com URL do vídeo
    const { error: updateError } = await supabaseClient
      .from('testes_equipamentos')
      .update({ video_url: videoUrl })
      .eq('id', testeId)

    if (updateError) {
      console.error('Erro ao atualizar teste:', updateError)
      throw updateError
    }

    console.log('Teste atualizado com sucesso')

    return new Response(
      JSON.stringify({ 
        success: true, 
        videoUrl,
        storagePath 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
