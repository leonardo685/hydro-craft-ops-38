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
export function extrairDadosNFe(chave: string): DadosNFe {
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

  // Gerar itens baseados na chave de acesso para simular dados reais
  const hashChave = chaveLimpa.split('').reduce((acc, char, index) => acc + parseInt(char) * (index + 1), 0);
  
  const mockItens: ItemNFe[][] = [
    [
      {
        codigo: "11008498",
        descricao: "ELDRO FREIO - PONTE ROLANTE 60/15T - ED6-H1-EDN203-EMH",
        ncm: "84314910",
        quantidade: 1.00,
        valorUnitario: 7000.00,
        valorTotal: 7000.00,
        unidade: "PC"
      }
    ],
    [
      {
        codigo: "22019587",
        descricao: "MOTOR ELÉTRICO TRIFÁSICO 15CV - 1750RPM - CARCAÇA 160M",
        ncm: "85011020",
        quantidade: 2.00,
        valorUnitario: 3500.00,
        valorTotal: 7000.00,
        unidade: "PC"
      },
      {
        codigo: "22019588", 
        descricao: "ACOPLAMENTO FLEXÍVEL TIPO GRADE - TAMANHO 112",
        ncm: "84832990",
        quantidade: 2.00,
        valorUnitario: 450.00,
        valorTotal: 900.00,
        unidade: "PC"
      }
    ],
    [
      {
        codigo: "33020147",
        descricao: "BOMBA CENTRÍFUGA HORIZONTAL - 5HP - VAZÃO 100M³/H",
        ncm: "84137000",
        quantidade: 1.00,
        valorUnitario: 8500.00,
        valorTotal: 8500.00,
        unidade: "UN"
      }
    ],
    [
      {
        codigo: "44021258",
        descricao: "REDUTOR DE VELOCIDADE - RELAÇÃO 1:30 - ENTRADA 1750RPM",
        ncm: "84834000",
        quantidade: 1.00,
        valorUnitario: 4200.00,
        valorTotal: 4200.00,
        unidade: "PC"
      },
      {
        codigo: "44021259",
        descricao: "KIT VEDAÇÃO COMPLETO PARA REDUTOR TAMANHO 063",
        ncm: "40169300",
        quantidade: 1.00,
        valorUnitario: 180.00,
        valorTotal: 180.00,
        unidade: "KT"
      }
    ],
    [
      {
        codigo: "55022369",
        descricao: "ROLAMENTO SKF 6208-2Z - ESFERAS BLINDADO",
        ncm: "84822000",
        quantidade: 4.00,
        valorUnitario: 85.00,
        valorTotal: 340.00,
        unidade: "PC"
      },
      {
        codigo: "55022370",
        descricao: "RETENTOR BORRACHA NITRÍLICA 35X52X7MM",
        ncm: "40169390",
        quantidade: 2.00,
        valorUnitario: 25.00,
        valorTotal: 50.00,
        unidade: "PC"
      }
    ]
  ];
  
  const indiceItens = hashChave % mockItens.length;
  const itens = mockItens[indiceItens];

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
 * Buscar nome do cliente por CNPJ (mock - em um sistema real seria uma consulta)
 */
export function buscarClientePorCNPJ(cnpj: string): string {
  const clientes: Record<string, string> = {
    '11.222.333/0001-44': 'LIZY SOFTWARES LTDA',
    '22.333.444/0001-55': 'NOVELIS DO BRASIL LTDA', 
    '33.444.555/0001-66': 'SSI EQUIPAMENTOS INDUSTRIAIS LIMITADA',
    '10.123.456/0001-78': 'METALÚRGICA INDUSTRIAL LTDA',
    '20.234.567/0001-89': 'EQUIPAMENTOS HIDRÁULICOS S.A.',
    '30.345.678/0001-90': 'AUTOMAÇÃO E CONTROLE LTDA',
    '40.456.789/0001-01': 'MECÂNICA PRECISION LTDA',
    '50.567.890/0001-12': 'BOMBAS E COMPRESSORES S.A.',
    '60.678.901/0001-23': 'INDÚSTRIA DE MOTORES LTDA',
    '70.789.012/0001-34': 'ROLAMENTOS E VEDAÇÕES S.A.'
  };
  
  // Se não encontrar o CNPJ específico, gerar um nome baseado no CNPJ
  if (clientes[cnpj]) {
    return clientes[cnpj];
  }
  
  // Gerar nome baseado no CNPJ para simular diferentes empresas
  const sufixos = ['LTDA', 'S.A.', 'EIRELI', 'LTDA ME'];
  const prefixos = ['INDÚSTRIA', 'COMERCIAL', 'METALÚRGICA', 'EQUIPAMENTOS', 'SISTEMAS', 'MECÂNICA'];
  const nomes = ['ALPHA', 'BETA', 'GAMMA', 'DELTA', 'SIGMA', 'OMEGA', 'TECH', 'INDUSTRIAL'];
  
  const cnpjNumerico = cnpj.replace(/\D/g, '');
  const hashCnpj = cnpjNumerico.split('').reduce((acc, digit) => acc + parseInt(digit), 0);
  
  const prefixo = prefixos[hashCnpj % prefixos.length];
  const nome = nomes[(hashCnpj * 2) % nomes.length];
  const sufixo = sufixos[(hashCnpj * 3) % sufixos.length];
  
  return `${prefixo} ${nome} ${sufixo}`;
}