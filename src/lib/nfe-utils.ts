// Utilitários para validação e extração de dados de chave de acesso NFe

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

  // Estrutura da chave: UF(2) + AAMM(4) + CNPJ(14) + MOD(2) + SER(3) + NNF(9) + TPEMIS(1) + CNNN(8) + DV(1)
  const uf = chaveLimpa.substring(0, 2);
  const aamm = chaveLimpa.substring(2, 6);
  const cnpj = chaveLimpa.substring(6, 20);
  const modelo = chaveLimpa.substring(20, 22);
  const serie = chaveLimpa.substring(22, 25);
  const numero = chaveLimpa.substring(25, 34);
  const tpEmis = chaveLimpa.substring(34, 35);
  const codigoNumerico = chaveLimpa.substring(35, 43);
  const digitoVerificador = chaveLimpa.substring(43, 44);

  // Converter AAMM para data
  const ano = 2000 + parseInt(aamm.substring(0, 2));
  const mes = parseInt(aamm.substring(2, 4));
  const dataEmissao = `${ano}-${mes.toString().padStart(2, '0')}-01`;

  // Formatar CNPJ
  const cnpjFormatado = cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');

  // Para dados reais, deixar itens vazio inicialmente
  // Os itens serão carregados separadamente via API ou base de dados
  const itens: ItemNFe[] = [];

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
    itens
  };
}

/**
 * Buscar nome do cliente por CNPJ no banco de dados
 */
export async function buscarClientePorCNPJ(cnpj: string): Promise<string> {
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    
    const { data, error } = await supabase
      .from('empresas_nfe')
      .select('razao_social')
      .eq('cnpj', cnpj)
      .single();

    if (error || !data) {
      // Se não encontrar, tentar buscar na tabela de clientes
      const { data: clienteData, error: clienteError } = await supabase
        .from('clientes')
        .select('nome')
        .eq('cnpj_cpf', cnpj)
        .single();

      if (clienteError || !clienteData) {
        return ''; // Retorna vazio se não encontrar
      }
      
      return clienteData.nome;
    }

    return data.razao_social;
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