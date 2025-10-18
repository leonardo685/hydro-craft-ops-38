import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Recebimento {
  id: number;
  numero_ordem: string;
  cliente_id?: string;
  cliente_nome: string;
  cliente_cnpj?: string;
  data_entrada: string;
  nota_fiscal?: string;
  chave_acesso_nfe?: string;
  tipo_equipamento: string;
  numero_serie?: string;
  pressao_trabalho?: string;
  temperatura_trabalho?: string;
  fluido_trabalho?: string;
  local_instalacao?: string;
  potencia?: string;
  observacoes?: string;
  urgente: boolean;
  na_empresa: boolean;
  status: string;
  data_analise?: string;
  fotos?: FotoEquipamento[];
  clientes?: {
    id: string;
    nome: string;
  };
  temOrdemServico?: boolean;
}

export interface FotoEquipamento {
  id: string;
  arquivo_url: string;
  nome_arquivo: string;
  apresentar_orcamento: boolean;
}

export interface NotaFiscal {
  id: string;
  chave_acesso: string;
  cnpj_emitente: string;
  numero: string;
  serie: string;
  modelo: string;
  data_emissao: string;
  cliente_nome: string;
  cliente_cnpj?: string;
  valor_total?: number;
  status: string;
  created_at: string;
  itens?: ItemNFe[];
}

export interface ItemNFe {
  id: string;
  codigo: string;
  descricao: string;
  ncm?: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
}

