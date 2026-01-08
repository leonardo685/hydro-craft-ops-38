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
  nome_emitente: string;
  data_emissao: Date;
  modelo: string;
  serie: string;
  numero: string;
  cliente_nome: string;
  cliente_cnpj?: string;
  valor_total?: number;
  itens?: ItemNFe[];
}

// Função para parsear XML e extrair dados
function parseXmlValue(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}>([^<]*)</${tag}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1] : '';
}

function parseXmlItems(xml: string): ItemNFe[] {
  const items: ItemNFe[] = [];
  const detRegex = /<det[^>]*>([\s\S]*?)<\/det>/gi;
  let detMatch;
  
  while ((detMatch = detRegex.exec(xml)) !== null) {
    const detContent = detMatch[1];
    const prodMatch = detContent.match(/<prod>([\s\S]*?)<\/prod>/i);
    
    if (prodMatch) {
      const prodContent = prodMatch[1];
      items.push({
        codigo: parseXmlValue(prodContent, 'cProd'),
        descricao: parseXmlValue(prodContent, 'xProd'),
        quantidade: parseFloat(parseXmlValue(prodContent, 'qCom') || '0'),
        valor_unitario: parseFloat(parseXmlValue(prodContent, 'vUnCom') || '0'),
        valor_total: parseFloat(parseXmlValue(prodContent, 'vProd') || '0'),
        ncm: parseXmlValue(prodContent, 'NCM'),
      });
    }
  }
  
  return items;
}

