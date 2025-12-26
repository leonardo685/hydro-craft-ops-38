import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Search, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export type TipoIdentificacao = 'cnpj' | 'ein';

interface IdentificacaoInputProps {
  tipoIdentificacao: TipoIdentificacao;
  onTipoChange: (tipo: TipoIdentificacao) => void;
  value: string;
  onChange: (value: string) => void;
  onDataFetch?: (data: any) => void;
  disabled?: boolean;
  showTipoSelector?: boolean;
}

export const IdentificacaoInput = ({ 
  tipoIdentificacao,
  onTipoChange,
  value, 
  onChange, 
  onDataFetch, 
  disabled,
  showTipoSelector = true
}: IdentificacaoInputProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const formatCNPJ = (cnpj: string) => {
    const numbers = cnpj.replace(/\D/g, '');
    if (numbers.length <= 2) {
      return numbers;
    } else if (numbers.length <= 5) {
      return `${numbers.slice(0, 2)}.${numbers.slice(2)}`;
    } else if (numbers.length <= 8) {
      return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5)}`;
    } else if (numbers.length <= 12) {
      return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8)}`;
    } else {
      return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8, 12)}-${numbers.slice(12, 14)}`;
    }
  };

  const formatEIN = (ein: string) => {
    const numbers = ein.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    return `${numbers.slice(0, 2)}-${numbers.slice(2, 9)}`;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    if (tipoIdentificacao === 'cnpj') {
      onChange(formatCNPJ(rawValue));
    } else {
      onChange(formatEIN(rawValue));
    }
  };

  const handleSearch = async () => {
    if (tipoIdentificacao !== 'cnpj') {
      toast.info('Busca automática disponível apenas para CNPJ brasileiro');
      return;
    }

    const cnpjNumbers = value.replace(/\D/g, '');
    
    if (cnpjNumbers === '00000000000000') {
      toast.info('CNPJ genérico detectado. Preencha os campos manualmente.');
      return;
    }

    if (cnpjNumbers.length !== 14) {
      toast.error('CNPJ deve ter 14 dígitos');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjNumbers}`);
      
      if (!response.ok) {
        throw new Error("CNPJ não encontrado");
      }

      const data = await response.json();

      const mappedData = {
        nome: data.nome_fantasia || data.razao_social || '',
        email: data.email || '',
        telefone: data.ddd_telefone_1 || '',
        endereco: `${data.logradouro || ''} ${data.numero || ''} ${data.complemento || ''}, ${data.bairro || ''}`.trim().replace(/,\s*$/, ''),
        cidade: data.municipio || '',
        estado: data.uf || '',
        cep: data.cep ? data.cep.replace(/\D/g, '').replace(/^(\d{5})(\d{3})$/, '$1-$2') : '',
        cnpj_cpf: value,
        inscricao_estadual: '',
        inscricao_municipal: '',
        observacoes: `Situação: ${data.situacao_cadastral || 'N/A'}\nAtividade Principal: ${data.cnae_fiscal_descricao || 'N/A'}`
      };

      onDataFetch?.(mappedData);
      toast.success('Dados importados com sucesso!');
    } catch (error) {
      console.error('Erro ao consultar CNPJ:', error);
      toast.error('Erro ao consultar CNPJ. Verifique sua conexão.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTipoChange = (newTipo: TipoIdentificacao) => {
    onTipoChange(newTipo);
    onChange(''); // Limpa o valor ao trocar de tipo
  };

  const labels = {
    identificacao: tipoIdentificacao === 'cnpj' ? 'CNPJ' : 'EIN',
    placeholder: tipoIdentificacao === 'cnpj' ? '00.000.000/0000-00' : '00-0000000',
    maxLength: tipoIdentificacao === 'cnpj' ? 18 : 10,
  };

  return (
    <div className="space-y-3">
      {showTipoSelector && (
        <div className="space-y-2">
          <Label>País / Tipo de Identificação</Label>
          <RadioGroup
            value={tipoIdentificacao}
            onValueChange={(v) => handleTipoChange(v as TipoIdentificacao)}
            className="flex gap-4"
            disabled={disabled}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="cnpj" id="id-cnpj" />
              <Label htmlFor="id-cnpj" className="flex items-center gap-2 cursor-pointer font-normal">
                <span>🇧🇷</span>
                Brasil (CNPJ)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="ein" id="id-ein" />
              <Label htmlFor="id-ein" className="flex items-center gap-2 cursor-pointer font-normal">
                <span>🇺🇸</span>
                EUA (EIN)
              </Label>
            </div>
          </RadioGroup>
        </div>
      )}
      
      <div>
        <Label>{labels.identificacao} *</Label>
        <div className="flex gap-2 mt-1">
          <div className="flex-1">
            <Input
              value={value}
              onChange={handleChange}
              placeholder={labels.placeholder}
              maxLength={labels.maxLength}
              disabled={disabled}
            />
          </div>
          {tipoIdentificacao === 'cnpj' && onDataFetch && (
            <Button
              type="button"
              variant="outline"
              onClick={handleSearch}
              disabled={disabled || isLoading || !value || value.replace(/\D/g, '').length !== 14}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              {isLoading ? 'Pesquisando...' : 'Pesquisar'}
            </Button>
          )}
        </div>
        {tipoIdentificacao === 'cnpj' && onDataFetch && (
          <p className="text-xs text-muted-foreground mt-1">
            Clique em Pesquisar para buscar dados automaticamente
          </p>
        )}
      </div>
    </div>
  );
};

// Funções utilitárias para formatação
export const formatTelefoneBR = (value: string) => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 10) {
    return numbers
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
  return numbers
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .slice(0, 15);
};

export const formatTelefoneUS = (value: string) => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 3) return numbers;
  if (numbers.length <= 6) return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`;
  return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`;
};

export const formatCEP = (value: string) => {
  const numbers = value.replace(/\D/g, '');
  return numbers.replace(/^(\d{5})(\d)/, '$1-$2').slice(0, 9);
};

export const formatZIPCode = (value: string) => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 5) return numbers;
  return `${numbers.slice(0, 5)}-${numbers.slice(5, 9)}`;
};

// Função para obter labels dinâmicos baseados no tipo
export const getLabels = (tipoIdentificacao: TipoIdentificacao) => ({
  identificacao: tipoIdentificacao === 'cnpj' ? 'CNPJ' : 'EIN',
  placeholderIdentificacao: tipoIdentificacao === 'cnpj' ? '00.000.000/0000-00' : '00-0000000',
  codigoPostal: tipoIdentificacao === 'cnpj' ? 'CEP' : 'ZIP Code',
  placeholderCodigoPostal: tipoIdentificacao === 'cnpj' ? '00000-000' : '00000',
  placeholderTelefone: tipoIdentificacao === 'cnpj' ? '(00) 00000-0000' : '(000) 000-0000',
  placeholderEstado: tipoIdentificacao === 'cnpj' ? 'SP' : 'CA',
  cidade: tipoIdentificacao === 'cnpj' ? 'Cidade' : 'City',
  estado: tipoIdentificacao === 'cnpj' ? 'Estado' : 'State',
  endereco: tipoIdentificacao === 'cnpj' ? 'Endereço' : 'Address',
  placeholderEndereco: tipoIdentificacao === 'cnpj' ? 'Rua, Número, Bairro' : 'Street, Number, Suite',
  inscricaoEstadual: tipoIdentificacao === 'cnpj' ? 'Inscrição Estadual' : 'State Tax ID',
  inscricaoMunicipal: tipoIdentificacao === 'cnpj' ? 'Inscrição Municipal' : 'City Tax ID',
});
