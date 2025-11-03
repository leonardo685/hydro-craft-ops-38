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

    const formData = await req.formData()
    const testeId = formData.get('testeId') as string
    const videoFile = formData.get('video') as File

    if (!testeId || !videoFile) {
      throw new Error('testeId e video são obrigatórios')
    }

    // Buscar informações do teste
    const { data: teste, error: testeError } = await supabaseClient
      .from('testes_equipamentos')
      .select('ordem_servico_id')
      .eq('id', testeId)
      .single()

    if (testeError) throw testeError

    // Sanitizar nome do arquivo (remover caracteres especiais)
    const sanitizeFileName = (name: string) => {
      const extension = name.split('.').pop() || 'mp4'
      const nameWithoutExt = name.substring(0, name.lastIndexOf('.')) || name
      
      // Remove acentos e caracteres especiais
      const sanitized = nameWithoutExt
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove acentos
        .replace(/[^a-zA-Z0-9]/g, '_')    // Substitui caracteres especiais por _
        .replace(/_+/g, '_')              // Remove underscores duplicados
        .toLowerCase()
      
      return `${sanitized}.${extension}`
    }

    const sanitizedName = sanitizeFileName(videoFile.name)
    const fileName = `teste_${teste.ordem_servico_id}_${Date.now()}_${sanitizedName}`
    
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('videos-teste')
      .upload(fileName, videoFile, {
        contentType: videoFile.type,
        upsert: false
      })

    if (uploadError) throw uploadError

    // Obter URL pública do vídeo
    const { data: urlData } = supabaseClient.storage
      .from('videos-teste')
      .getPublicUrl(fileName)
    
    const videoUrl = urlData.publicUrl

    // Atualizar teste com URL do vídeo
    const { error: updateError } = await supabaseClient
      .from('testes_equipamentos')
      .update({ video_url: videoUrl })
      .eq('id', testeId)

    if (updateError) throw updateError

    console.log('Vídeo uploaded e teste atualizado:', { testeId, fileName, videoUrl })

    return new Response(
      JSON.stringify({ 
        success: true, 
        videoUrl,
        fileName 
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
