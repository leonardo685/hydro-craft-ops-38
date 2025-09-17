// Utilitários para validação e extração de dados de chave de acesso NFe
import { supabase } from "@/integrations/supabase/client";

export interface ItemNFe {
  codigo: string;
  descricao: string;
  ncm: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  unidade: string;
}

export interface DadosNFe {
  chaveAcesso: string;
  cnpjEmitente: string;
  dataEmissao: string;
  modelo: string;
  serie: string;
  numero: string;
  codigoNumerico: string;
  digitoVerificador: string;
  valida: boolean;
  valorTotal?: number;
  clienteNome?: string;
  clienteCnpj?: string;
  itens?: ItemNFe[];
}

/**
 * Formatar chave de acesso com espaços (grupos de 4 dígitos)
 */
export function formatarChaveAcesso(chave: string): string {
  const apenasNumeros = chave.replace(/\D/g, '');
  return apenasNumeros.replace(/(\d{4})/g, '$1 ').trim();
}

/**
 * Remover formatação da chave de acesso
 */
export function limparChaveAcesso(chave: string): string {
  return chave.replace(/\D/g, '');
}

/**
 * Calcular dígito verificador da chave de acesso
 */
function calcularDigitoVerificador(chave: string): string {
  const sequencia = '43298765432987654329876543298765432987654329';
  let soma = 0;
  
  for (let i = 0; i < 43; i++) {
    soma += parseInt(chave[i]) * parseInt(sequencia[i]);
  }
  
  const resto = soma % 11;
  return resto < 2 ? '0' : (11 - resto).toString();
}

/**
 * Validar formato e dígito verificador da chave de acesso
 */
export function validarChaveAcesso(chave: string): boolean {
  const chaveLimpa = limparChaveAcesso(chave);
  
  // Deve ter exatamente 44 dígitos
  if (chaveLimpa.length !== 44) {
    return false;
  }
  
  // Validar dígito verificador
  const chave43Digitos = chaveLimpa.substring(0, 43);
  const digitoInformado = chaveLimpa[43];
  const digitoCalculado = calcularDigitoVerificador(chave43Digitos);
  
  return digitoInformado === digitoCalculado;
}

/**
 * Extrair informações da chave de acesso NFe
 */
export async function extrairDadosNFe(chave: string): Promise<DadosNFe> {
  const chaveLimpa = limparChaveAcesso(chave);
  const valida = validarChaveAcesso(chave);
  
  if (!valida || chaveLimpa.length !== 44) {
    return {
      chaveAcesso: chave,
      cnpjEmitente: '',
      dataEmissao: '',
      modelo: '',
      serie: '',
      numero: '',
      codigoNumerico: '',
      digitoVerificador: '',
      valida: false
    };
  }

  console.log('Iniciando consulta NFe via API:', chaveLimpa);

  try {
    // Chamar a edge function para consultar a NFe
    const response = await supabase.functions.invoke('consultar-nfe', {
      body: { chaveAcesso: chaveLimpa }
    });

    if (response.error) {
      console.error('Erro na consulta NFe:', response.error);
      throw new Error(`Erro na consulta: ${response.error.message}`);
    }

    if (!response.data?.success) {
      throw new Error(response.data?.error || 'Erro desconhecido na consulta');
    }

    const dados = response.data.dados;
    console.log('Dados NFe recebidos:', dados);

    return {
      chaveAcesso: chave,
      cnpjEmitente: dados.cliente_cnpj || dados.cnpj_emitente,
      dataEmissao: dados.data_emissao,
      modelo: dados.modelo === '55' ? 'NFe' : dados.modelo === '65' ? 'NFCe' : dados.modelo,
      serie: dados.serie,
      numero: dados.numero,
      codigoNumerico: chaveLimpa.substring(35, 43),
      digitoVerificador: chaveLimpa.substring(43, 44),
      valida: true,
      valorTotal: dados.valor_total,
      clienteNome: dados.cliente_nome,
      clienteCnpj: dados.cliente_cnpj,
      itens: dados.itens?.map((item: any) => ({
        codigo: item.codigo,
        descricao: item.descricao,
        ncm: item.ncm || '',
        quantidade: item.quantidade,
        valorUnitario: item.valor_unitario,
        valorTotal: item.valor_total,
        unidade: 'UN'
      })) || []
    };

  } catch (error) {
    console.error('Erro ao consultar NFe:', error);
    
    // Fallback para extrair informações básicas da chave se a API falhar
    const aamm = chaveLimpa.substring(2, 6);
    const cnpj = chaveLimpa.substring(6, 20);
    const modelo = chaveLimpa.substring(20, 22);
    const serie = chaveLimpa.substring(22, 25);
    const numero = chaveLimpa.substring(25, 34);
    const codigoNumerico = chaveLimpa.substring(35, 43);
    const digitoVerificador = chaveLimpa.substring(43, 44);

    const ano = 2000 + parseInt(aamm.substring(0, 2));
    const mes = parseInt(aamm.substring(2, 4));
    const dataEmissao = `${ano}-${mes.toString().padStart(2, '0')}-01`;

    const cnpjFormatado = formatarCNPJ(cnpj);
    const nomeCliente = await buscarClientePorCNPJ(cnpjFormatado);

    return {
      chaveAcesso: chave,
      cnpjEmitente: cnpjFormatado,
      dataEmissao,
      modelo: modelo === '55' ? 'NFe' : modelo === '65' ? 'NFCe' : modelo,
      serie: parseInt(serie).toString(),
      numero: parseInt(numero).toString(),
      codigoNumerico,
      digitoVerificador,
      valida: true,
      clienteNome: nomeCliente,
      clienteCnpj: cnpjFormatado,
      itens: [] // Sem itens quando a API falha
    };
  }
}

