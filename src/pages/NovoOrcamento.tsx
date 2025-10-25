import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Calculator, FileText, DollarSign, ArrowLeft, Wrench, Settings, Package, Plus, Trash2, Download, Save, Camera, Upload, X, Minus } from "lucide-react";
import { useState, useEffect } from "react";
import { useClientes } from "@/hooks/use-clientes";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FotoEquipamento } from "@/hooks/use-recebimentos";
import jsPDF from "jspdf";
import mecHidroLogo from "@/assets/mec-hidro-logo.jpg";
interface ItemOrcamento {
  id: string;
  tipo: 'peca' | 'servico' | 'usinagem';
  descricao: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  codigo?: string;
  detalhes?: {
    material?: string;
    medidas?: string;
  };
}
export default function NovoOrcamento() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const analiseId = searchParams.get('analiseId');
  const ordemServicoId = searchParams.get('ordemServicoId');
  const orcamentoParaEdicao = location.state?.orcamento;
  const {
    clientes
  } = useClientes();
  
  const [dadosOrcamento, setDadosOrcamento] = useState({
    id: '', // Add id for editing
    tipoOrdem: '',
    numeroOrdem: '', // Will be generated automatically
    urgencia: false,
    cliente: '',
    clienteId: '', // Store client ID separately
    tag: '',
    solicitante: '',
    dataAbertura: new Date().toISOString().split('T')[0],
    numeroNota: '',
    numeroSerie: '',
    observacoes: '',
    status: 'pendente'
  });

  // Estados para informações comerciais
  const [informacoesComerciais, setInformacoesComerciais] = useState({
    valorTotal: 0,
    desconto: 0,
    valorComDesconto: 0,
    condicaoPagamento: '',
    prazoMeses: '12',
    prazoEntrega: '',
    pedidoCompraMisto: '',
    pedidoCompraProduto: '',
    pedidoCompraServico: '',
    assuntoProposta: '',
    frete: 'CIF',
    freteIncluso: false,
    mostrarPecas: false,
    mostrarValores: true
  });
  const [itensAnalise, setItensAnalise] = useState<{
    pecas: ItemOrcamento[];
    servicos: ItemOrcamento[];
    usinagem: ItemOrcamento[];
  }>({
    pecas: [],
    servicos: [],
    usinagem: []
  });
  const [analiseData, setAnaliseData] = useState<any>(null);
  const [fotos, setFotos] = useState<Array<FotoEquipamento & { apresentar_orcamento?: boolean }>>([]);
  const [uploadingFoto, setUploadingFoto] = useState(false);

  // Função para gerar próximo número de orçamento
  const gerarProximoNumero = async () => {
    try {
      const anoAtual = new Date().getFullYear().toString().slice(-2);
      
      // Buscar o último orçamento do ano atual
      const { data, error } = await supabase
        .from('orcamentos')
        .select('numero')
        .ilike('numero', `%/${anoAtual}`)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Erro ao buscar último orçamento:', error);
        return `0001/${anoAtual}`;
      }

      if (data && data.length > 0) {
        // Extrair o número sequencial do último orçamento
        const ultimoNumero = data[0].numero;
        const partes = ultimoNumero.split('/');
        if (partes.length === 2 && partes[1] === anoAtual) {
          const sequencial = parseInt(partes[0]) + 1;
          return `${sequencial.toString().padStart(4, '0')}/${anoAtual}`;
        }
      }

      // Se não encontrou nenhum orçamento do ano atual, começar com 0001
      return `0001/${anoAtual}`;
    } catch (error) {
      console.error('Erro ao gerar próximo número:', error);
      const anoAtual = new Date().getFullYear().toString().slice(-2);
      return `0001/${anoAtual}`;
    }
  };

  useEffect(() => {
    const carregarDados = async () => {
      // Se é edição, carregar dados do orçamento
      if (orcamentoParaEdicao) {
        console.log('Carregando orçamento para edição:', orcamentoParaEdicao);
        
        // Buscar cliente para preencher clienteId
        const clienteEncontrado = clientes.find(c => c.nome === orcamentoParaEdicao.cliente_nome);
        
        setDadosOrcamento({
          id: orcamentoParaEdicao.id,
          tipoOrdem: orcamentoParaEdicao.observacoes?.split('|')[0]?.replace('Tipo:', '')?.trim() || 'reforma',
          numeroOrdem: orcamentoParaEdicao.numero,
          urgencia: false,
          cliente: orcamentoParaEdicao.cliente_nome,
          clienteId: clienteEncontrado?.id || '',
          tag: orcamentoParaEdicao.equipamento,
          solicitante: orcamentoParaEdicao.observacoes?.split('|')[1]?.replace('Solicitante:', '')?.trim() || '',
          dataAbertura: new Date(orcamentoParaEdicao.data_criacao).toISOString().split('T')[0],
          numeroNota: orcamentoParaEdicao.observacoes?.split('|')[2]?.replace('Nota:', '')?.trim() || '',
          numeroSerie: orcamentoParaEdicao.observacoes?.split('|')[3]?.replace('Ordem Ref:', '')?.trim() || orcamentoParaEdicao.observacoes?.split('|')[3]?.replace('Série:', '')?.trim() || '',
          observacoes: orcamentoParaEdicao.descricao || '',
          status: orcamentoParaEdicao.status
        });

        // Carregar informações comerciais
        setInformacoesComerciais(prev => ({
          ...prev,
          condicaoPagamento: orcamentoParaEdicao.condicao_pagamento || '',
          prazoEntrega: orcamentoParaEdicao.prazo_entrega || '',
          assuntoProposta: orcamentoParaEdicao.assunto_proposta || '',
          frete: orcamentoParaEdicao.frete || 'CIF'
        }));

        // Carregar itens do orçamento
        const { data: itensData, error: itensError } = await supabase
          .from('itens_orcamento')
          .select('*')
          .eq('orcamento_id', orcamentoParaEdicao.id);

        if (!itensError && itensData) {
          const pecas = itensData.filter(i => i.tipo === 'peca').map(i => ({
            id: `peca-${i.id}`,
            tipo: 'peca' as const,
            descricao: i.descricao,
            quantidade: Number(i.quantidade),
            valorUnitario: Number(i.valor_unitario),
            valorTotal: Number(i.valor_total),
            detalhes: i.detalhes as { material?: string; medidas?: string } | undefined
          }));

          const servicos = itensData.filter(i => i.tipo === 'servico').map(i => ({
            id: `servico-${i.id}`,
            tipo: 'servico' as const,
            descricao: i.descricao,
            quantidade: Number(i.quantidade),
            valorUnitario: Number(i.valor_unitario),
            valorTotal: Number(i.valor_total),
            detalhes: i.detalhes as { material?: string; medidas?: string } | undefined
          }));

          const usinagem = itensData.filter(i => i.tipo === 'usinagem').map(i => ({
            id: `usinagem-${i.id}`,
            tipo: 'usinagem' as const,
            descricao: i.descricao,
            quantidade: Number(i.quantidade),
            valorUnitario: Number(i.valor_unitario),
            valorTotal: Number(i.valor_total),
            detalhes: i.detalhes as { material?: string; medidas?: string } | undefined
          }));

          setItensAnalise({ pecas, servicos, usinagem });
        }

        // Carregar fotos do orçamento (se não tem ordem de serviço associada) ou de ordem de serviço
        if (orcamentoParaEdicao.ordem_servico_id) {
          // Buscar fotos de equipamentos através da ordem de serviço
          const { data: osData } = await supabase
            .from('ordens_servico')
            .select('recebimento_id')
            .eq('id', orcamentoParaEdicao.ordem_servico_id)
            .single();

          if (osData?.recebimento_id) {
            const { data: fotosData } = await supabase
              .from('fotos_equipamentos')
              .select('*')
              .eq('recebimento_id', osData.recebimento_id);

            if (fotosData) {
              setFotos(fotosData.map(f => ({
                id: f.id,
                arquivo_url: f.arquivo_url,
                nome_arquivo: f.nome_arquivo,
                apresentar_orcamento: f.apresentar_orcamento || false,
                recebimento_id: f.recebimento_id
              })));
            }
          }
        } else {
          // Buscar fotos do próprio orçamento
          const { data: fotosData } = await supabase
            .from('fotos_orcamento')
            .select('*')
            .eq('orcamento_id', orcamentoParaEdicao.id);

          if (fotosData) {
            setFotos(fotosData.map(f => ({
              id: f.id,
              arquivo_url: f.arquivo_url,
              nome_arquivo: f.nome_arquivo,
              apresentar_orcamento: f.apresentar_orcamento || false,
              recebimento_id: null
            })));
          }
        }

        return; // Skip other loading logic for editing
      }

      // Gerar número do orçamento apenas se for novo
      const proximoNumero = await gerarProximoNumero();
      setDadosOrcamento(prev => ({
        ...prev,
        numeroOrdem: proximoNumero
      }));

      if (ordemServicoId) {
        try {
          // Buscar dados da ordem de serviço no Supabase
          const { data: ordemServico, error } = await supabase
            .from('ordens_servico')
            .select(`
              *,
              recebimentos!ordens_servico_recebimento_id_fkey (
                numero_ordem,
                nota_fiscal,
                numero_serie,
                cliente_nome,
                cliente_cnpj,
                cliente_id,
                fotos_equipamentos (
                  id,
                  arquivo_url,
                  nome_arquivo,
                  apresentar_orcamento
                )
              )
            `)
            .eq('id', ordemServicoId)
            .maybeSingle();

          if (error) {
            console.error('Erro ao buscar ordem de serviço:', error);
            toast({
              title: "Erro",
              description: "Erro ao carregar dados da ordem de serviço",
              variant: "destructive"
            });
            return;
          }

          if (ordemServico) {
            // Preencher dados do orçamento com dados da ordem de serviço
            setDadosOrcamento(prev => ({
              ...prev,
              tipoOrdem: 'reforma', // Pode ajustar baseado no tipo_problema se necessário
              cliente: ordemServico.recebimentos?.cliente_nome || ordemServico.cliente_nome || '',
              clienteId: ordemServico.recebimentos?.cliente_id || '',
              solicitante: '',
              numeroNota: ordemServico.recebimentos?.nota_fiscal || '',
              numeroSerie: ordemServico.numero_ordem || '',
              dataAbertura: new Date().toISOString().split('T')[0],
              observacoes: ordemServico.observacoes_tecnicas || '',
              tag: ordemServico.equipamento || ''
            }));

            // Carregar peças necessárias se existirem
            const pecasOS: ItemOrcamento[] = [];
            if (ordemServico.pecas_necessarias && Array.isArray(ordemServico.pecas_necessarias)) {
              ordemServico.pecas_necessarias.forEach((peca: any, index: number) => {
                pecasOS.push({
                  id: `peca-os-${index}`,
                  tipo: 'peca' as const,
                  descricao: peca.peca || peca.descricao || peca.nome || '',
                  quantidade: peca.quantidade || 1,
                  valorUnitario: 0,
                  valorTotal: 0,
                  detalhes: {
                    material: peca.material || '',
                    medidas: `${peca.medida1 || ''} x ${peca.medida2 || ''} x ${peca.medida3 || ''}`.replace(/ x  x /g, '').replace(/ x $/g, '')
                  }
                });
              });
            }

            // Carregar serviços necessários se existirem
            const servicosOS: ItemOrcamento[] = [];
            if (ordemServico.servicos_necessarios && Array.isArray(ordemServico.servicos_necessarios)) {
              ordemServico.servicos_necessarios.forEach((servico: any, index: number) => {
                servicosOS.push({
                  id: `servico-os-${index}`,
                  tipo: 'servico' as const,
                  descricao: servico.descricao || servico.servico || servico.nome || '',
                  quantidade: servico.quantidade || 1,
                  valorUnitario: 0,
                  valorTotal: 0
                });
              });
            }

            // Carregar usinagem necessária se existir
            const usinagemOS: ItemOrcamento[] = [];
            if (ordemServico.usinagem_necessaria && Array.isArray(ordemServico.usinagem_necessaria)) {
              ordemServico.usinagem_necessaria.forEach((usinagem: any, index: number) => {
                usinagemOS.push({
                  id: `usinagem-os-${index}`,
                  tipo: 'usinagem' as const,
                  descricao: usinagem.descricao || usinagem.trabalho || usinagem.nome || '',
                  quantidade: usinagem.quantidade || 1,
                  valorUnitario: 0,
                  valorTotal: 0
                });
              });
            }

            console.log('Peças carregadas:', pecasOS);
            console.log('Serviços carregados:', servicosOS);
            console.log('Usinagem carregada:', usinagemOS);

            setItensAnalise({
              pecas: pecasOS,
              servicos: servicosOS,
              usinagem: usinagemOS
            });

            // Inicializar assunto da proposta baseado na ordem de serviço
            setInformacoesComerciais(prev => ({
              ...prev,
              assuntoProposta: `${ordemServico.tipo_problema?.toUpperCase() || 'SERVIÇO'} ${ordemServico.equipamento?.toUpperCase() || ''}`.substring(0, 100)
            }));

            // Carregar fotos do equipamento
            if (ordemServico.recebimentos?.fotos_equipamentos) {
              setFotos(ordemServico.recebimentos.fotos_equipamentos);
            }
          }
        } catch (error) {
          console.error('Erro ao carregar ordem de serviço:', error);
          toast({
            title: "Erro",
            description: "Erro ao carregar dados da ordem de serviço",
            variant: "destructive"
          });
        }
      } else if (analiseId) {
        const analises = JSON.parse(localStorage.getItem('analises') || '[]');
        const analise = analises.find((a: any) => a.id === analiseId);
        if (analise) {
          setAnaliseData(analise);

          // Buscar dados do recebimento original através do recebimentoId
          let dadosRecebimento = null;
          if (analise.recebimentoId) {
            const recebimentos = JSON.parse(localStorage.getItem('recebimentos') || '[]');
            dadosRecebimento = recebimentos.find((r: any) => r.id === analise.recebimentoId || r.numeroOrdem === analise.recebimentoId);
          }

          // Determinar tipo de ordem baseado no problema da análise
          let tipoOrdem = '';
          if (analise.problemas) {
            const problemas = analise.problemas.toLowerCase();
            if (problemas.includes('vazamento') || problemas.includes('danificado') || problemas.includes('quebrado')) {
              tipoOrdem = 'reparo';
            } else if (problemas.includes('reforma') || problemas.includes('recondicionamento')) {
              tipoOrdem = 'reforma';
            } else if (problemas.includes('manutenção') || problemas.includes('preventiva')) {
              tipoOrdem = 'manutencao';
            } else {
              tipoOrdem = 'reforma'; // Default para reforma se não conseguir identificar
            }
          }
          setDadosOrcamento(prev => ({
            ...prev,
            tipoOrdem: tipoOrdem,
            tag: analise.equipamento || dadosRecebimento?.tag || '',
            cliente: analise.cliente || dadosRecebimento?.cliente || '',
            solicitante: dadosRecebimento?.solicitante || '',
            numeroNota: dadosRecebimento?.notaFiscal || dadosRecebimento?.numeroNota || '',
            numeroSerie: dadosRecebimento?.numeroSerie || '',
            dataAbertura: new Date().toISOString().split('T')[0],
            observacoes: analise.observacoes || '',
            urgencia: dadosRecebimento?.urgencia || false
          }));

          // Carregar peças da análise
          const pecasAnalise: ItemOrcamento[] = (analise.pecasUtilizadas || []).map((peca: any, index: number) => ({
            id: `peca-${index}`,
            tipo: 'peca' as const,
            descricao: peca.peca || '',
            quantidade: peca.quantidade || 1,
            valorUnitario: 0,
            valorTotal: 0,
            detalhes: {
              material: peca.material,
              medidas: `${peca.medida1 || ''} x ${peca.medida2 || ''} x ${peca.medida3 || ''}`.replace(/ x  x /g, '').replace(/ x $/g, '')
            }
          }));

          // Carregar serviços da análise
          const servicosAnalise: ItemOrcamento[] = [];
          if (analise.servicosPreDeterminados) {
            Object.entries(analise.servicosPreDeterminados).forEach(([key, value]: [string, any]) => {
              if (value) {
                const quantidade = analise.servicosQuantidades?.[key] || 1;
                const nome = analise.servicosNomes?.[key] || key;
                servicosAnalise.push({
                  id: `servico-${key}`,
                  tipo: 'servico' as const,
                  descricao: nome,
                  quantidade,
                  valorUnitario: 0,
                  valorTotal: 0
                });
              }
            });
          }
          if (analise.servicosPersonalizados) {
            servicosAnalise.push({
              id: 'servico-personalizado',
              tipo: 'servico' as const,
              descricao: analise.servicosPersonalizados,
              quantidade: analise.servicosQuantidades?.personalizado || 1,
              valorUnitario: 0,
              valorTotal: 0
            });
          }

          // Carregar usinagem da análise
          const usinagemAnalise: ItemOrcamento[] = [];
          if (analise.usinagem) {
            Object.entries(analise.usinagem).forEach(([key, value]: [string, any]) => {
              if (value) {
                const quantidade = analise.usinagemQuantidades?.[key] || 1;
                const nome = analise.usinagemNomes?.[key] || key;
                usinagemAnalise.push({
                  id: `usinagem-${key}`,
                  tipo: 'usinagem' as const,
                  descricao: nome,
                  quantidade,
                  valorUnitario: 0,
                  valorTotal: 0
                });
              }
            });
          }
          if (analise.usinagemPersonalizada) {
            usinagemAnalise.push({
              id: 'usinagem-personalizada',
              tipo: 'usinagem' as const,
              descricao: analise.usinagemPersonalizada,
              quantidade: analise.usinagemQuantidades?.personalizada || 1,
              valorUnitario: 0,
              valorTotal: 0
            });
          }
          setItensAnalise({
            pecas: pecasAnalise,
            servicos: servicosAnalise,
            usinagem: usinagemAnalise
          });

          // Inicializar assunto da proposta baseado na análise
          if (analise.problemas) {
            setInformacoesComerciais(prev => ({
              ...prev,
              assuntoProposta: `REFORMA ${analise.equipamento?.toUpperCase() || ''}`.substring(0, 100)
            }));
          }
        }
      } else {
        setDadosOrcamento(prev => ({
          ...prev,
          dataAbertura: new Date().toISOString().split('T')[0]
        }));
      }
    };

    carregarDados();
  }, [analiseId, ordemServicoId, orcamentoParaEdicao]);

  const handleUploadFoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploadingFoto(true);
    try {
      for (const arquivo of Array.from(files)) {
        // Validação do arquivo
        if (!arquivo.type.startsWith('image/')) {
          toast({
            title: "Erro",
            description: `O arquivo ${arquivo.name} não é uma imagem válida`,
            variant: "destructive"
          });
          continue;
        }

        if (arquivo.size > 10 * 1024 * 1024) {
          toast({
            title: "Erro",
            description: `O arquivo ${arquivo.name} excede o tamanho máximo de 10MB`,
            variant: "destructive"
          });
          continue;
        }

        // Sanitiza o nome do arquivo
        const nomeArquivoLimpo = arquivo.name
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-zA-Z0-9.-]/g, '_')
          .replace(/_{2,}/g, '_');
        
        const nomeArquivo = `orcamentos/${Date.now()}_${nomeArquivoLimpo}`;
        
        // Upload do arquivo
        const { error: uploadError } = await supabase.storage
          .from('equipamentos')
          .upload(nomeArquivo, arquivo);

        if (uploadError) throw uploadError;

        // Obter URL pública
        const { data: urlData } = supabase.storage
          .from('equipamentos')
          .getPublicUrl(nomeArquivo);

        // Adicionar à lista de fotos
        const novaFoto = {
          id: `temp-${Date.now()}-${Math.random()}`,
          arquivo_url: urlData.publicUrl,
          nome_arquivo: arquivo.name,
          apresentar_orcamento: true,
          recebimento_id: null
        };

        setFotos(prev => [...prev, novaFoto]);
      }

      toast({
        title: "Sucesso",
        description: "Fotos enviadas com sucesso"
      });
    } catch (error) {
      console.error('Erro ao fazer upload da foto:', error);
      toast({
        title: "Erro",
        description: "Erro ao enviar fotos",
        variant: "destructive"
      });
    } finally {
      setUploadingFoto(false);
      event.target.value = '';
    }
  };

  const removerFoto = (fotoId: string) => {
    setFotos(prev => prev.filter(f => f.id !== fotoId));
    toast({
      title: "Sucesso",
      description: "Foto removida"
    });
  };

  const toggleApresentarOrcamento = (fotoId: string) => {
    setFotos(prev => prev.map(foto => 
      foto.id === fotoId 
        ? { ...foto, apresentar_orcamento: !foto.apresentar_orcamento }
        : foto
    ));
  };
  const atualizarValorItem = (categoria: 'pecas' | 'servicos' | 'usinagem', id: string, valorUnitario: number) => {
    setItensAnalise(prev => {
      const novoItens = {
        ...prev
      };
      const item = novoItens[categoria].find(item => item.id === id);
      if (item) {
        item.valorUnitario = valorUnitario;
        item.valorTotal = item.quantidade * valorUnitario;
      }
      return novoItens;
    });
  };
  const atualizarQuantidadeItem = (categoria: 'pecas' | 'servicos' | 'usinagem', id: string, quantidade: number) => {
    setItensAnalise(prev => {
      const novoItens = {
        ...prev
      };
      const item = novoItens[categoria].find(item => item.id === id);
      if (item) {
        item.quantidade = quantidade;
        item.valorTotal = item.quantidade * item.valorUnitario;
      }
      return novoItens;
    });
  };
  const atualizarDescricaoItem = (categoria: 'pecas' | 'servicos' | 'usinagem', id: string, descricao: string) => {
    setItensAnalise(prev => {
      const novoItens = {
        ...prev
      };
      const item = novoItens[categoria].find(item => item.id === id);
      if (item) {
        item.descricao = descricao;
      }
      return novoItens;
    });
  };
  const adicionarItemAdicional = (categoria: 'pecas' | 'servicos' | 'usinagem') => {
    const novoId = `${categoria}-adicional-${Date.now()}`;
    const tipoMap = {
      'pecas': 'peca',
      'servicos': 'servico',
      'usinagem': 'usinagem'
    } as const;
    const tipo = tipoMap[categoria];
    const novoItem: ItemOrcamento = {
      id: novoId,
      tipo: tipo,
      descricao: '',
      quantidade: 1,
      valorUnitario: 0,
      valorTotal: 0,
      detalhes: tipo === 'peca' ? {
        material: '',
        medidas: ''
      } : undefined
    };
    setItensAnalise(prev => ({
      ...prev,
      [categoria]: [...prev[categoria], novoItem]
    }));
  };
  const removerItem = (categoria: 'pecas' | 'servicos' | 'usinagem', id: string) => {
    setItensAnalise(prev => ({
      ...prev,
      [categoria]: prev[categoria].filter(item => item.id !== id)
    }));
  };
  const calcularTotalGeral = () => {
    const totalPecas = itensAnalise.pecas.reduce((total, item) => total + item.valorTotal, 0);
    const totalServicos = itensAnalise.servicos.reduce((total, item) => total + item.valorTotal, 0);
    const totalUsinagem = itensAnalise.usinagem.reduce((total, item) => total + item.valorTotal, 0);
    return totalPecas + totalServicos + totalUsinagem;
  };
  const calcularValorComDesconto = () => {
    const total = calcularTotalGeral();
    const desconto = total * informacoesComerciais.desconto / 100;
    return total - desconto;
  };

  // Atualizar apenas o valor com desconto (não sobrescreve valorTotal editado manualmente)
  useEffect(() => {
    const valorComDesconto = calcularValorComDesconto();
    setInformacoesComerciais(prev => ({
      ...prev,
      valorComDesconto
    }));
  }, [itensAnalise, informacoesComerciais.desconto, informacoesComerciais.valorTotal]);
  const salvarOrcamento = async () => {
    const totalItens = itensAnalise.pecas.length + itensAnalise.servicos.length + itensAnalise.usinagem.length;
    if (!dadosOrcamento.tipoOrdem || !dadosOrcamento.cliente || totalItens === 0) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios e adicione pelo menos um item",
        variant: "destructive"
      });
      return;
    }

    // Usar o valor total editado manualmente pelo usuário
    const valorFinal = informacoesComerciais.valorTotal;
    
    try {
      // Criar dados para inserir no Supabase
      const orcamentoData = {
        numero: dadosOrcamento.numeroOrdem,
        cliente_nome: dadosOrcamento.cliente,
        equipamento: dadosOrcamento.tag || 'Equipamento não especificado',
        descricao: dadosOrcamento.observacoes || '',
        valor: valorFinal,
        status: 'pendente',
        observacoes: `Tipo: ${dadosOrcamento.tipoOrdem} | Solicitante: ${dadosOrcamento.solicitante} | Nota: ${dadosOrcamento.numeroNota} | Ordem Ref: ${dadosOrcamento.numeroSerie}`,
        ordem_servico_id: ordemServicoId || null,
        condicao_pagamento: informacoesComerciais.condicaoPagamento || null,
        prazo_entrega: informacoesComerciais.prazoEntrega || null,
        assunto_proposta: informacoesComerciais.assuntoProposta || null,
        frete: informacoesComerciais.frete || 'CIF'
      };

      let response;
      if (dadosOrcamento.id) {
        // Atualizar orçamento existente
        response = await supabase
          .from('orcamentos')
          .update(orcamentoData)
          .eq('id', dadosOrcamento.id)
          .select()
          .single();
      } else {
        // Criar novo orçamento
        response = await supabase
          .from('orcamentos')
          .insert(orcamentoData)
          .select()
          .single();
      }

      const { data, error } = response;

      if (error) {
        console.error('Erro ao salvar orçamento no Supabase:', error);
        toast({
          title: "Erro",
          description: "Erro ao salvar orçamento no banco de dados",
          variant: "destructive"
        });
        return;
      }

      const orcamentoId = data.id;
      console.log('Orçamento salvo no Supabase:', data);

      // Deletar itens existentes se for atualização
      if (dadosOrcamento.id) {
        await supabase
          .from('itens_orcamento')
          .delete()
          .eq('orcamento_id', orcamentoId);
      }

      // Salvar itens do orçamento
      const todosItens = [
        ...itensAnalise.pecas.map(item => ({ ...item, tipo: 'peca' })),
        ...itensAnalise.servicos.map(item => ({ ...item, tipo: 'servico' })),
        ...itensAnalise.usinagem.map(item => ({ ...item, tipo: 'usinagem' }))
      ];

      const itensParaInserir = todosItens.map(item => ({
        orcamento_id: orcamentoId,
        tipo: item.tipo,
        descricao: item.descricao,
        quantidade: item.quantidade,
        valor_unitario: item.valorUnitario,
        valor_total: item.valorTotal,
        detalhes: item.detalhes || null
      }));

      if (itensParaInserir.length > 0) {
        const { error: itensError } = await supabase
          .from('itens_orcamento')
          .insert(itensParaInserir);

        if (itensError) {
          console.error('Erro ao salvar itens do orçamento:', itensError);
          toast({
            title: "Aviso",
            description: "Orçamento salvo, mas houve erro ao salvar alguns itens",
            variant: "destructive"
          });
        }
      }

      // Salvar fotos apenas se for orçamento em branco (sem ordem de serviço)
      if (!ordemServicoId) {
        // Deletar fotos existentes se for atualização
        if (dadosOrcamento.id) {
          await supabase
            .from('fotos_orcamento')
            .delete()
            .eq('orcamento_id', orcamentoId);
        }

        // Inserir fotos do orçamento
        const fotosParaInserir = fotos.map(foto => ({
          orcamento_id: orcamentoId,
          arquivo_url: foto.arquivo_url,
          nome_arquivo: foto.nome_arquivo,
          apresentar_orcamento: foto.apresentar_orcamento || false
        }));

        if (fotosParaInserir.length > 0) {
          const { error: fotosError } = await supabase
            .from('fotos_orcamento')
            .insert(fotosParaInserir);

          if (fotosError) {
            console.error('Erro ao salvar fotos do orçamento:', fotosError);
            toast({
              title: "Aviso",
              description: "Orçamento salvo, mas houve erro ao salvar algumas fotos",
              variant: "destructive"
            });
          }
        }
      }
      
      toast({
        title: "Sucesso",
        description: `Orçamento ${dadosOrcamento.numeroOrdem} ${dadosOrcamento.id ? 'atualizado' : 'criado'} com sucesso!`
      });
      navigate("/orcamentos");
    } catch (error) {
      console.error('Erro ao salvar orçamento:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao salvar orçamento",
        variant: "destructive"
      });
    }
  };
  const exportarPDF = async () => {
    const EMPRESA_INFO = {
      nome: "MEC-HIDRO MECANICA E HIDRAULICA LTDA",
      cnpj: "03.328.334/0001-87",
      telefone: "(19) 3026-6227",
      email: "contato@mechidro.com.br"
    };

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    let yPosition = 10;

    // Definir posições das colunas da tabela
    const colCodigo = 20;
    const colDescricao = 47;
    const colQtd = 120;
    const colValorUnit = 135;
    const colTotal = 165;

    // Função para adicionar detalhes decorativos (triângulos vermelhos e pretos)
    const adicionarDetalheDecorativo = () => {
      doc.setFillColor(220, 38, 38);
      doc.triangle(pageWidth - 30, pageHeight - 30, pageWidth, pageHeight - 30, pageWidth, pageHeight, 'F');
      doc.setFillColor(0, 0, 0);
      doc.triangle(pageWidth - 15, pageHeight - 30, pageWidth, pageHeight - 30, pageWidth, pageHeight, 'F');
    };

    // Função para adicionar rodapé
    const adicionarRodape = () => {
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        adicionarDetalheDecorativo();
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(`Página ${i} de ${totalPages}`, 15, pageHeight - 10);
        doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, pageWidth - 60, pageHeight - 10);
      }
    };

    // Função para criar tabelas formatadas
    const criarTabela = (titulo: string, dados: Array<{label: string, value: string}>, corTitulo: number[] = [128, 128, 128]) => {
      if (dados.length === 0) return;
      
      if (yPosition > 210) {
        doc.addPage();
        yPosition = 20;
      }
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(255, 255, 255);
      doc.setFillColor(corTitulo[0], corTitulo[1], corTitulo[2]);
      doc.rect(20, yPosition, pageWidth - 40, 10, 'F');
      doc.text(titulo.toUpperCase(), pageWidth / 2, yPosition + 7, { align: 'center' });
      yPosition += 10;
      
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setLineWidth(0.1);
      
      const rowHeight = 10;
      dados.forEach((item, index) => {
        if (index % 2 === 0) {
          doc.setFillColor(245, 245, 245);
        } else {
          doc.setFillColor(255, 255, 255);
        }
        doc.rect(20, yPosition, pageWidth - 40, rowHeight, 'F');
        doc.setDrawColor(200, 200, 200);
        doc.rect(20, yPosition, pageWidth - 40, rowHeight);
        
        doc.setFont('helvetica', 'bold');
        doc.text(item.label, 25, yPosition + 7);
        doc.setFont('helvetica', 'normal');
        const valorLines = doc.splitTextToSize(item.value, pageWidth - 110);
        
        if (valorLines.length > 1) {
          const extraHeight = (valorLines.length - 1) * 5;
          doc.setFillColor(index % 2 === 0 ? 245 : 255, index % 2 === 0 ? 245 : 255, index % 2 === 0 ? 245 : 255);
          doc.rect(20, yPosition, pageWidth - 40, rowHeight + extraHeight, 'F');
          doc.setDrawColor(200, 200, 200);
          doc.rect(20, yPosition, pageWidth - 40, rowHeight + extraHeight);
          
          doc.setFont('helvetica', 'bold');
          doc.text(item.label, 25, yPosition + 7);
          doc.setFont('helvetica', 'normal');
          doc.text(valorLines, 95, yPosition + 7);
          yPosition += rowHeight + extraHeight;
        } else {
          doc.text(item.value, 95, yPosition + 7);
          yPosition += rowHeight;
        }
      });
      
      yPosition += 10;
    };

    // Adicionar logo MEC-HIDRO
    try {
      const logoImg = new Image();
      logoImg.src = mecHidroLogo;
      await new Promise<void>((resolve) => {
        logoImg.onload = () => {
          doc.addImage(logoImg, 'JPEG', pageWidth - 50, 8, 35, 20);
          resolve();
        };
        logoImg.onerror = () => resolve();
      });
    } catch (error) {
      console.error('Erro ao adicionar logo:', error);
    }

    // Cabeçalho com informações da empresa
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(EMPRESA_INFO.nome, 20, yPosition + 5);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`CNPJ: ${EMPRESA_INFO.cnpj}`, 20, yPosition + 12);
    doc.text(`Tel: ${EMPRESA_INFO.telefone}`, 20, yPosition + 17);
    doc.text(`Email: ${EMPRESA_INFO.email}`, 20, yPosition + 22);
    
    // Linha separadora vermelha
    doc.setDrawColor(220, 38, 38);
    doc.setLineWidth(1);
    doc.line(20, yPosition + 28, pageWidth - 20, yPosition + 28);
    
    // Triângulo decorativo vermelho no canto superior direito
    doc.setFillColor(220, 38, 38);
    doc.triangle(pageWidth - 20, 10, pageWidth, 10, pageWidth, 40, 'F');
    
    yPosition = 48;
    
    // Título "PROPOSTA COMERCIAL" em vermelho
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(220, 38, 38);
    doc.text("PROPOSTA COMERCIAL", pageWidth / 2, yPosition, { align: "center" });
    doc.setTextColor(0, 0, 0);
    
    yPosition = 65;

    // Buscar dados do cliente
    let cnpjCliente = '';
    if (dadosOrcamento.clienteId) {
      const { data: clienteData } = await supabase
        .from('clientes')
        .select('cnpj_cpf')
        .eq('id', dadosOrcamento.clienteId)
        .maybeSingle();
      
      if (clienteData) {
        cnpjCliente = clienteData.cnpj_cpf || '';
      }
    }

    // === INFORMAÇÕES DO CLIENTE ===
    // Verificar se precisa de nova página
    if (yPosition + 30 > pageHeight - 30) {
      adicionarRodape();
      doc.addPage();
      yPosition = 20;
    }
    
    // Título centralizado "Informações do Cliente"
    doc.setFillColor(220, 220, 220);
    doc.rect(20, yPosition, pageWidth - 40, 10, 'F');
    doc.setDrawColor(200, 200, 200);
    doc.rect(20, yPosition, pageWidth - 40, 10);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Informações do Cliente", pageWidth / 2, yPosition + 7, { align: "center" });
    yPosition += 10;
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    
    // Primeira linha: Nº Orçamento + Data
    const colWidth = (pageWidth - 40) / 2;
    
    doc.setDrawColor(200, 200, 200);
    doc.rect(20, yPosition, colWidth, 8);
    doc.rect(20 + colWidth, yPosition, colWidth, 8);
    doc.text(`Nº Orçamento: ${dadosOrcamento.numeroOrdem || 'N/A'}`, 22, yPosition + 5.5);
    doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 22 + colWidth, yPosition + 5.5);
    yPosition += 8;
    
    // Segunda linha: Nome do Cliente (linha inteira)
    doc.rect(20, yPosition, pageWidth - 40, 8);
    doc.text(`Nome do Cliente: ${dadosOrcamento.cliente || 'N/A'}`, 22, yPosition + 5.5);
    yPosition += 8;
    
    // Terceira linha: CNPJ (linha inteira)
    doc.rect(20, yPosition, pageWidth - 40, 8);
    doc.text(`CNPJ: ${cnpjCliente || 'N/A'}`, 22, yPosition + 5.5);
    yPosition += 8;
    
    yPosition += 10;

    // === CONDIÇÕES COMERCIAIS ===
    const valorComDesconto = calcularValorComDesconto();
    const valorTotal = calcularTotalGeral();
    const dataValidade = new Date();
    dataValidade.setDate(dataValidade.getDate() + 30);
    
    // Verificar se precisa de nova página
    if (yPosition + 40 > pageHeight - 30) {
      adicionarRodape();
      doc.addPage();
      yPosition = 20;
    }
    
    // Título centralizado "Condições Comerciais"
    doc.setFillColor(220, 220, 220);
    doc.rect(20, yPosition, pageWidth - 40, 10, 'F');
    doc.setDrawColor(200, 200, 200);
    doc.rect(20, yPosition, pageWidth - 40, 10);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Condições Comerciais", pageWidth / 2, yPosition + 7, { align: "center" });
    yPosition += 10;
    
    const valorTotalFormatado = `R$ ${valorComDesconto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
    const condicaoPagamento = informacoesComerciais.condicaoPagamento || 'A combinar';
    const dataGeracao = new Date().toLocaleDateString('pt-BR');
    const validadeProposta = `${informacoesComerciais.prazoMeses} meses`;
    
    const assunto = informacoesComerciais.assuntoProposta || dadosOrcamento.tag || 'REFORMA/MANUTENÇÃO';
    const prazoEntrega = informacoesComerciais.prazoEntrega || '5 dias úteis';
    const garantia = '6 Meses';
    const frete = informacoesComerciais.frete || 'CIF';
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    
    // Primeira linha: Assunto (span full width)
    doc.setDrawColor(200, 200, 200);
    doc.rect(20, yPosition, pageWidth - 40, 8);
    doc.text(`Assunto: ${assunto}`, 22, yPosition + 5.5);
    yPosition += 8;
    
    // Segunda linha: Valor Total + Condição Pagamento + Prazo Entrega
    const col3Width = (pageWidth - 40) / 3;
    
    doc.rect(20, yPosition, col3Width, 8);
    doc.rect(20 + col3Width, yPosition, col3Width, 8);
    doc.rect(20 + col3Width * 2, yPosition, col3Width, 8);
    doc.text(`Valor Total: ${valorTotalFormatado}`, 22, yPosition + 5.5);
    doc.text(`Condição Pagamento: ${condicaoPagamento}`, 22 + col3Width, yPosition + 5.5);
    doc.text(`Prazo Entrega: ${prazoEntrega}`, 22 + col3Width * 2, yPosition + 5.5);
    yPosition += 8;
    
    // Terceira linha: Garantia + Frete + Validade Proposta
    doc.rect(20, yPosition, col3Width, 8);
    doc.rect(20 + col3Width, yPosition, col3Width, 8);
    doc.rect(20 + col3Width * 2, yPosition, col3Width, 8);
    doc.text(`Garantia: ${garantia}`, 22, yPosition + 5.5);
    doc.text(`Frete: ${frete}`, 22 + col3Width, yPosition + 5.5);
    doc.text(`Validade Proposta: ${validadeProposta}`, 22 + col3Width * 2, yPosition + 5.5);
    yPosition += 8;

    // Tabela: Peças Necessárias (com código)
    if (itensAnalise.pecas.length > 0 && informacoesComerciais.mostrarPecas !== false) {
      if (yPosition > 210) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(220, 38, 38);
      doc.text('PEÇAS NECESSÁRIAS', 20, yPosition);
      doc.setTextColor(0, 0, 0);
      yPosition += 10;

      // Cabeçalho da tabela
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setFillColor(220, 220, 220);
      doc.rect(20, yPosition, pageWidth - 40, 8, 'F');
      doc.setDrawColor(200, 200, 200);
      doc.rect(20, yPosition, pageWidth - 40, 8);

      doc.text('Código', colCodigo + 2, yPosition + 5.5);
      doc.text('Descrição', colDescricao, yPosition + 5.5);
      doc.text('Qtd', colQtd, yPosition + 5.5, { align: 'center' });
      if (informacoesComerciais.mostrarValores !== false) {
        doc.text('Valor Unit.', colValorUnit + 28, yPosition + 5.5, { align: 'right' });
        doc.text('Total', colTotal + 25, yPosition + 5.5, { align: 'right' });
      }
      yPosition += 8;

      // Linhas de dados
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      let totalPecas = 0;

      itensAnalise.pecas.forEach((item, index) => {
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 20;
        }

        const rowHeight = 8;
        if (index % 2 === 0) {
          doc.setFillColor(245, 245, 245);
        } else {
          doc.setFillColor(255, 255, 255);
        }
        doc.rect(20, yPosition, pageWidth - 40, rowHeight, 'F');
        doc.setDrawColor(200, 200, 200);
        doc.rect(20, yPosition, pageWidth - 40, rowHeight);

        doc.text(item.codigo || '-', colCodigo + 2, yPosition + 5.5);
        const desc = item.descricao.length > 40 ? item.descricao.substring(0, 37) + '...' : item.descricao;
        doc.text(desc, colDescricao, yPosition + 5.5);
        doc.text(item.quantidade.toString(), colQtd, yPosition + 5.5, { align: 'center' });
        
        if (informacoesComerciais.mostrarValores !== false) {
          const valorUnit = item.valorUnitario > 0 ? `R$ ${item.valorUnitario.toFixed(2).replace('.', ',')}` : '';
          doc.text(valorUnit, colValorUnit + 28, yPosition + 5.5, { align: 'right' });
          const valorTot = item.valorTotal > 0 ? `R$ ${item.valorTotal.toFixed(2).replace('.', ',')}` : '';
          doc.text(valorTot, colTotal + 25, yPosition + 5.5, { align: 'right' });
          totalPecas += item.valorTotal;
        }

        yPosition += rowHeight;
      });

      // Total das peças em box
      if (informacoesComerciais.mostrarValores !== false) {
        yPosition += 5;
        const boxWidth = 50;
        const boxHeight = 8;
        const boxX = pageWidth - 25 - boxWidth;
        
        doc.setDrawColor(200, 200, 200);
        doc.rect(boxX, yPosition, boxWidth, boxHeight);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('Total de Peças', boxX + 2, yPosition + 5.5);
        
        const valorBoxX = boxX + boxWidth;
        doc.rect(valorBoxX, yPosition, 25, boxHeight);
        const totalPecasTexto = totalPecas > 0 ? `R$ ${totalPecas.toFixed(2).replace('.', ',')}` : '';
        doc.text(totalPecasTexto, valorBoxX + 23, yPosition + 5.5, { align: 'right' });
      }
      
      yPosition += 15;
    }

    // Tabela: Serviços a Executar (com código)
    if (itensAnalise.servicos.length > 0) {
      if (yPosition > 210) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(220, 38, 38);
      doc.text('SERVIÇOS A EXECUTAR', 20, yPosition);
      doc.setTextColor(0, 0, 0);
      yPosition += 10;

      // Cabeçalho da tabela
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setFillColor(220, 220, 220);
      doc.rect(20, yPosition, pageWidth - 40, 8, 'F');
      doc.setDrawColor(200, 200, 200);
      doc.rect(20, yPosition, pageWidth - 40, 8);

      doc.text('Código', colCodigo + 2, yPosition + 5.5);
      doc.text('Descrição', colDescricao, yPosition + 5.5);
      doc.text('Qtd', colQtd, yPosition + 5.5, { align: 'center' });
      if (informacoesComerciais.mostrarValores !== false) {
        doc.text('Valor Unit.', colValorUnit + 25, yPosition + 5.5, { align: 'right' });
        doc.text('Total', colTotal + 25, yPosition + 5.5, { align: 'right' });
      }
      yPosition += 8;

      // Linhas de dados
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      let totalServicos = 0;

      itensAnalise.servicos.forEach((item, index) => {
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 20;
        }

        const rowHeight = 8;
        if (index % 2 === 0) {
          doc.setFillColor(245, 245, 245);
        } else {
          doc.setFillColor(255, 255, 255);
        }
        doc.rect(20, yPosition, pageWidth - 40, rowHeight, 'F');
        doc.setDrawColor(200, 200, 200);
        doc.rect(20, yPosition, pageWidth - 40, rowHeight);

        doc.text(item.codigo || '-', colCodigo + 2, yPosition + 5.5);
        const desc = item.descricao.length > 40 ? item.descricao.substring(0, 37) + '...' : item.descricao;
        doc.text(desc, colDescricao, yPosition + 5.5);
        doc.text(item.quantidade.toString(), colQtd, yPosition + 5.5, { align: 'center' });
        
        if (informacoesComerciais.mostrarValores !== false) {
          const valorUnit = item.valorUnitario > 0 ? `R$ ${item.valorUnitario.toFixed(2).replace('.', ',')}` : '';
          doc.text(valorUnit, colValorUnit + 28, yPosition + 5.5, { align: 'right' });
          const valorTot = item.valorTotal > 0 ? `R$ ${item.valorTotal.toFixed(2).replace('.', ',')}` : '';
          doc.text(valorTot, colTotal + 25, yPosition + 5.5, { align: 'right' });
          totalServicos += item.valorTotal;
        }

        yPosition += rowHeight;
      });

      // Total dos serviços em box
      if (informacoesComerciais.mostrarValores !== false) {
        yPosition += 5;
        const boxWidth = 50;
        const boxHeight = 8;
        const boxX = pageWidth - 25 - boxWidth;
        
        doc.setDrawColor(200, 200, 200);
        doc.rect(boxX, yPosition, boxWidth, boxHeight);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('Total de Serviços', boxX + 2, yPosition + 5.5);
        
        const valorBoxX = boxX + boxWidth;
        doc.rect(valorBoxX, yPosition, 25, boxHeight);
        const totalServicosTexto = totalServicos > 0 ? `R$ ${totalServicos.toFixed(2).replace('.', ',')}` : '';
        doc.text(totalServicosTexto, valorBoxX + 23, yPosition + 5.5, { align: 'right' });
      }
      
      yPosition += 15;
    }

    // Tabela: Usinagem Necessária (com código)
    if (itensAnalise.usinagem.length > 0) {
      if (yPosition > 210) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(220, 38, 38);
      doc.text('USINAGEM NECESSÁRIA', 20, yPosition);
      doc.setTextColor(0, 0, 0);
      yPosition += 10;

      // Cabeçalho da tabela
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setFillColor(220, 220, 220);
      doc.rect(20, yPosition, pageWidth - 40, 8, 'F');
      doc.setDrawColor(200, 200, 200);
      doc.rect(20, yPosition, pageWidth - 40, 8);

      doc.text('Código', colCodigo + 2, yPosition + 5.5);
      doc.text('Descrição', colDescricao, yPosition + 5.5);
      doc.text('Qtd', colQtd, yPosition + 5.5, { align: 'center' });
      if (informacoesComerciais.mostrarValores !== false) {
        doc.text('Valor Unit.', colValorUnit + 28, yPosition + 5.5, { align: 'right' });
        doc.text('Total', colTotal + 25, yPosition + 5.5, { align: 'right' });
      }
      yPosition += 8;

      // Linhas de dados
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      let totalUsinagem = 0;

      itensAnalise.usinagem.forEach((item, index) => {
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 20;
        }

        const rowHeight = 8;
        if (index % 2 === 0) {
          doc.setFillColor(245, 245, 245);
        } else {
          doc.setFillColor(255, 255, 255);
        }
        doc.rect(20, yPosition, pageWidth - 40, rowHeight, 'F');
        doc.setDrawColor(200, 200, 200);
        doc.rect(20, yPosition, pageWidth - 40, rowHeight);

        doc.text(item.codigo || '-', colCodigo + 2, yPosition + 5.5);
        const desc = item.descricao.length > 40 ? item.descricao.substring(0, 37) + '...' : item.descricao;
        doc.text(desc, colDescricao, yPosition + 5.5);
        doc.text(item.quantidade.toString(), colQtd, yPosition + 5.5, { align: 'center' });
        
        if (informacoesComerciais.mostrarValores !== false) {
          const valorUnit = item.valorUnitario > 0 ? `R$ ${item.valorUnitario.toFixed(2).replace('.', ',')}` : '';
          doc.text(valorUnit, colValorUnit + 28, yPosition + 5.5, { align: 'right' });
          const valorTot = item.valorTotal > 0 ? `R$ ${item.valorTotal.toFixed(2).replace('.', ',')}` : '';
          doc.text(valorTot, colTotal + 25, yPosition + 5.5, { align: 'right' });
          totalUsinagem += item.valorTotal;
        }

        yPosition += rowHeight;
      });

      // Total da usinagem em box
      if (informacoesComerciais.mostrarValores !== false) {
        yPosition += 5;
        const boxWidth = 50;
        const boxHeight = 8;
        const boxX = pageWidth - 25 - boxWidth;
        
        doc.setDrawColor(200, 200, 200);
        doc.rect(boxX, yPosition, boxWidth, boxHeight);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('Total de Usinagem', boxX + 2, yPosition + 5.5);
        
        const valorBoxX = boxX + boxWidth;
        doc.rect(valorBoxX, yPosition, 25, boxHeight);
        const totalUsinagemTexto = totalUsinagem > 0 ? `R$ ${totalUsinagem.toFixed(2)}` : '';
        doc.text(totalUsinagemTexto, valorBoxX + 23, yPosition + 5.5, { align: 'right' });
      }
      
      yPosition += 15;
    }

    // Tabela: Resumo Financeiro
    if (informacoesComerciais.mostrarValores !== false) {
      if (yPosition > 240) {
        doc.addPage();
        yPosition = 20;
      }

      const dadosResumo: Array<{label: string, value: string}> = [
        { label: 'Valor Total:', value: `R$ ${valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` },
      ];

      if (informacoesComerciais.desconto > 0) {
        dadosResumo.push({ 
          label: `Desconto (${informacoesComerciais.desconto}%):`, 
          value: `R$ ${(valorTotal - valorComDesconto).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` 
        });
        dadosResumo.push({ 
          label: 'Valor Final:', 
          value: `R$ ${valorComDesconto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` 
        });
      }

      criarTabela('Resumo Financeiro', dadosResumo, [220, 38, 38]);
    }

    // Seção de Fotos do Orçamento (apenas as marcadas para apresentação)
    const fotosApresentacao = fotos.filter(f => f.apresentar_orcamento);
    
    if (fotosApresentacao.length > 0) {
      const adicionarFotosGrade = async (fotos: any[], titulo: string) => {
        if (fotos.length === 0) return;
        
        // SEMPRE começar fotos em nova página para evitar sobreposição
        doc.addPage();
        let yPosFotos = 20;
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(220, 38, 38);
        doc.text(titulo, 20, yPosFotos);
        doc.setTextColor(0, 0, 0);
        yPosFotos += 10;
        
        const fotosPorPagina = 4;
        const maxFotoWidth = 80;
        const maxFotoHeight = 55;
        const espacoHorizontal = 12;
        const espacoVertical = 12;
        
        for (let i = 0; i < fotos.length; i += fotosPorPagina) {
          if (i > 0) {
            doc.addPage();
            yPosFotos = 20;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            doc.setTextColor(220, 38, 38);
            doc.text(titulo + ' (continuação)', 20, yPosFotos);
            doc.setTextColor(0, 0, 0);
            yPosFotos += 10;
          }
          
          const fotosPagina = fotos.slice(i, i + fotosPorPagina);
          
          for (let j = 0; j < fotosPagina.length; j++) {
            const col = j % 2;
            const row = Math.floor(j / 2);
            const xPos = 20 + col * (maxFotoWidth + espacoHorizontal);
            const yPos = yPosFotos + row * (maxFotoHeight + espacoVertical);
            
            try {
              await new Promise<void>((resolve) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => {
                  const imgAspectRatio = img.width / img.height;
                  const maxAspectRatio = maxFotoWidth / maxFotoHeight;
                  
                  let finalWidth = maxFotoWidth;
                  let finalHeight = maxFotoHeight;
                  
                  if (imgAspectRatio > maxAspectRatio) {
                    finalHeight = maxFotoWidth / imgAspectRatio;
                  } else {
                    finalWidth = maxFotoHeight * imgAspectRatio;
                  }
                  
                  const xOffset = (maxFotoWidth - finalWidth) / 2;
                  const yOffset = (maxFotoHeight - finalHeight) / 2;
                  
                  doc.addImage(img, 'JPEG', xPos + xOffset, yPos + yOffset, finalWidth, finalHeight);
                  resolve();
                };
                img.onerror = () => resolve();
                img.src = fotosPagina[j].arquivo_url;
              });
            } catch (error) {
              console.error('Erro ao adicionar foto:', error);
            }
          }
        }
      };
      
      await adicionarFotosGrade(fotosApresentacao, 'Fotos do Orçamento');
    }

    // Adicionar rodapés a todas as páginas
    adicionarRodape();

    // Salvar PDF
    doc.save(`Orcamento_${dadosOrcamento.numeroOrdem.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`);
    toast({
      title: "Sucesso",
      description: "PDF exportado com sucesso!"
    });
  };
  return <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/orcamentos')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              {ordemServicoId ? 'Novo Orçamento - Baseado em Ordem de Serviço' : 
               analiseId ? 'Novo Orçamento - Baseado em Análise' : 'Novo Orçamento'}
            </h2>
            <p className="text-muted-foreground">
              Crie e edite a proposta comercial
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Informações Básicas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Dados do Orçamento
              </CardTitle>
              <CardDescription>
                Informações básicas da proposta
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="numeroOrdem">Nº do Orçamento *</Label>
                  <div className="relative">
                    <Input id="numeroOrdem" value={dadosOrcamento.numeroOrdem} onChange={e => setDadosOrcamento(prev => ({
                    ...prev,
                    numeroOrdem: e.target.value
                  }))} className="bg-muted" />
                    <span className="absolute bottom-1 left-3 text-xs text-muted-foreground">
                      Número gerado automaticamente
                    </span>
                  </div>
                </div>
                <div>
                  <Label htmlFor="tipoOrdem">Tipo Ordem *</Label>
                  <Select value={dadosOrcamento.tipoOrdem} onValueChange={value => setDadosOrcamento(prev => ({
                  ...prev,
                  tipoOrdem: value
                }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manutencao">Manutenção</SelectItem>
                      <SelectItem value="reforma">Reforma</SelectItem>
                      <SelectItem value="instalacao">Instalação</SelectItem>
                      <SelectItem value="reparo">Reparo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cliente">Cliente *</Label>
                  {ordemServicoId ? (
                    <Input 
                      id="cliente" 
                      value={dadosOrcamento.cliente} 
                      disabled 
                      className="bg-muted"
                    />
                  ) : (
                    <Select value={dadosOrcamento.clienteId} onValueChange={value => {
                      const clienteSelecionado = clientes.find(c => c.id === value);
                      setDadosOrcamento(prev => ({
                        ...prev,
                        clienteId: value,
                        cliente: clienteSelecionado?.nome || ''
                      }));
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {clientes.map(cliente => <SelectItem key={cliente.id} value={cliente.id}>
                            {cliente.nome}
                          </SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div>
                  <Label htmlFor="solicitante">Solicitante</Label>
                  <Input id="solicitante" value={dadosOrcamento.solicitante} onChange={e => setDadosOrcamento(prev => ({
                  ...prev,
                  solicitante: e.target.value
                }))} placeholder="Nome do solicitante" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dataAbertura">Data de Abertura *</Label>
                  <Input id="dataAbertura" type="date" value={dadosOrcamento.dataAbertura} onChange={e => setDadosOrcamento(prev => ({
                  ...prev,
                  dataAbertura: e.target.value
                }))} />
                </div>
                <div>
                  <Label htmlFor="numeroNota">Nº da Nota *</Label>
                  <Input id="numeroNota" value={dadosOrcamento.numeroNota} onChange={e => setDadosOrcamento(prev => ({
                  ...prev,
                  numeroNota: e.target.value
                }))} placeholder="Número da nota fiscal" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="numeroSerie">Ordem Referencia</Label>
                  <Input id="numeroSerie" value={dadosOrcamento.numeroSerie} onChange={e => setDadosOrcamento(prev => ({
                  ...prev,
                  numeroSerie: e.target.value
                }))} placeholder="Número da ordem de serviço referência" disabled={!!ordemServicoId} className={ordemServicoId ? "bg-muted" : ""} />
                </div>
                <div>
                  <Label htmlFor="tag">TAG</Label>
                  <Input id="tag" value={dadosOrcamento.tag} onChange={e => setDadosOrcamento(prev => ({
                  ...prev,
                  tag: e.target.value
                }))} placeholder="TAG do equipamento" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

         {/* Fotos do Equipamento */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-primary" />
              Fotos do Equipamento
            </CardTitle>
            <CardDescription>
              Faça upload de fotos do equipamento
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Upload Area - sempre visível quando não há fotos OU quando não é ordem de serviço */}
            {(!ordemServicoId || fotos.length === 0) && (
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                <input
                  type="file"
                  id="upload-fotos"
                  multiple
                  accept="image/*"
                  onChange={handleUploadFoto}
                  className="hidden"
                  disabled={uploadingFoto}
                />
                <label htmlFor="upload-fotos" className="cursor-pointer block">
                  <Upload className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-primary font-medium mb-1">
                    Clique para fazer upload de fotos
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG até 10MB
                  </p>
                </label>
                {uploadingFoto && (
                  <p className="text-sm text-primary mt-3 animate-pulse">Enviando...</p>
                )}
              </div>
            )}

            {/* Grid de Fotos com Preview */}
            {fotos.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {fotos.map((foto) => (
                  <div key={foto.id} className="border-2 border-dashed border-border rounded-lg p-2 space-y-2">
                      <div className="relative group">
                        <img
                          src={foto.arquivo_url}
                          alt={foto.nome_arquivo}
                          className="w-full h-32 object-cover rounded-md cursor-pointer"
                          onClick={() => window.open(foto.arquivo_url, '_blank')}
                        />
                        {!ordemServicoId && (
                          <Button
                            variant="destructive"
                            size="icon"
                            className="absolute top-1 right-1 h-6 w-6 rounded-full shadow-lg"
                            onClick={() => removerFoto(foto.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      <div className="flex items-center gap-2 px-1">
                        <Checkbox
                          id={`apresentar-${foto.id}`}
                          checked={foto.apresentar_orcamento ?? false}
                          onCheckedChange={() => toggleApresentarOrcamento(foto.id)}
                        />
                        <label
                          htmlFor={`apresentar-${foto.id}`}
                          className="text-xs text-foreground cursor-pointer select-none"
                        >
                          Apresentar Orçamento
                        </label>
                      </div>
                    </div>
                  ))}
                
                {/* Botão para adicionar mais fotos se já houver fotos */}
                {!ordemServicoId && (
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                    <input
                      type="file"
                      id="upload-fotos-additional"
                      multiple
                      accept="image/*"
                      onChange={handleUploadFoto}
                      className="hidden"
                      disabled={uploadingFoto}
                    />
                    <label htmlFor="upload-fotos-additional" className="cursor-pointer block">
                      <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-primary font-medium text-sm">
                        Adicionar mais fotos
                      </p>
                    </label>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Fotos da Análise - apenas se vier de análise */}
        {analiseId && analiseData && (analiseData.fotosChegada || analiseData.fotosAnalise) && <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-primary" />
                Fotos da Análise
              </CardTitle>
              <CardDescription>
                Fotos do equipamento durante o processo de análise
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Fotos de Chegada */}
              {analiseData.fotosChegada && analiseData.fotosChegada.some((foto: string) => foto) && <div>
                  <h4 className="text-sm font-medium text-foreground mb-3">Fotos de Chegada do Equipamento</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {analiseData.fotosChegada.map((foto: string, index: number) => {
                if (!foto) return null;
                return <div key={`chegada-${index}`} className="relative group">
                          <img src={foto} alt={`Foto de chegada ${index + 1}`} className="w-full h-32 object-cover rounded-lg border border-border shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => window.open(foto, '_blank')} />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg"></div>
                        </div>;
              })}
                  </div>
                </div>}

              {/* Fotos da Análise */}
              {analiseData.fotosAnalise && analiseData.fotosAnalise.some((foto: string) => foto) && <div>
                  <h4 className="text-sm font-medium text-foreground mb-3">Fotos da Análise Técnica</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {analiseData.fotosAnalise.map((foto: string, index: number) => {
                if (!foto) return null;
                return <div key={`analise-${index}`} className="relative group">
                          <img src={foto} alt={`Foto da análise ${index + 1}`} className="w-full h-32 object-cover rounded-lg border border-border shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => window.open(foto, '_blank')} />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg"></div>
                        </div>;
              })}
                  </div>
                </div>}
            </CardContent>
          </Card>}

        {/* Seções de Itens do Orçamento */}
        {/* Peças */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Peças
            </CardTitle>
            <CardDescription>
              {analiseId ? 'Defina os valores para cada peça da análise' : 'Adicione as peças necessárias'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {itensAnalise.pecas.length > 0 ? <>
                <Table>
                  <TableHeader>
                      <TableRow>
                      <TableHead>Peça</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Material</TableHead>
                      <TableHead>Medidas</TableHead>
                      <TableHead className="text-center">Qtd</TableHead>
                      <TableHead className="text-right">Valor Unit. (R$)</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itensAnalise.pecas.map(peca => <TableRow key={peca.id}>
                        <TableCell>
                          <Input value={peca.descricao} onChange={e => atualizarDescricaoItem('pecas', peca.id, e.target.value)} placeholder="Descrição da peça" className="min-w-[200px]" />
                        </TableCell>
                        <TableCell>
                          <Input value={peca.codigo || ''} onChange={e => setItensAnalise(prev => ({
                      ...prev,
                      pecas: prev.pecas.map(p => p.id === peca.id ? {
                        ...p,
                        codigo: e.target.value
                      } : p)
                    }))} placeholder="Código" className="min-w-[100px]" />
                        </TableCell>
                        <TableCell>
                          <Input value={peca.detalhes?.material || ''} onChange={e => setItensAnalise(prev => ({
                      ...prev,
                      pecas: prev.pecas.map(p => p.id === peca.id ? {
                        ...p,
                        detalhes: {
                          ...p.detalhes,
                          material: e.target.value
                        }
                      } : p)
                    }))} placeholder="Material" className="min-w-[120px]" />
                        </TableCell>
                        <TableCell>
                          <Input value={peca.detalhes?.medidas || ''} onChange={e => setItensAnalise(prev => ({
                      ...prev,
                      pecas: prev.pecas.map(p => p.id === peca.id ? {
                        ...p,
                        detalhes: {
                          ...p.detalhes,
                          medidas: e.target.value
                        }
                      } : p)
                    }))} placeholder="Medidas" className="min-w-[120px]" />
                        </TableCell>
                        <TableCell className="text-center">
                          <Input type="number" min="1" value={peca.quantidade} onChange={e => atualizarQuantidadeItem('pecas', peca.id, parseInt(e.target.value) || 1)} className="w-16 text-center" />
                        </TableCell>
                        <TableCell className="text-right">
                          <Input type="number" step="0.01" min="0" value={peca.valorUnitario} onChange={e => atualizarValorItem('pecas', peca.id, parseFloat(e.target.value) || 0)} className="w-24 text-right" />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          R$ {peca.valorTotal.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2
                    })}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button variant="ghost" size="sm" onClick={() => removerItem('pecas', peca.id)} className="h-8 w-8 p-0 text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>)}
                  </TableBody>
                </Table>
                {itensAnalise.pecas.length > 0 && (
                  <div className="mt-4 pt-4 border-t flex justify-end">
                    <div className="text-lg font-bold">
                      Total de Peças: R$ {itensAnalise.pecas.reduce((acc, item) => acc + item.valorTotal, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                )}
                <div className="mt-4 pt-4 border-t">
                  <Button variant="outline" onClick={() => adicionarItemAdicional('pecas')} className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Adicionar Peça
                  </Button>
                </div>
              </> : <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">Nenhuma peça adicionada</p>
                <Button variant="outline" onClick={() => adicionarItemAdicional('pecas')} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Adicionar Primeira Peça
                </Button>
              </div>}
          </CardContent>
        </Card>

        {/* Serviços */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-primary" />
              Serviços
            </CardTitle>
            <CardDescription>
              {analiseId ? 'Defina os valores para cada serviço da análise' : 'Adicione os serviços necessários'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {itensAnalise.servicos.length > 0 ? <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Serviço</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead className="text-center">Qtd</TableHead>
                      <TableHead className="text-right">Valor Unit. (R$)</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itensAnalise.servicos.map(servico => <TableRow key={servico.id}>
                        <TableCell>
                          <Input value={servico.descricao} onChange={e => atualizarDescricaoItem('servicos', servico.id, e.target.value)} placeholder="Descrição do serviço" className="min-w-[250px]" />
                        </TableCell>
                        <TableCell>
                          <Input value={servico.codigo || ''} onChange={e => setItensAnalise(prev => ({
                      ...prev,
                      servicos: prev.servicos.map(s => s.id === servico.id ? {
                        ...s,
                        codigo: e.target.value
                      } : s)
                    }))} placeholder="Código" className="min-w-[100px]" />
                        </TableCell>
                        <TableCell className="text-center">
                          <Input type="number" min="1" value={servico.quantidade} onChange={e => atualizarQuantidadeItem('servicos', servico.id, parseInt(e.target.value) || 1)} className="w-16 text-center" />
                        </TableCell>
                        <TableCell className="text-right">
                          <Input type="number" step="0.01" min="0" value={servico.valorUnitario} onChange={e => atualizarValorItem('servicos', servico.id, parseFloat(e.target.value) || 0)} className="w-24 text-right" />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          R$ {servico.valorTotal.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2
                    })}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button variant="ghost" size="sm" onClick={() => removerItem('servicos', servico.id)} className="h-8 w-8 p-0 text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>)}
                  </TableBody>
                </Table>
                {itensAnalise.servicos.length > 0 && (
                  <div className="mt-4 pt-4 border-t flex justify-end">
                    <div className="text-lg font-bold">
                      Total de Serviços: R$ {itensAnalise.servicos.reduce((acc, item) => acc + item.valorTotal, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                )}
                <div className="mt-4 pt-4 border-t">
                  <Button variant="outline" onClick={() => adicionarItemAdicional('servicos')} className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Adicionar Serviço
                  </Button>
                </div>
              </> : <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">Nenhum serviço adicionado</p>
                <Button variant="outline" onClick={() => adicionarItemAdicional('servicos')} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Adicionar Primeiro Serviço
                </Button>
              </div>}
          </CardContent>
        </Card>

        {/* Usinagem */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              Usinagem
            </CardTitle>
            <CardDescription>
              {analiseId ? 'Defina os valores para cada usinagem da análise' : 'Adicione os trabalhos de usinagem necessários'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {itensAnalise.usinagem.length > 0 ? <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usinagem</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead className="text-center">Qtd</TableHead>
                      <TableHead className="text-right">Valor Unit. (R$)</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itensAnalise.usinagem.map(usinagem => <TableRow key={usinagem.id}>
                        <TableCell>
                          <Input value={usinagem.descricao} onChange={e => atualizarDescricaoItem('usinagem', usinagem.id, e.target.value)} placeholder="Descrição da usinagem" className="min-w-[250px]" />
                        </TableCell>
                        <TableCell>
                          <Input value={usinagem.codigo || ''} onChange={e => setItensAnalise(prev => ({
                      ...prev,
                      usinagem: prev.usinagem.map(u => u.id === usinagem.id ? {
                        ...u,
                        codigo: e.target.value
                      } : u)
                    }))} placeholder="Código" className="min-w-[100px]" />
                        </TableCell>
                        <TableCell className="text-center">
                          <Input type="number" min="1" value={usinagem.quantidade} onChange={e => atualizarQuantidadeItem('usinagem', usinagem.id, parseInt(e.target.value) || 1)} className="w-16 text-center" />
                        </TableCell>
                        <TableCell className="text-right">
                          <Input type="number" step="0.01" min="0" value={usinagem.valorUnitario} onChange={e => atualizarValorItem('usinagem', usinagem.id, parseFloat(e.target.value) || 0)} className="w-24 text-right" />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          R$ {usinagem.valorTotal.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2
                    })}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button variant="ghost" size="sm" onClick={() => removerItem('usinagem', usinagem.id)} className="h-8 w-8 p-0 text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>)}
                  </TableBody>
                </Table>
                {itensAnalise.usinagem.length > 0 && (
                  <div className="mt-4 pt-4 border-t flex justify-end">
                    <div className="text-lg font-bold">
                      Total de Usinagem: R$ {itensAnalise.usinagem.reduce((acc, item) => acc + item.valorTotal, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                )}
                <div className="mt-4 pt-4 border-t">
                  <Button variant="outline" onClick={() => adicionarItemAdicional('usinagem')} className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Adicionar Usinagem
                  </Button>
                </div>
              </> : <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">Nenhuma usinagem adicionada</p>
                <Button variant="outline" onClick={() => adicionarItemAdicional('usinagem')} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Adicionar Primeira Usinagem
                </Button>
              </div>}
          </CardContent>
        </Card>

        {/* Informações Comerciais */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Informações Comerciais
            </CardTitle>
            <CardDescription>
              Configure as condições comerciais da proposta
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="valorOrcamento">Valor do Orçamento</Label>
                <div className="flex gap-2">
                  <Input 
                    id="valorOrcamento" 
                    type="number" 
                    min="0" 
                    step="0.01"
                    value={informacoesComerciais.valorTotal}
                    onChange={e => setInformacoesComerciais(prev => ({
                      ...prev,
                      valorTotal: parseFloat(e.target.value) || 0
                    }))}
                    className="font-medium flex-1" 
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const totalCalculado = calcularTotalGeral();
                      setInformacoesComerciais(prev => ({
                        ...prev,
                        valorTotal: totalCalculado
                      }));
                      toast({
                        title: "Valor recalculado",
                        description: `Valor atualizado para R$ ${totalCalculado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                      });
                    }}
                    className="whitespace-nowrap"
                  >
                    <Calculator className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div>
                <Label htmlFor="desconto">% Desconto</Label>
                <Input id="desconto" type="number" min="0" max="100" step="0.1" value={informacoesComerciais.desconto} onChange={e => setInformacoesComerciais(prev => ({
                ...prev,
                desconto: parseFloat(e.target.value) || 0
              }))} />
              </div>
              <div>
                <Label htmlFor="valorComDesconto">Valor com Desconto</Label>
                <Input id="valorComDesconto" value={`R$ ${calcularValorComDesconto().toLocaleString('pt-BR', {
                minimumFractionDigits: 2
              })}`} disabled className="bg-muted font-medium" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="assuntoProposta">Assunto da Proposta</Label>
                <Input id="assuntoProposta" value={informacoesComerciais.assuntoProposta} onChange={e => setInformacoesComerciais(prev => ({
                ...prev,
                assuntoProposta: e.target.value
              }))} placeholder="Ex: REFORMA CILINDRO HIDRÁULICO" maxLength={100} />
              </div>
              <div>
                <Label htmlFor="frete">Tipo de Frete</Label>
                <Select value={informacoesComerciais.frete} onValueChange={value => setInformacoesComerciais(prev => ({
                ...prev,
                frete: value
              }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CIF">CIF (Custo, Seguro e Frete)</SelectItem>
                    <SelectItem value="FOB">FOB (Free On Board)</SelectItem>
                    <SelectItem value="EXW">EXW (Ex Works)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="condicaoPagamento">Condição de Pagamento</Label>
                <Input id="condicaoPagamento" value={informacoesComerciais.condicaoPagamento} onChange={e => setInformacoesComerciais(prev => ({
                ...prev,
                condicaoPagamento: e.target.value
              }))} placeholder="Ex: 21 DDL" />
              </div>
              <div>
                <Label htmlFor="prazoEntrega">Prazo de Entrega (dias)</Label>
                <Input 
                  id="prazoEntrega" 
                  type="number"
                  min="1"
                  value={informacoesComerciais.prazoEntrega} 
                  onChange={e => setInformacoesComerciais(prev => ({
                    ...prev,
                    prazoEntrega: e.target.value
                  }))} 
                  placeholder="5"
                />
              </div>
              <div>
                <Label htmlFor="prazoMeses">Prazo (Meses)</Label>
                <Select value={informacoesComerciais.prazoMeses} onValueChange={value => setInformacoesComerciais(prev => ({
                ...prev,
                prazoMeses: value
              }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="6">6 Meses</SelectItem>
                    <SelectItem value="12">12 Meses</SelectItem>
                    <SelectItem value="18">18 Meses</SelectItem>
                    <SelectItem value="24">24 Meses</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea id="observacoes" value={dadosOrcamento.observacoes} onChange={e => setDadosOrcamento(prev => ({
              ...prev,
              observacoes: e.target.value
            }))} placeholder="Observações adicionais sobre o orçamento..." rows={3} />
            </div>
          </CardContent>
        </Card>

        {/* Botões de Ação */}
        <div className="flex justify-end gap-4 pt-6">
          <Button variant="outline" onClick={() => navigate("/orcamentos")}>
            Cancelar
          </Button>
          <Button onClick={exportarPDF} variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Exportar PDF
          </Button>
          <Button onClick={salvarOrcamento} className="flex items-center gap-2 bg-gradient-primary hover:bg-primary-hover">
            <Save className="h-4 w-4" />
            Salvar Orçamento
          </Button>
        </div>
      </div>
    </AppLayout>;
}