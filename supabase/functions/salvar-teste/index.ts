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

    const { ordemId, dadosTeste } = await req.json()

    // Inserir dados do teste
    const { error: insertError } = await supabaseClient
      .from('testes_equipamentos')
      .insert({
        ordem_servico_id: ordemId,
        tipo_teste: dadosTeste.tipoTeste,
        pressao_teste: dadosTeste.pressaoTeste,
        temperatura_operacao: dadosTeste.temperaturaOperacao,
        observacoes_teste: dadosTeste.observacoesTeste,
        resultado_teste: dadosTeste.resultadoTeste,
        data_hora_teste: dadosTeste.dataHoraTeste,
        video_url: dadosTeste.videoUrl
      })

    if (insertError) {
      console.error('Erro ao inserir teste:', insertError)
      throw insertError
    }

    // Atualizar status da ordem para em_teste
    const { error: updateError } = await supabaseClient
      .from('ordens_servico')
      .update({ status: 'em_teste' })
      .eq('id', ordemId)

    if (updateError) {
      console.error('Erro ao atualizar ordem:', updateError)
      throw updateError
    }

    return new Response(
      JSON.stringify({ success: true }),
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