/**
 * Formatar CNPJ no padrão XX.XXX.XXX/XXXX-XX
 */
export function formatarCNPJ(cnpj: string): string {
  // Remove todos os caracteres não numéricos
  const apenasNumeros = cnpj.replace(/\D/g, '');
  
  // Se não tem 14 dígitos, retorna como está
  if (apenasNumeros.length !== 14) {
    return cnpj;
  }
  
  // Aplica a formatação XX.XXX.XXX/XXXX-XX
  return apenasNumeros.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    '$1.$2.$3/$4-$5'
  );
}

/**
 * Limpar CNPJ removendo formatação
 */
export function limparCNPJ(cnpj: string): string {
  return cnpj.replace(/\D/g, '');
}

/**
 * Buscar nome do cliente por CNPJ no banco de dados
 */
export async function buscarClientePorCNPJ(cnpj: string): Promise<string> {
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    
    // Tentar com CNPJ formatado e sem formatação
    const cnpjFormatado = formatarCNPJ(cnpj);
    const cnpjLimpo = limparCNPJ(cnpj);
    
    // Primeiro buscar na tabela de clientes com ambas as versões
    const { data: clienteData, error: clienteError } = await supabase
      .from('clientes')
      .select('nome')
      .or(`cnpj_cpf.eq.${cnpjFormatado},cnpj_cpf.eq.${cnpjLimpo}`)
      .maybeSingle();

    if (clienteData && !clienteError) {
      return clienteData.nome;
    }

    // Se não encontrar, buscar na tabela empresas_nfe com ambas as versões
    const { data, error } = await supabase
      .from('empresas_nfe')
      .select('razao_social')
      .or(`cnpj.eq.${cnpjFormatado},cnpj.eq.${cnpjLimpo}`)
      .maybeSingle();

    if (data && !error) {
      return data.razao_social;
    }

    return ''; // Retorna vazio se não encontrar em nenhuma tabela
  } catch (error) {
    console.error('Erro ao buscar cliente por CNPJ:', error);
    return '';
  }
}

/**
 * Buscar produtos por código no banco de dados
 */
export async function buscarProdutosPorCodigos(codigos: string[]): Promise<ItemNFe[]> {
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    
    const { data, error } = await supabase
      .from('produtos_nfe')
      .select('*')
      .in('codigo', codigos);

    if (error || !data || data.length === 0) {
      return []; // Retorna array vazio se não encontrar
    }

    return data.map(produto => ({
      codigo: produto.codigo,
      descricao: produto.descricao,
      ncm: produto.ncm || '',
      quantidade: 1.0,
      valorUnitario: 0,
      valorTotal: 0,
      unidade: 'UN'
    }));
  } catch (error) {
    console.error('Erro ao buscar produtos por códigos:', error);
    return [];
  }
}

/**
 * Salvar empresa na base de dados
 */
export async function salvarEmpresaNFe(cnpj: string, razaoSocial: string): Promise<void> {
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    
    await supabase
      .from('empresas_nfe')
      .upsert({ cnpj, razao_social: razaoSocial }, { onConflict: 'cnpj' });
  } catch (error) {
    console.error('Erro ao salvar empresa NFe:', error);
  }
}

/**
 * Salvar produto na base de dados
 */
export async function salvarProdutoNFe(codigo: string, descricao: string, ncm?: string): Promise<void> {
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    
    await supabase
      .from('produtos_nfe')
      .upsert({ codigo, descricao, ncm }, { onConflict: 'codigo,descricao' });
  } catch (error) {
    console.error('Erro ao salvar produto NFe:', error);
  }
}