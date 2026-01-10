import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useEmpresaId } from '@/hooks/use-empresa-id';
export interface Recebimento {
  id: number;
  numero_ordem: string;
  cliente_id?: string;
  cliente_nome: string;
  cliente_cnpj?: string;
  data_entrada: string;
  nota_fiscal?: string;
  chave_acesso_nfe?: string;
  categoria_equipamento?: string;
  tipo_equipamento: string;
  numero_serie?: string;
  pressao_trabalho?: string;
  ambiente_trabalho?: string;
  temperatura_trabalho?: string;
  fluido_trabalho?: string;
  local_instalacao?: string;
  potencia?: string;
  observacoes?: string;
  camisa?: string;
  haste_comprimento?: string;
  curso?: string;
  conexao_a?: string;
  conexao_b?: string;
  urgente: boolean;
  na_empresa: boolean;
  status: string;
  data_analise?: string;
  pdf_nota_retorno?: string;
  pdf_nota_fiscal?: string;
  data_nota_retorno?: string;
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
  legenda?: string;
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
  recebimentos?: Recebimento[];
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
  const { empresaId } = useEmpresaId();

  const carregarRecebimentos = async () => {
    if (!empresaId) return;
    
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
        .eq('empresa_id', empresaId)
        .order('data_entrada', { ascending: false });

      if (error) throw error;

      // Buscar ordens de serviço para verificar quais recebimentos já têm análise
      const { data: ordensData } = await supabase
        .from('ordens_servico')
        .select('recebimento_id')
        .eq('empresa_id', empresaId);

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
    if (!empresaId) return;
    
    try {
      const { data, error } = await supabase
        .from('notas_fiscais')
        .select(`
          *,
          itens_nfe (*),
          recebimentos!nota_fiscal_id (*)
        `)
        .eq('empresa_id', empresaId)
        .order('data_emissao', { ascending: false });

      if (error) throw error;

      const notasFormatadas = data?.map(nota => ({
        ...nota,
        itens: nota.itens_nfe || [],
        recebimentos: nota.recebimentos || []
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
    // Validação: garantir que empresaId existe
    if (!empresaId) {
      toast({
        title: "Erro",
        description: "Empresa não identificada. Por favor, recarregue a página.",
        variant: "destructive",
      });
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('recebimentos')
        .insert([{ ...dadosRecebimento, empresa_id: empresaId }])
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
    // Validação: garantir que empresaId existe
    if (!empresaId) {
      toast({
        title: "Erro",
        description: "Empresa não identificada. Por favor, recarregue a página.",
        variant: "destructive",
      });
      return null;
    }

    try {
      // Normalizar chave de acesso (remover espaços)
      const chaveNormalizada = dadosNota.chave_acesso.replace(/\s/g, '');
      
      // Verificar se a nota já existe GLOBALMENTE (chave_acesso é unique no BD)
      const { data: notaExistente, error: checkError } = await supabase
        .from('notas_fiscais')
        .select('id, numero')
        .eq('chave_acesso', chaveNormalizada)
        .maybeSingle();
      
      console.log('Verificação de duplicata:', { chaveNormalizada, notaExistente, checkError });
      
      if (notaExistente) {
        toast({
          title: "Nota já cadastrada",
          description: `A nota fiscal ${notaExistente.numero} já foi cadastrada anteriormente.`,
          variant: "destructive",
        });
        return null;
      }

      const { data: notaData, error: notaError } = await supabase
        .from('notas_fiscais')
        .insert([{ ...dadosNota, chave_acesso: chaveNormalizada, empresa_id: empresaId }])
        .select()
        .single();

      if (notaError) throw notaError;

      if (itens.length > 0) {
        const itensComNotaId = itens.map(item => ({
          ...item,
          nota_fiscal_id: notaData.id,
          empresa_id: empresaId
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
      return null;
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
          apresentar_orcamento: apresentarOrcamento,
          empresa_id: empresaId
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

  const validarOrdemExistente = async (numeroOrdem: string): Promise<boolean> => {
    if (!numeroOrdem || numeroOrdem.trim() === '') {
      return false;
    }
    
    try {
      const { data, error } = await supabase
        .from('ordens_servico')
        .select('id')
        .eq('numero_ordem', numeroOrdem.trim())
        .maybeSingle();

      if (error) {
        console.error('Erro ao validar ordem:', error);
        return false;
      }

      return data !== null;
    } catch (error) {
      console.error('Erro ao validar ordem existente:', error);
      return false;
    }
  };

  const gerarNumeroOrdem = async () => {
    try {
      // Usar função RPC atômica para gerar número por empresa
      if (empresaId) {
        const { data, error } = await supabase.rpc('gerar_proximo_numero_ordem', {
          p_empresa_id: empresaId
        });
        
        if (!error && data) {
          return data;
        }
        console.warn('Erro na RPC, usando fallback:', error);
      }
      
      // Fallback: gerar localmente (para casos sem empresa ou erro na RPC)
      const anoAbreviado = new Date().getFullYear().toString().slice(-2);
      const timestamp = Date.now().toString().slice(-4);
      return `MH-${timestamp}-${anoAbreviado}`;
    } catch (error) {
      console.error('Erro ao gerar número da ordem:', error);
      const anoAbreviado = new Date().getFullYear().toString().slice(-2);
      const timestamp = Date.now().toString().slice(-4);
      return `MH-${timestamp}-${anoAbreviado}`;
    }
  };

  useEffect(() => {
    const carregarDados = async () => {
      if (!empresaId) return;
      
      setLoading(true);
      await Promise.all([carregarRecebimentos(), carregarNotasFiscais()]);
      setLoading(false);
    };

    carregarDados();
  }, [empresaId]);

  return {
    recebimentos,
    notasFiscais,
    loading,
    criarRecebimento,
    atualizarRecebimento,
    criarNotaFiscal,
    uploadFoto,
    gerarNumeroOrdem,
    validarOrdemExistente,
    recarregar: () => Promise.all([carregarRecebimentos(), carregarNotasFiscais()])
  };
};