export const useRecebimentos = () => {
  const [recebimentos, setRecebimentos] = useState<Recebimento[]>([]);
  const [notasFiscais, setNotasFiscais] = useState<NotaFiscal[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const carregarRecebimentos = async () => {
    try {
      const { data, error } = await supabase
        .from('recebimentos')
        .select(`
          *,
          clientes:cliente_id (
            id,
            nome
          ),
          fotos_equipamentos (
            id,
            arquivo_url,
            nome_arquivo,
            apresentar_orcamento
          )
        `)
        .order('data_entrada', { ascending: false });

      if (error) throw error;

      // Buscar ordens de serviço para verificar quais recebimentos já têm análise
      const { data: ordensData } = await supabase
        .from('ordens_servico')
        .select('recebimento_id');

      const recebimentosComOrdem = new Set(
        ordensData?.map(ordem => ordem.recebimento_id).filter(Boolean) || []
      );

      const recebimentosFormatados = data?.map(rec => ({
        ...rec,
        fotos: rec.fotos_equipamentos || [],
        temOrdemServico: recebimentosComOrdem.has(rec.id)
      })) || [];

      setRecebimentos(recebimentosFormatados);
    } catch (error) {
      console.error('Erro ao carregar recebimentos:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar recebimentos",
        variant: "destructive",
      });
    }
  };

  const carregarNotasFiscais = async () => {
    try {
      const { data, error } = await supabase
        .from('notas_fiscais')
        .select(`
          *,
          itens_nfe (*)
        `)
        .order('data_emissao', { ascending: false });

      if (error) throw error;

      const notasFormatadas = data?.map(nota => ({
        ...nota,
        itens: nota.itens_nfe || []
      })) || [];

      setNotasFiscais(notasFormatadas);
    } catch (error) {
      console.error('Erro ao carregar notas fiscais:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar notas fiscais",
        variant: "destructive",
      });
    }
  };

  const criarRecebimento = async (dadosRecebimento: Omit<Recebimento, 'id'>) => {
    try {
      const { data, error } = await supabase
        .from('recebimentos')
        .insert([dadosRecebimento])
        .select()
        .single();

      if (error) throw error;

      await carregarRecebimentos();
      
      toast({
        title: "Sucesso",
        description: "Recebimento criado com sucesso",
      });

      return data;
    } catch (error) {
      console.error('Erro ao criar recebimento:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar recebimento",
        variant: "destructive",
      });
      throw error;
    }
  };

  const atualizarRecebimento = async (id: number, dados: Partial<Recebimento>) => {
    try {
      const { error } = await supabase
        .from('recebimentos')
        .update(dados)
        .eq('id', id);

      if (error) throw error;

      await carregarRecebimentos();
      
      toast({
        title: "Sucesso",
        description: "Recebimento atualizado com sucesso",
      });
    } catch (error) {
      console.error('Erro ao atualizar recebimento:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar recebimento",
        variant: "destructive",
      });
      throw error;
    }
  };

  const criarNotaFiscal = async (dadosNota: Omit<NotaFiscal, 'id'>, itens: Omit<ItemNFe, 'id'>[]) => {
    try {
      const { data: notaData, error: notaError } = await supabase
        .from('notas_fiscais')
        .insert([dadosNota])
        .select()
        .single();

      if (notaError) throw notaError;

      if (itens.length > 0) {
        const itensComNotaId = itens.map(item => ({
          ...item,
          nota_fiscal_id: notaData.id
        }));

        const { error: itensError } = await supabase
          .from('itens_nfe')
          .insert(itensComNotaId);

        if (itensError) throw itensError;
      }

      await carregarNotasFiscais();
      
      toast({
        title: "Sucesso",
        description: "Nota fiscal criada com sucesso",
      });

      return notaData;
    } catch (error) {
      console.error('Erro ao criar nota fiscal:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar nota fiscal",
        variant: "destructive",
      });
      throw error;
    }
  };

  const uploadFoto = async (recebimentoId: number, arquivo: File, apresentarOrcamento: boolean = false) => {
    try {
      // Sanitiza o nome do arquivo removendo caracteres especiais
      const nomeArquivoLimpo = arquivo.name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove acentos
        .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace caracteres especiais com underscore
        .replace(/_{2,}/g, '_'); // Remove underscores duplos
      
      const nomeArquivo = `${recebimentoId}/${Date.now()}_${nomeArquivoLimpo}`;
      
      const { error: uploadError } = await supabase.storage
        .from('equipamentos')
        .upload(nomeArquivo, arquivo);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('equipamentos')
        .getPublicUrl(nomeArquivo);

      const { error: dbError } = await supabase
        .from('fotos_equipamentos')
        .insert([{
          recebimento_id: recebimentoId,
          arquivo_url: urlData.publicUrl,
          nome_arquivo: arquivo.name,
          apresentar_orcamento: apresentarOrcamento
        }]);

      if (dbError) throw dbError;

      await carregarRecebimentos();
      
      toast({
        title: "Sucesso",
        description: "Foto enviada com sucesso",
      });
    } catch (error) {
      console.error('Erro ao fazer upload da foto:', error);
      toast({
        title: "Erro",
        description: "Erro ao enviar foto",
        variant: "destructive",
      });
      throw error;
    }
  };

  const gerarNumeroOrdem = async () => {
    try {
      const anoAtual = new Date().getFullYear();
      
      const { data, error } = await supabase
        .from('recebimentos')
        .select('numero_ordem')
        .ilike('numero_ordem', `MH-${anoAtual}-%`)
        .order('id', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (!data || data.length === 0) {
        return `MH-${anoAtual}-001`;
      }

      const ultimoNumero = data[0].numero_ordem;
      const [prefix, ano, numero] = ultimoNumero.split('-');
      const proximoNumero = (parseInt(numero) + 1).toString().padStart(3, '0');
      
      return `${prefix}-${anoAtual}-${proximoNumero}`;
    } catch (error) {
      console.error('Erro ao gerar número da ordem:', error);
      return `MH-${new Date().getFullYear()}-001`;
    }
  };

  useEffect(() => {
    const carregarDados = async () => {
      setLoading(true);
      await Promise.all([carregarRecebimentos(), carregarNotasFiscais()]);
      setLoading(false);
    };

    carregarDados();
  }, []);

  return {
    recebimentos,
    notasFiscais,
    loading,
    criarRecebimento,
    atualizarRecebimento,
    criarNotaFiscal,
    uploadFoto,
    gerarNumeroOrdem,
    recarregar: () => Promise.all([carregarRecebimentos(), carregarNotasFiscais()])
  };
};