function parseNFeXml(xml: string, chaveAcesso: string): DadosNFe {
  // Extrair dados do emitente
  const emitMatch = xml.match(/<emit>([\s\S]*?)<\/emit>/i);
  const emitContent = emitMatch ? emitMatch[1] : '';
  
  // Extrair dados do destinatário
  const destMatch = xml.match(/<dest>([\s\S]*?)<\/dest>/i);
  const destContent = destMatch ? destMatch[1] : '';
  
  // Extrair dados da identificação
  const ideMatch = xml.match(/<ide>([\s\S]*?)<\/ide>/i);
  const ideContent = ideMatch ? ideMatch[1] : '';
  
  // Extrair valor total
  const totalMatch = xml.match(/<ICMSTot>([\s\S]*?)<\/ICMSTot>/i);
  const totalContent = totalMatch ? totalMatch[1] : '';
  
  // Formatar CNPJ
  const cnpjEmit = parseXmlValue(emitContent, 'CNPJ');
  const cnpjFormatado = cnpjEmit.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  
  const cnpjDest = parseXmlValue(destContent, 'CNPJ');
  const cnpjDestFormatado = cnpjDest ? cnpjDest.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') : '';
  
  // Parsear data de emissão
  const dhEmi = parseXmlValue(ideContent, 'dhEmi');
  const dataEmissao = dhEmi ? new Date(dhEmi) : new Date();
  
  return {
    chave_acesso: chaveAcesso,
    cnpj_emitente: cnpjFormatado || cnpjEmit,
    nome_emitente: parseXmlValue(emitContent, 'xNome') || parseXmlValue(emitContent, 'xFant') || 'Emitente não identificado',
    data_emissao: dataEmissao,
    modelo: parseXmlValue(ideContent, 'mod') || '55',
    serie: parseXmlValue(ideContent, 'serie') || '1',
    numero: parseXmlValue(ideContent, 'nNF') || '',
    cliente_nome: parseXmlValue(destContent, 'xNome') || 'Cliente não identificado',
    cliente_cnpj: cnpjDestFormatado || cnpjDest,
    valor_total: parseFloat(parseXmlValue(totalContent, 'vNF') || '0'),
    itens: parseXmlItems(xml),
  };
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
      .maybeSingle();

    if (notaExistente) {
      console.log('NFe encontrada no cache local');
      return new Response(
        JSON.stringify({
          success: true,
          dados: {
            ...notaExistente,
            itens: notaExistente.itens_nfe || []
          },
          source: 'cache'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Consultar API Meu Danfe
    const meuDanfeApiKey = Deno.env.get('MEUDANFE_API_KEY');
    
    if (!meuDanfeApiKey) {
      console.log('API Key Meu Danfe não configurada');
      return new Response(
        JSON.stringify({ 
          error: 'API Key não configurada. Configure a MEUDANFE_API_KEY nas secrets do projeto.' 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    let dadosNFe: DadosNFe | null = null;

    try {
      // Passo 1: Adicionar a NFe na conta do Meu Danfe
      console.log('Adicionando NFe no Meu Danfe...');
      const addResponse = await fetch(
        `https://api.meudanfe.com.br/v2/fd/add/${chaveAcesso}`,
        {
          method: 'PUT',
          headers: {
            'Api-Key': meuDanfeApiKey,
          },
        }
      );

      if (!addResponse.ok) {
        const errorText = await addResponse.text();
        console.log('Erro ao adicionar NFe:', addResponse.status, errorText);
        
        // Se retornar 409, a NFe já existe - continuar para buscar o XML
        if (addResponse.status !== 409) {
          throw new Error(`Erro ao adicionar NFe: ${addResponse.status} - ${errorText}`);
        }
      } else {
        console.log('NFe adicionada com sucesso');
      }

      // Passo 2: Buscar o XML da NFe
      console.log('Buscando XML da NFe...');
      const xmlResponse = await fetch(
        `https://api.meudanfe.com.br/v2/fd/get/xml/${chaveAcesso}`,
        {
          method: 'GET',
          headers: {
            'Api-Key': meuDanfeApiKey,
          },
        }
      );

      if (!xmlResponse.ok) {
        const errorText = await xmlResponse.text();
        console.log('Erro ao buscar XML:', xmlResponse.status, errorText);
        throw new Error(`Erro ao buscar XML: ${xmlResponse.status} - ${errorText}`);
      }

      const xmlContent = await xmlResponse.text();
      console.log('XML recebido, parseando dados...');
      
      // Parsear o XML
      dadosNFe = parseNFeXml(xmlContent, chaveAcesso);
      console.log('Dados parseados:', JSON.stringify({
        numero: dadosNFe.numero,
        emitente: dadosNFe.nome_emitente,
        cliente: dadosNFe.cliente_nome,
        itens: dadosNFe.itens?.length
      }));

    } catch (apiError) {
      console.error('Erro na API Meu Danfe:', apiError.message);
      
      // Fallback: extrair dados básicos da chave de acesso
      const aamm = chaveAcesso.substring(2, 6);
      const cnpj = chaveAcesso.substring(6, 20);
      const modelo = chaveAcesso.substring(20, 22);
      const serie = chaveAcesso.substring(22, 25);
      const numero = chaveAcesso.substring(25, 34);

      const ano = 2000 + parseInt(aamm.substring(0, 2));
      const mes = parseInt(aamm.substring(2, 4));
      const dataEmissao = new Date(ano, mes - 1, 1);
      
      const cnpjFormatado = cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');

      dadosNFe = {
        chave_acesso: chaveAcesso,
        cnpj_emitente: cnpjFormatado,
        nome_emitente: 'Consulta pendente - edite manualmente',
        data_emissao: dataEmissao,
        modelo: modelo === '55' ? 'NFe' : modelo === '65' ? 'NFCe' : modelo,
        serie: parseInt(serie).toString(),
        numero: parseInt(numero).toString(),
        cliente_nome: 'Consulta pendente - edite manualmente',
        cliente_cnpj: '',
        valor_total: 0,
        itens: []
      };

      return new Response(
        JSON.stringify({
          success: false,
          error: `Erro ao consultar NFe: ${apiError.message}`,
          dados: dadosNFe,
          source: 'fallback'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Salvar no banco local
    const { data: notaCriada, error: insertError } = await supabase
      .from('notas_fiscais')
      .insert({
        chave_acesso: dadosNFe.chave_acesso,
        cnpj_emitente: dadosNFe.cnpj_emitente,
        nome_emitente: dadosNFe.nome_emitente,
        data_emissao: dadosNFe.data_emissao,
        modelo: dadosNFe.modelo,
        serie: dadosNFe.serie,
        numero: dadosNFe.numero,
        cliente_nome: dadosNFe.cliente_nome,
        cliente_cnpj: dadosNFe.cliente_cnpj,
        valor_total: dadosNFe.valor_total,
        status: 'processada'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Erro ao salvar nota:', insertError);
    }

    if (notaCriada && dadosNFe.itens && dadosNFe.itens.length > 0) {
      // Salvar itens
      const itensParaInserir = dadosNFe.itens.map(item => ({
        nota_fiscal_id: notaCriada.id,
        codigo: item.codigo,
        descricao: item.descricao,
        quantidade: item.quantidade,
        valor_unitario: item.valor_unitario,
        valor_total: item.valor_total,
        ncm: item.ncm
      }));

      const { error: itensError } = await supabase
        .from('itens_nfe')
        .insert(itensParaInserir);

      if (itensError) {
        console.error('Erro ao salvar itens:', itensError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        dados: dadosNFe,
        source: 'meudanfe'
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
