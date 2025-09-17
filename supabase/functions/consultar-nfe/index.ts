import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ItemNFe {
  codigo: string;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  ncm?: string;
}

interface DadosNFe {
  chave_acesso: string;
  cnpj_emitente: string;
  data_emissao: Date;
  modelo: string;
  serie: string;
  numero: string;
  cliente_nome: string;
  cliente_cnpj?: string;
  valor_total?: number;
  itens?: ItemNFe[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { chaveAcesso } = await req.json();
    
    if (!chaveAcesso || chaveAcesso.length !== 44) {
      return new Response(
        JSON.stringify({ error: 'Chave de acesso inválida' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Consultando NFe:', chaveAcesso);

    // Inicializar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verificar se já existe no banco local
    const { data: notaExistente } = await supabase
      .from('notas_fiscais')
      .select(`
        *,
        itens_nfe (*)
      `)
      .eq('chave_acesso', chaveAcesso)
      .single();

    if (notaExistente) {
      console.log('NFe encontrada no cache local');
      return new Response(
        JSON.stringify({
          success: true,
          dados: {
            ...notaExistente,
            itens: notaExistente.itens_nfe || []
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Consultar API SERPRO
    const serproApiKey = Deno.env.get('SERPRO_API_KEY');
    
    if (!serproApiKey) {
      console.log('API Key SERPRO não configurada, usando dados simulados');
      
      // Dados simulados para demonstração
      const dadosSimulados: DadosNFe = {
        chave_acesso: chaveAcesso,
        cnpj_emitente: '60561800004109',
        data_emissao: new Date(),
        modelo: '55',
        serie: '001',
        numero: '954175',
        cliente_nome: 'MEC HIDRO LTDA',
        cliente_cnpj: '60561800004109',
        valor_total: 1500.00,
        itens: [
          {
            codigo: 'CILINDRO001',
            descricao: 'CILINDRO MECANICO HIDRAULICO',
            quantidade: 1,
            valor_unitario: 1500.00,
            valor_total: 1500.00,
            ncm: '84123900'
          }
        ]
      };

      // Salvar no banco local
      const { data: notaCriada } = await supabase
        .from('notas_fiscais')
        .insert({
          chave_acesso: dadosSimulados.chave_acesso,
          cnpj_emitente: dadosSimulados.cnpj_emitente,
          data_emissao: dadosSimulados.data_emissao,
          modelo: dadosSimulados.modelo,
          serie: dadosSimulados.serie,
          numero: dadosSimulados.numero,
          cliente_nome: dadosSimulados.cliente_nome,
          cliente_cnpj: dadosSimulados.cliente_cnpj,
          valor_total: dadosSimulados.valor_total,
          status: 'processada'
        })
        .select()
        .single();

      if (notaCriada && dadosSimulados.itens) {
        // Salvar itens
        const itensParaInserir = dadosSimulados.itens.map(item => ({
          nota_fiscal_id: notaCriada.id,
          codigo: item.codigo,
          descricao: item.descricao,
          quantidade: item.quantidade,
          valor_unitario: item.valor_unitario,
          valor_total: item.valor_total,
          ncm: item.ncm
        }));

        await supabase
          .from('itens_nfe')
          .insert(itensParaInserir);
      }

      return new Response(
        JSON.stringify({
          success: true,
          dados: dadosSimulados,
          source: 'simulado'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Aqui você implementaria a chamada real para a API SERPRO
    // Exemplo de endpoint: https://apigateway.serpro.gov.br/consulta-nfe/v1/nfe/{chaveAcesso}
    
    const response = await fetch(`https://apigateway.serpro.gov.br/consulta-nfe/v1/nfe/${chaveAcesso}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${serproApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Erro da API SERPRO: ${response.status} - ${response.statusText}`);
    }

    const dadosSerpro = await response.json();
    console.log('Dados recebidos do SERPRO:', dadosSerpro);

    // Aqui você processaria os dados do SERPRO e salvaria no banco
    // Este é um exemplo da estrutura esperada
    const dadosProcessados: DadosNFe = {
      chave_acesso: chaveAcesso,
      cnpj_emitente: dadosSerpro.emit?.CNPJ || '',
      data_emissao: new Date(dadosSerpro.ide?.dhEmi || new Date()),
      modelo: dadosSerpro.ide?.mod || '55',
      serie: dadosSerpro.ide?.serie || '001',
      numero: dadosSerpro.ide?.nNF || '',
      cliente_nome: dadosSerpro.dest?.xNome || '',
      cliente_cnpj: dadosSerpro.dest?.CNPJ || '',
      valor_total: parseFloat(dadosSerpro.total?.ICMSTot?.vNF || '0'),
      itens: dadosSerpro.det?.map((item: any) => ({
        codigo: item.prod?.cProd || '',
        descricao: item.prod?.xProd || '',
        quantidade: parseFloat(item.prod?.qCom || '0'),
        valor_unitario: parseFloat(item.prod?.vUnCom || '0'),
        valor_total: parseFloat(item.prod?.vProd || '0'),
        ncm: item.prod?.NCM || ''
      })) || []
    };

    return new Response(
      JSON.stringify({
        success: true,
        dados: dadosProcessados,
        source: 'serpro'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Erro na consulta NFe:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor',
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});