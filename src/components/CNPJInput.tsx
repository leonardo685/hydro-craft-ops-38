import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface CNPJInputProps {
  value: string;
  onChange: (value: string) => void;
  onDataFetch: (data: any) => void;
  disabled?: boolean;
}

export const CNPJInput = ({ value, onChange, onDataFetch, disabled }: CNPJInputProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const formatCNPJ = (cnpj: string) => {
    // Remove tudo que não é número
    const numbers = cnpj.replace(/\D/g, '');
    
    // Aplica a máscara 00.000.000/0000-00
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

  const handleCNPJChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCNPJ(e.target.value);
    onChange(formatted);
  };

  const handleSearch = async () => {
    const cnpjNumbers = value.replace(/\D/g, '');
    
    // Verifica se é o CNPJ genérico
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
      const response = await fetch(`https://receitaws.com.br/v1/cnpj/${cnpjNumbers}`);
      const data = await response.json();

      if (data.status === 'ERROR') {
        toast.error(data.message || 'Erro ao consultar CNPJ');
        return;
      }

      // Mapeia os dados da API para os campos do formulário
      const mappedData = {
        nome: data.nome || '',
        email: data.email || '',
        telefone: data.telefone || '',
        endereco: `${data.logradouro || ''} ${data.numero || ''} ${data.complemento || ''}`.trim(),
        cidade: data.municipio || '',
        estado: data.uf || '',
        cep: data.cep || '',
        cnpj_cpf: value, // Mantém o CNPJ formatado
        inscricao_estadual: '',
        inscricao_municipal: '',
        observacoes: `Situação: ${data.situacao || 'N/A'}\nAtividade Principal: ${data.atividade_principal?.[0]?.text || 'N/A'}`
      };

      onDataFetch(mappedData);
      toast.success('Dados importados com sucesso!');
    } catch (error) {
      console.error('Erro ao consultar CNPJ:', error);
      toast.error('Erro ao consultar CNPJ. Verifique sua conexão.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex gap-2">
      <div className="flex-1">
        <Input
          value={value}
          onChange={handleCNPJChange}
          placeholder="00.000.000/0000-00"
          maxLength={18}
          disabled={disabled}
        />
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={handleSearch}
        disabled={disabled || isLoading || !value}
        className="flex items-center gap-2"
      >
        <Search className="h-4 w-4" />
        {isLoading ? 'Pesquisando...' : 'Pesquisar'}
      </Button>
    </div>
  );
};