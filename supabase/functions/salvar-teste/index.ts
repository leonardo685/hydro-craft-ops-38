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
        curso: dadosTeste.curso,
        qtd_ciclos: dadosTeste.qtdCiclos,
        pressao_maxima_trabalho: dadosTeste.pressaoMaximaTrabalho,
        tempo_minutos: dadosTeste.tempoMinutos,
        pressao_avanco: dadosTeste.pressaoAvanco,
        pressao_retorno: dadosTeste.pressaoRetorno,
        check_vazamento_pistao: dadosTeste.checkVazamentoPistao,
        check_vazamento_vedacoes_estaticas: dadosTeste.checkVazamentoVedacoesEstaticas,
        check_vazamento_haste: dadosTeste.checkVazamentoHaste,
        teste_performance_pr004: dadosTeste.testePerformancePR004,
        espessura_camada: dadosTeste.espessuraCamada,
        check_ok: dadosTeste.checkOk,
        observacao: dadosTeste.observacao,
        data_hora_teste: dadosTeste.dataHoraTeste,
        video_url: dadosTeste.videoUrl,
        tipo_teste: 'Teste Final',
        resultado_teste: 'Em andamento'
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