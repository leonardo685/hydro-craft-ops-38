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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calculator, FileText, DollarSign, ArrowLeft, Wrench, Settings, Package, Plus, Trash2, Download, Save, Camera, Upload, X, Minus } from "lucide-react";
import { useState, useEffect, useMemo, useRef } from "react";
import { useClientes } from "@/hooks/use-clientes";
import { useCategoriasFinanceiras } from "@/hooks/use-categorias-financeiras";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FotoEquipamento } from "@/hooks/use-recebimentos";
import jsPDF from "jspdf";
import mecHidroLogo from "@/assets/mec-hidro-logo.jpg";
import { useEmpresa } from "@/contexts/EmpresaContext";
import { useLanguage } from "@/contexts/LanguageContext";
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
  const { empresaAtual } = useEmpresa();
  const { t } = useLanguage();
  
  // Usar ref para persistir o orçamento e evitar perda de dados em re-renders
  const orcamentoRef = useRef(orcamentoParaEdicao);
  
  // Atualizar ref apenas quando receber novo orçamento
  useEffect(() => {
    if (orcamentoParaEdicao) {
      orcamentoRef.current = orcamentoParaEdicao;
    }
  }, [orcamentoParaEdicao]);
  
  const {
    clientes,
    criarCliente
  } = useClientes();

  const { categorias, loading: loadingCategorias } = useCategoriasFinanceiras();

  // Filtrar apenas categorias de receita operacional (entrada), excluindo não operacionais
  const receitasOperacionais = useMemo(() => {
    // Encontrar a categoria mãe "Receitas Não Operacionais" para excluir suas filhas
    const categoriaNaoOperacional = categorias.find(cat => 
      cat.tipo === 'mae' && 
      cat.classificacao === 'entrada' && 
      cat.nome.toLowerCase().includes('não operacion')
    );

    return categorias.filter(cat => {
      // Incluir apenas categorias de entrada (receita)
      if (cat.classificacao !== 'entrada') return false;
      
      // Excluir categorias mãe (queremos apenas as filhas para seleção)
      if (cat.tipo === 'mae') return false;
      
      // Excluir filhas de "Receitas Não Operacionais"
      if (categoriaNaoOperacional && cat.categoriaMaeId === categoriaNaoOperacional.id) {
        return false;
      }
      
      return true;
    });
  }, [categorias]);
  
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
    garantia: '12',
    validadeProposta: '30',
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
  const [fotos, setFotos] = useState<Array<FotoEquipamento & { apresentar_orcamento?: boolean; legenda?: string }>>([]);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [dadosTecnicos, setDadosTecnicos] = useState<{
    pressaoTrabalho: string;
    temperaturaTrabalho: string;
    fluidoTrabalho: string;
    camisa: string;
    hasteComprimento: string;
    curso: string;
    conexaoA: string;
    conexaoB: string;
    localInstalacao: string;
    potencia: string;
    ambienteTrabalho: string;
    categoriaEquipamento: string;
  } | null>(null);
  
  // Estados para histórico de orçamentos
  const [historicoOrcamento, setHistoricoOrcamento] = useState<any[]>([]);
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);
  const [mostrarHistorico, setMostrarHistorico] = useState(false);
  
  // Estados para cadastro de novo cliente
  const [modalNovoCliente, setModalNovoCliente] = useState(false);
  const [novoClienteData, setNovoClienteData] = useState({
    nome: '',
    cnpj_cpf: '',
    email: '',
    telefone: '',
    endereco: '',
    cidade: '',
    estado: '',
    cep: ''
  });

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

  // Função para gerar próximo número de ordem de referência no formato MH-000-00
  const gerarProximaOrdemReferencia = async () => {
    try {
      const anoAtual = new Date().getFullYear().toString().slice(-2);
      
      // Buscar a última ordem de referência do ano atual
      const { data, error } = await supabase
        .from('orcamentos')
        .select('ordem_referencia')
        .not('ordem_referencia', 'is', null)
        .ilike('ordem_referencia', `MH-%-${anoAtual}`)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Erro ao buscar última ordem de referência:', error);
        return `MH-001-${anoAtual}`;
      }

      if (data && data.length > 0 && data[0].ordem_referencia) {
        // Extrair o número sequencial: MH-XXX-YY
        const partes = data[0].ordem_referencia.split('-');
        if (partes.length === 3 && partes[0] === 'MH' && partes[2] === anoAtual) {
          const sequencial = parseInt(partes[1]) + 1;
          return `MH-${sequencial.toString().padStart(3, '0')}-${anoAtual}`;
        }
      }

      // Se não encontrou nenhuma ordem do ano atual, começar com 001
      return `MH-001-${anoAtual}`;
    } catch (error) {
      console.error('Erro ao gerar próxima ordem de referência:', error);
      const anoAtual = new Date().getFullYear().toString().slice(-2);
      return `MH-001-${anoAtual}`;
    }
  };

  // Função para carregar histórico de revisões do orçamento
  const carregarHistoricoOrcamento = async (orcamentoId: string) => {
    if (!orcamentoId) return;
    
    setCarregandoHistorico(true);
    try {
      const { data, error } = await supabase
        .from('historico_orcamentos')
        .select('*')
        .eq('orcamento_id', orcamentoId)
        .order('numero_revisao', { ascending: false });
      
      if (error) throw error;
      setHistoricoOrcamento(data || []);
      
      // Se há histórico, mostrar a seção
      if (data && data.length > 0) {
        setMostrarHistorico(true);
      }
    } catch (error) {
      console.error('Erro ao carregar histórico do orçamento:', error);
    } finally {
      setCarregandoHistorico(false);
    }
  };

  // Carregar histórico quando for edição
  useEffect(() => {
    if (dadosOrcamento.id && orcamentoParaEdicao) {
      carregarHistoricoOrcamento(dadosOrcamento.id);
    }
  }, [dadosOrcamento.id]);

  useEffect(() => {
    const carregarDados = async () => {
      // Usar ref para evitar perda de dados em re-renders
      const orcamentoEdicao = orcamentoRef.current;
      
      // Aguardar clientes serem carregados antes de processar edição
      if (orcamentoEdicao && clientes.length === 0) {
        return; // Aguardar próximo render com clientes carregados
      }

      // Se é edição, carregar dados do orçamento
      if (orcamentoEdicao) {
        console.log('📥 Orçamento recebido para edição:', {
          id: orcamentoEdicao.id,
          numero: orcamentoEdicao.numero,
          cliente_id: orcamentoEdicao.cliente_id,
          cliente_nome: orcamentoEdicao.cliente_nome,
          objetoCompleto: orcamentoEdicao
        });
        
        // VALIDAÇÃO CRÍTICA: Verificar se o ID existe
        if (!orcamentoEdicao.id) {
          console.error('❌ ERRO CRÍTICO: Orçamento sem ID!', orcamentoEdicao);
          toast({
            title: "Erro ao carregar orçamento",
            description: "O orçamento não possui um ID válido. Não é possível editar.",
            variant: "destructive"
          });
          navigate('/orcamentos');
          return;
        }
        
        console.log('✅ ID validado, carregando orçamento:', orcamentoEdicao.id);
        
        // Buscar cliente com normalização de strings para maior robustez
        const normalizarString = (str: string) => {
          return str.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        };
        
        const clienteEncontrado = clientes.find(c => {
          const nomeCliente = normalizarString(c.nome || '');
          const nomeOrcamento = normalizarString(orcamentoEdicao.cliente_nome || '');
          return nomeCliente === nomeOrcamento;
        });
        
        console.log('🔍 Debug - Edição de Orçamento:', {
          orcamentoId: orcamentoEdicao.id,
          clienteNomeBanco: orcamentoEdicao.cliente_nome,
          clienteIdBanco: orcamentoEdicao.cliente_id,
          clienteEncontrado: clienteEncontrado?.nome,
          clienteIdEncontrado: clienteEncontrado?.id,
          clienteIdFinal: orcamentoEdicao.cliente_id || clienteEncontrado?.id || ''
        });
        
        setDadosOrcamento({
          id: orcamentoEdicao.id || '', // Garantir que sempre tenha o ID
          tipoOrdem: orcamentoEdicao.observacoes?.split('|')[0]?.replace('Tipo:', '')?.trim() || 'reforma',
          numeroOrdem: orcamentoEdicao.numero || '',
          urgencia: false,
          cliente: orcamentoEdicao.cliente_nome || '',
          clienteId: orcamentoEdicao.cliente_id || clienteEncontrado?.id || '',
          tag: orcamentoEdicao.equipamento || '',
          solicitante: orcamentoEdicao.observacoes?.split('|')[1]?.replace('Solicitante:', '')?.trim() || '',
          dataAbertura: orcamentoEdicao.data_criacao ? new Date(orcamentoEdicao.data_criacao).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          numeroNota: orcamentoEdicao.numero_nota_entrada || orcamentoEdicao.observacoes?.split('|')[2]?.replace('Nota:', '')?.trim() || '',
          numeroSerie: orcamentoEdicao.ordem_referencia || orcamentoEdicao.observacoes?.split('|')[3]?.replace('Ordem Ref:', '')?.trim() || orcamentoEdicao.observacoes?.split('|')[3]?.replace('Série:', '')?.trim() || '',
          observacoes: orcamentoEdicao.descricao || '',
          status: orcamentoEdicao.status || 'pendente'
        });
        
        console.log('✅ Dados do orçamento configurados:', {
          id: orcamentoEdicao.id,
          numeroOrdem: orcamentoEdicao.numero,
          clienteId: orcamentoEdicao.cliente_id || clienteEncontrado?.id,
          status: orcamentoEdicao.status
        });

        // Carregar informações comerciais
        setInformacoesComerciais(prev => ({
          ...prev,
          valorTotal: Number(orcamentoEdicao.valor) || 0,
          desconto: Number(orcamentoEdicao.desconto_percentual) || 0,
          condicaoPagamento: orcamentoEdicao.condicao_pagamento || '',
          prazoEntrega: orcamentoEdicao.prazo_entrega || '',
          assuntoProposta: orcamentoEdicao.assunto_proposta || '',
          frete: orcamentoEdicao.frete || 'CIF',
          garantia: orcamentoEdicao.garantia || '12',
          validadeProposta: orcamentoEdicao.validade_proposta || '30'
        }));

        // Carregar itens do orçamento
        const { data: itensData, error: itensError } = await supabase
          .from('itens_orcamento')
          .select('*')
          .eq('orcamento_id', orcamentoEdicao.id);

        if (!itensError && itensData) {
          const pecas = itensData.filter(i => i.tipo === 'peca').map(i => ({
            id: `peca-${i.id}`,
            tipo: 'peca' as const,
            descricao: i.descricao,
            codigo: i.codigo || '',
            quantidade: Number(i.quantidade),
            valorUnitario: Number(i.valor_unitario),
            valorTotal: Number(i.valor_total),
            detalhes: i.detalhes as { material?: string; medidas?: string } | undefined
          }));

          const servicos = itensData.filter(i => i.tipo === 'servico').map(i => ({
            id: `servico-${i.id}`,
            tipo: 'servico' as const,
            descricao: i.descricao,
            codigo: i.codigo || '',
            quantidade: Number(i.quantidade),
            valorUnitario: Number(i.valor_unitario),
            valorTotal: Number(i.valor_total),
            detalhes: i.detalhes as { material?: string; medidas?: string } | undefined
          }));

          const usinagem = itensData.filter(i => i.tipo === 'usinagem').map(i => ({
            id: `usinagem-${i.id}`,
            tipo: 'usinagem' as const,
            descricao: i.descricao,
            codigo: i.codigo || '',
            quantidade: Number(i.quantidade),
            valorUnitario: Number(i.valor_unitario),
            valorTotal: Number(i.valor_total),
            detalhes: i.detalhes as { material?: string; medidas?: string } | undefined
          }));

          setItensAnalise({ pecas, servicos, usinagem });
        }

        // Carregar fotos do orçamento (se não tem ordem de serviço associada) ou de ordem de serviço
        if (orcamentoEdicao.ordem_servico_id) {
          // Buscar fotos de equipamentos através da ordem de serviço
          const { data: osData } = await supabase
            .from('ordens_servico')
            .select('recebimento_id')
            .eq('id', orcamentoEdicao.ordem_servico_id)
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
                recebimento_id: f.recebimento_id,
                legenda: f.legenda || null
              })));
            }
          }
        } else {
          // Buscar fotos do próprio orçamento
          const { data: fotosData } = await supabase
            .from('fotos_orcamento')
            .select('*')
            .eq('orcamento_id', orcamentoEdicao.id);

          if (fotosData) {
            setFotos(fotosData.map((f: any) => ({
              id: f.id,
              arquivo_url: f.arquivo_url,
              nome_arquivo: f.nome_arquivo,
              apresentar_orcamento: f.apresentar_orcamento || false,
              recebimento_id: null,
              legenda: f.legenda || null
            })));
          }
        }

        return; // Skip other loading logic for editing
      }

      // Gerar apenas número do orçamento se for novo
      const proximoNumero = await gerarProximoNumero();
      setDadosOrcamento(prev => ({
        ...prev,
        numeroOrdem: proximoNumero,
        numeroSerie: '' // Deixar vazio - será gerado apenas se baseado em ordem de serviço
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
                pressao_trabalho,
                temperatura_trabalho,
                fluido_trabalho,
                camisa,
                haste_comprimento,
                curso,
                conexao_a,
                conexao_b,
                local_instalacao,
                potencia,
                ambiente_trabalho,
                categoria_equipamento,
                fotos_equipamentos (
                  id,
                  arquivo_url,
                  nome_arquivo,
                  apresentar_orcamento,
                  legenda
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
            // Gerar ordem de referência automaticamente
            const ordemRef = await gerarProximaOrdemReferencia();
            
            // Preencher dados do orçamento com dados da ordem de serviço
            setDadosOrcamento(prev => ({
              ...prev,
              tipoOrdem: 'reforma', // Pode ajustar baseado no tipo_problema se necessário
              cliente: ordemServico.recebimentos?.cliente_nome || ordemServico.cliente_nome || '',
              clienteId: ordemServico.recebimentos?.cliente_id || '',
              solicitante: '',
              numeroNota: ordemServico.recebimentos?.nota_fiscal || '',
              numeroSerie: ordemServico.recebimentos?.numero_ordem || ordemRef, // Usar número da ordem do recebimento
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

            // Carregar dados técnicos do recebimento
            if (ordemServico.recebimentos) {
              setDadosTecnicos({
                pressaoTrabalho: ordemServico.recebimentos.pressao_trabalho || '',
                temperaturaTrabalho: ordemServico.recebimentos.temperatura_trabalho || '',
                fluidoTrabalho: ordemServico.recebimentos.fluido_trabalho || '',
                camisa: ordemServico.recebimentos.camisa || '',
                hasteComprimento: ordemServico.recebimentos.haste_comprimento || '',
                curso: ordemServico.recebimentos.curso || '',
                conexaoA: ordemServico.recebimentos.conexao_a || '',
                conexaoB: ordemServico.recebimentos.conexao_b || '',
                localInstalacao: ordemServico.recebimentos.local_instalacao || '',
                potencia: ordemServico.recebimentos.potencia || '',
                ambienteTrabalho: ordemServico.recebimentos.ambiente_trabalho || '',
                categoriaEquipamento: ordemServico.recebimentos.categoria_equipamento || ''
              });
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
        // PROTEÇÃO: Só atualizar data se não estiver editando
        if (!dadosOrcamento.id && !orcamentoRef.current) {
          setDadosOrcamento(prev => ({
            ...prev,
            dataAbertura: new Date().toISOString().split('T')[0]
          }));
        }
      }
    };

    carregarDados();
  }, [analiseId, ordemServicoId, clientes]); // Removido orcamentoParaEdicao das dependências

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
          recebimento_id: null,
          legenda: null
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

  const atualizarLegenda = async (fotoId: string, novaLegenda: string) => {
    try {
      setFotos(prevFotos =>
        prevFotos.map(f =>
          f.id === fotoId ? { ...f, legenda: novaLegenda } : f
        )
      );

      // Só atualiza no banco se não for id temporário
      if (!fotoId.startsWith('temp-')) {
        const { error } = await supabase
          .from('fotos_equipamentos')
          .update({ legenda: novaLegenda })
          .eq('id', fotoId);

        if (error) throw error;
      }
    } catch (error) {
      console.error('Erro ao atualizar legenda:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a legenda",
        variant: "destructive"
      });
    }
  };

  const handleSalvarNovoCliente = async () => {
    if (!novoClienteData.nome.trim()) {
      toast({
        title: "Erro",
        description: "O nome do cliente é obrigatório",
        variant: "destructive"
      });
      return;
    }

    try {
      const novoCliente = await criarCliente(novoClienteData);
      
      if (novoCliente) {
        // Selecionar automaticamente o cliente recém-criado
        setDadosOrcamento(prev => ({
          ...prev,
          clienteId: novoCliente.id,
          cliente: novoCliente.nome
        }));
        
        // Limpar formulário e fechar modal
        setNovoClienteData({
          nome: '',
          cnpj_cpf: '',
          email: '',
          telefone: '',
          endereco: '',
          cidade: '',
          estado: '',
          cep: ''
        });
        setModalNovoCliente(false);
        
        toast({
          title: "Sucesso",
          description: "Cliente cadastrado e selecionado com sucesso"
        });
      }
    } catch (error) {
      console.error('Erro ao criar cliente:', error);
    }
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
    const total = informacoesComerciais.valorTotal || 0;
    const desconto = total * (informacoesComerciais.desconto / 100);
    return total - desconto;
  };

  // Auto-preencher assunto da proposta com o equipamento
  useEffect(() => {
    if (dadosOrcamento.tag && !informacoesComerciais.assuntoProposta) {
      setInformacoesComerciais(prev => ({
        ...prev,
        assuntoProposta: dadosOrcamento.tag
      }));
    }
  }, [dadosOrcamento.tag]);
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
      // Se é edição (tem ID), verificar se houve alterações antes de salvar revisão
      if (dadosOrcamento.id) {
        // Buscar dados atuais do orçamento
        const { data: orcamentoAtual, error: errorBusca } = await supabase
          .from('orcamentos')
          .select('*')
          .eq('id', dadosOrcamento.id)
          .single();
        
        if (!errorBusca && orcamentoAtual) {
          // Verificar se houve alterações nos campos principais
          const houveAlteracaoCampos = 
            orcamentoAtual.equipamento !== (dadosOrcamento.tag || 'Equipamento não especificado') ||
            orcamentoAtual.cliente_nome !== dadosOrcamento.cliente ||
            Number(orcamentoAtual.valor) !== Number(valorFinal) ||
            Number(orcamentoAtual.desconto_percentual || 0) !== Number(informacoesComerciais.desconto) ||
            orcamentoAtual.condicao_pagamento !== (informacoesComerciais.condicaoPagamento || null) ||
            orcamentoAtual.prazo_entrega !== (informacoesComerciais.prazoEntrega || null) ||
            orcamentoAtual.frete !== (informacoesComerciais.frete || 'CIF');

          // Verificar se itens mudaram
          const { data: itensAtuaisCheck } = await supabase
            .from('itens_orcamento')
            .select('*')
            .eq('orcamento_id', dadosOrcamento.id);

          const todosItensNovos = [
            ...itensAnalise.pecas,
            ...itensAnalise.servicos,
            ...itensAnalise.usinagem
          ];

          const itensForamAlterados = 
            !itensAtuaisCheck ||
            itensAtuaisCheck.length !== todosItensNovos.length ||
            itensAtuaisCheck.some((itemAtual, idx) => {
              const itemNovo = todosItensNovos[idx];
              return !itemNovo ||
                itemAtual.descricao !== itemNovo.descricao ||
                Number(itemAtual.quantidade) !== Number(itemNovo.quantidade) ||
                Number(itemAtual.valor_unitario) !== Number(itemNovo.valorUnitario);
            });

          // Só criar revisão se houver alteração
          if (houveAlteracaoCampos || itensForamAlterados) {
            // Buscar último número de revisão
            const { data: ultimaRevisao } = await supabase
              .from('historico_orcamentos')
              .select('numero_revisao')
              .eq('orcamento_id', dadosOrcamento.id)
              .order('numero_revisao', { ascending: false })
              .limit(1)
              .maybeSingle();
            
            const proximaRevisao = (ultimaRevisao?.numero_revisao || 0) + 1;
            
            // Salvar snapshot do orçamento atual no histórico
            const { data: historicoSalvo, error: errorHistorico } = await supabase
              .from('historico_orcamentos')
              .insert({
                orcamento_id: dadosOrcamento.id,
                numero_revisao: proximaRevisao,
                numero: orcamentoAtual.numero,
                equipamento: orcamentoAtual.equipamento,
                cliente_nome: orcamentoAtual.cliente_nome,
                cliente_id: orcamentoAtual.cliente_id,
                valor: orcamentoAtual.valor,
                desconto_percentual: orcamentoAtual.desconto_percentual,
                condicao_pagamento: orcamentoAtual.condicao_pagamento,
                prazo_entrega: orcamentoAtual.prazo_entrega,
                prazo_pagamento: orcamentoAtual.prazo_pagamento,
                assunto_proposta: orcamentoAtual.assunto_proposta,
                frete: orcamentoAtual.frete,
                garantia: orcamentoAtual.garantia,
                validade_proposta: orcamentoAtual.validade_proposta,
                descricao: orcamentoAtual.descricao,
                observacoes: orcamentoAtual.observacoes,
                observacoes_nota: orcamentoAtual.observacoes_nota,
                preco_desejado: orcamentoAtual.preco_desejado,
                impostos_percentual: orcamentoAtual.impostos_percentual,
                impostos_valor: orcamentoAtual.impostos_valor,
                comissao_percentual: orcamentoAtual.comissao_percentual,
                comissao_valor: orcamentoAtual.comissao_valor,
                percentuais_customizados: orcamentoAtual.percentuais_customizados,
                custos_variaveis: orcamentoAtual.custos_variaveis,
                total_custos_variaveis: orcamentoAtual.total_custos_variaveis,
                margem_contribuicao: orcamentoAtual.margem_contribuicao,
                percentual_margem: orcamentoAtual.percentual_margem,
                status: orcamentoAtual.status
              })
              .select()
              .single();
            
            if (errorHistorico) {
              console.error('Erro ao salvar histórico do orçamento:', errorHistorico);
            } else if (historicoSalvo) {
              // Buscar itens atuais do orçamento
              const { data: itensAtuais } = await supabase
                .from('itens_orcamento')
                .select('*')
                .eq('orcamento_id', dadosOrcamento.id);
              
              // Salvar itens no histórico
              if (itensAtuais && itensAtuais.length > 0) {
                const itensHistorico = itensAtuais.map(item => ({
                  historico_orcamento_id: historicoSalvo.id,
                  tipo: item.tipo,
                  codigo: item.codigo,
                  descricao: item.descricao,
                  quantidade: item.quantidade,
                  valor_unitario: item.valor_unitario,
                  valor_total: item.valor_total,
                  detalhes: item.detalhes
                }));
                
                await supabase
                  .from('historico_itens_orcamento')
                  .insert(itensHistorico);
              }
              
              toast({
                title: "Revisão criada",
                description: `Versão anterior salva como REV ${proximaRevisao}`
              });
            }
          } else {
            console.log('✓ Nenhuma alteração detectada, revisão não criada');
          }
        }
      }
      
      // Gerar ordem de referência apenas se for baseado em ordem de serviço
      let ordemRef = dadosOrcamento.numeroSerie;
      if (orcamentoParaEdicao?.ordem_servico_id && (!ordemRef || !ordemRef.startsWith('MH-'))) {
        ordemRef = await gerarProximaOrdemReferencia();
      }

      // Criar dados para inserir no Supabase
    const orcamentoData = {
      numero: dadosOrcamento.numeroOrdem,
      cliente_nome: dadosOrcamento.cliente,
      cliente_id: dadosOrcamento.clienteId || null,
      equipamento: dadosOrcamento.tag || 'Equipamento não especificado',
        descricao: dadosOrcamento.observacoes || '',
        valor: valorFinal,
        desconto_percentual: informacoesComerciais.desconto,
        status: 'pendente',
        observacoes: `Tipo: ${dadosOrcamento.tipoOrdem} | Solicitante: ${dadosOrcamento.solicitante}`,
        numero_nota_entrada: dadosOrcamento.numeroNota || null,
        ordem_referencia: ordemRef,
        ordem_servico_id: ordemServicoId || null,
        condicao_pagamento: informacoesComerciais.condicaoPagamento || null,
        prazo_entrega: informacoesComerciais.prazoEntrega || null,
        assunto_proposta: informacoesComerciais.assuntoProposta || null,
        frete: informacoesComerciais.frete || 'CIF',
        garantia: informacoesComerciais.garantia || null,
        validade_proposta: informacoesComerciais.validadeProposta || null,
        empresa_id: empresaAtual?.id || null
      };

      let response;
      if (dadosOrcamento.id) {
        console.log('🔄 ATUALIZANDO orçamento existente:', {
          id: dadosOrcamento.id,
          numero: dadosOrcamento.numeroOrdem,
          cliente: dadosOrcamento.cliente
        });
        
        // Atualizar orçamento existente
        response = await supabase
          .from('orcamentos')
          .update(orcamentoData)
          .eq('id', dadosOrcamento.id)
          .select()
          .single();
          
        console.log('✅ Orçamento atualizado:', response);
      } else {
        console.log('➕ CRIANDO novo orçamento:', {
          numero: dadosOrcamento.numeroOrdem,
          cliente: dadosOrcamento.cliente
        });
        
        // Criar novo orçamento
        response = await supabase
          .from('orcamentos')
          .insert(orcamentoData)
          .select()
          .single();
          
        console.log('✅ Novo orçamento criado:', response);
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
        codigo: item.codigo || null,
        quantidade: item.quantidade,
        valor_unitario: item.valorUnitario,
        valor_total: item.valorTotal,
        detalhes: item.detalhes || null,
        empresa_id: empresaAtual?.id || null
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
          apresentar_orcamento: foto.apresentar_orcamento || false,
          legenda: foto.legenda || null,
          empresa_id: empresaAtual?.id || null
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
      
      // Atualizar status do recebimento se o orçamento está vinculado a uma ordem de serviço
      if (ordemServicoId) {
        const { data: ordemServico } = await supabase
          .from('ordens_servico')
          .select('recebimento_id')
          .eq('id', ordemServicoId)
          .maybeSingle();
        
        if (ordemServico?.recebimento_id) {
          await supabase
            .from('recebimentos')
            .update({ status: 'aguardando_aprovacao' })
            .eq('id', ordemServico.recebimento_id);
        }
      }
      
      // Após salvar com sucesso, recarregar histórico
      if (dadosOrcamento.id) {
        await carregarHistoricoOrcamento(dadosOrcamento.id);
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
  
  // Função para baixar PDF de revisão específica
  const handleBaixarPDFRevisao = async (revisao: any) => {
    try {
      // Buscar itens desta revisão
      const { data: itensRevisao } = await supabase
        .from('historico_itens_orcamento')
        .select('*')
        .eq('historico_orcamento_id', revisao.id);
      
      if (!itensRevisao) {
        throw new Error('Itens da revisão não encontrados');
      }

      // Organizar itens por tipo
      const itensRevisaoOrganizados = {
        pecas: itensRevisao.filter(i => i.tipo === 'peca').map(i => ({
          id: i.id,
          tipo: 'peca' as const,
          descricao: i.descricao,
          codigo: i.codigo || '',
          quantidade: Number(i.quantidade),
          valorUnitario: Number(i.valor_unitario),
          valorTotal: Number(i.valor_total),
          detalhes: i.detalhes
        })),
        servicos: itensRevisao.filter(i => i.tipo === 'servico').map(i => ({
          id: i.id,
          tipo: 'servico' as const,
          descricao: i.descricao,
          codigo: i.codigo || '',
          quantidade: Number(i.quantidade),
          valorUnitario: Number(i.valor_unitario),
          valorTotal: Number(i.valor_total),
          detalhes: i.detalhes
        })),
        usinagem: itensRevisao.filter(i => i.tipo === 'usinagem').map(i => ({
          id: i.id,
          tipo: 'usinagem' as const,
          descricao: i.descricao,
          codigo: i.codigo || '',
          quantidade: Number(i.quantidade),
          valorUnitario: Number(i.valor_unitario),
          valorTotal: Number(i.valor_total),
          detalhes: i.detalhes
        }))
      };

      // Buscar fotos do orçamento
      const { data: fotosRevisao } = await supabase
        .from('fotos_orcamento')
        .select('*')
        .eq('orcamento_id', revisao.orcamento_id)
        .eq('apresentar_orcamento', true);

      // ===== GERAR PDF USANDO A MESMA LÓGICA DO EXPORTARPDF =====
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
      const tableStartX = 20;
      const colDescricaoWidth = 70;
      const colQtdWidth = 18;
      const colCodigoWidth = 22;
      const colValorUnitWidth = 28;
      const colTotalWidth = 28;
      
      const colDescricao = tableStartX;
      const colQtd = colDescricao + colDescricaoWidth;
      const colCodigo = colQtd + colQtdWidth;
      const colValorUnit = colCodigo + colCodigoWidth;
      const colTotal = colValorUnit + colValorUnitWidth;

      // Função para adicionar detalhes decorativos
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

      // Adicionar logo
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

      // Cabeçalho
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(EMPRESA_INFO.nome, 20, yPosition + 5);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`CNPJ: ${EMPRESA_INFO.cnpj}`, 20, yPosition + 12);
      doc.text(`Tel: ${EMPRESA_INFO.telefone}`, 20, yPosition + 17);
      doc.text(`Email: ${EMPRESA_INFO.email}`, 20, yPosition + 22);
      
      doc.setDrawColor(220, 38, 38);
      doc.setLineWidth(1);
      doc.line(20, yPosition + 28, pageWidth - 20, yPosition + 28);
      
      doc.setFillColor(220, 38, 38);
      doc.triangle(pageWidth - 20, 10, pageWidth, 10, pageWidth, 40, 'F');
      
      yPosition = 48;
      
      // Título com número da revisão
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(220, 38, 38);
      doc.text("PROPOSTA COMERCIAL", pageWidth / 2, yPosition, { align: "center" });
      yPosition += 8;
      doc.setFontSize(12);
      doc.text(`REVISÃO ${revisao.numero_revisao}`, pageWidth / 2, yPosition, { align: "center" });
      doc.setTextColor(0, 0, 0);
      
      yPosition = 70;

      // Buscar CNPJ do cliente
      let cnpjCliente = '';
      if (revisao.cliente_id) {
        const { data: clienteData } = await supabase
          .from('clientes')
          .select('cnpj_cpf')
          .eq('id', revisao.cliente_id)
          .maybeSingle();
        
        if (clienteData) {
          cnpjCliente = clienteData.cnpj_cpf || '';
        }
      }

      // Informações do Cliente
      doc.setFillColor(220, 220, 220);
      doc.rect(20, yPosition, pageWidth - 40, 10, 'F');
      doc.setDrawColor(200, 200, 200);
      doc.rect(20, yPosition, pageWidth - 40, 10);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Informações do Cliente", pageWidth / 2, yPosition + 7, { align: "center" });
      yPosition += 10;
      
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      
      const colWidth = (pageWidth - 40) / 2;
      doc.setDrawColor(200, 200, 200);
      doc.rect(20, yPosition, colWidth, 8);
      doc.rect(20 + colWidth, yPosition, colWidth, 8);
      doc.text(`Nº Orçamento: ${revisao.numero} REV ${revisao.numero_revisao}`, 22, yPosition + 5.5);
      doc.text(`Data: ${new Date(revisao.data_revisao).toLocaleDateString('pt-BR')}`, 22 + colWidth, yPosition + 5.5);
      yPosition += 8;
      
      doc.rect(20, yPosition, pageWidth - 40, 8);
      doc.text(`Nome do Cliente: ${revisao.cliente_nome || 'N/A'}`, 22, yPosition + 5.5);
      yPosition += 8;
      
      doc.rect(20, yPosition, pageWidth - 40, 8);
      doc.text(`CNPJ: ${cnpjCliente || 'N/A'}`, 22, yPosition + 5.5);
      yPosition += 8;
      
      yPosition += 10;

      // Condições Comerciais
      const valorComDesconto = Number(revisao.valor) * (1 - (Number(revisao.desconto_percentual || 0) / 100));
      
      doc.setFillColor(220, 220, 220);
      doc.rect(20, yPosition, pageWidth - 40, 10, 'F');
      doc.setDrawColor(200, 200, 200);
      doc.rect(20, yPosition, pageWidth - 40, 10);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Condições Comerciais", pageWidth / 2, yPosition + 7, { align: "center" });
      yPosition += 10;
      
      const valorTotalFormatado = `R$ ${valorComDesconto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
      const condicaoPagamento = revisao.condicao_pagamento || 'A combinar';
      const assunto = revisao.assunto_proposta || revisao.equipamento || 'REFORMA/MANUTENÇÃO';
      const prazoEntrega = revisao.prazo_entrega || '5 dias úteis';
      const garantia = revisao.garantia === 'sem' 
        ? 'Sem Garantia'
        : revisao.garantia === '12'
        ? '12 meses'
        : revisao.garantia === '6'
        ? '6 meses'
        : '12 meses';
      const validadeProposta = revisao.validade_proposta 
        ? `${revisao.validade_proposta} dias` 
        : '30 dias';
      const frete = revisao.frete || 'CIF';
      
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      
      doc.setDrawColor(200, 200, 200);
      doc.rect(20, yPosition, pageWidth - 40, 8);
      doc.text(`Assunto: ${assunto}`, 22, yPosition + 5.5);
      yPosition += 8;
      
      const col3Width = (pageWidth - 40) / 3;
      doc.rect(20, yPosition, col3Width, 8);
      doc.rect(20 + col3Width, yPosition, col3Width, 8);
      doc.rect(20 + col3Width * 2, yPosition, col3Width, 8);
      doc.text(`Valor Total: ${valorTotalFormatado}`, 22, yPosition + 5.5);
      doc.text(`Condição Pagamento: ${condicaoPagamento}`, 22 + col3Width, yPosition + 5.5);
      doc.text(`Prazo Entrega: ${prazoEntrega}`, 22 + col3Width * 2, yPosition + 5.5);
      yPosition += 8;
      
      doc.rect(20, yPosition, col3Width, 8);
      doc.rect(20 + col3Width, yPosition, col3Width, 8);
      doc.rect(20 + col3Width * 2, yPosition, col3Width, 8);
      doc.text(`Garantia: ${garantia}`, 22, yPosition + 5.5);
      doc.text(`Frete: ${frete}`, 22 + col3Width, yPosition + 5.5);
      doc.text(`Validade Proposta: ${validadeProposta}`, 22 + col3Width * 2, yPosition + 5.5);
      yPosition += 8;
      yPosition += 10;

      // Tabela de Peças
      if (itensRevisaoOrganizados.pecas.length > 0) {
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

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setFillColor(220, 220, 220);
        doc.rect(20, yPosition, pageWidth - 40, 8, 'F');
        doc.setDrawColor(200, 200, 200);
        doc.rect(20, yPosition, pageWidth - 40, 8);

        doc.text('Descrição', colDescricao + 2, yPosition + 5.5);
        doc.text('Qtd.', colQtd + (colQtdWidth / 2), yPosition + 5.5, { align: 'center' });
        doc.text('Codigo', colCodigo + (colCodigoWidth / 2), yPosition + 5.5, { align: 'center' });
        doc.text('Valor Unitario', colValorUnit + colValorUnitWidth - 2, yPosition + 5.5, { align: 'right' });
        doc.text('Valor Total', colTotal + colTotalWidth - 2, yPosition + 5.5, { align: 'right' });
        yPosition += 8;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        let totalPecas = 0;

        itensRevisaoOrganizados.pecas.forEach((item, index) => {
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

          const desc = item.descricao.length > 40 ? item.descricao.substring(0, 38) + '...' : item.descricao;
          doc.text(desc, colDescricao + 2, yPosition + 5.5);
          doc.text(item.quantidade.toString(), colQtd + (colQtdWidth / 2), yPosition + 5.5, { align: 'center' });
          doc.text(item.codigo || '-', colCodigo + (colCodigoWidth / 2), yPosition + 5.5, { align: 'center' });
          
          const valorUnit = item.valorUnitario > 0 ? `R$ ${item.valorUnitario.toFixed(2).replace('.', ',')}` : '';
          doc.text(valorUnit, colValorUnit + colValorUnitWidth - 2, yPosition + 5.5, { align: 'right' });
          const valorTot = item.valorTotal > 0 ? `R$ ${item.valorTotal.toFixed(2).replace('.', ',')}` : '';
          doc.text(valorTot, colTotal + colTotalWidth - 2, yPosition + 5.5, { align: 'right' });
          totalPecas += item.valorTotal;

          yPosition += rowHeight;
        });

        yPosition += 5;
        const boxWidth = 50;
        const boxHeight = 8;
        const boxX = pageWidth - 20 - 25 - boxWidth;
        
        doc.setDrawColor(200, 200, 200);
        doc.rect(boxX, yPosition, boxWidth, boxHeight);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('Total de Peças', boxX + 2, yPosition + 5.5);
        
        const valorBoxX = boxX + boxWidth;
        doc.rect(valorBoxX, yPosition, 25, boxHeight);
        const totalPecasTexto = totalPecas > 0 ? `R$ ${totalPecas.toFixed(2).replace('.', ',')}` : '';
        doc.text(totalPecasTexto, valorBoxX + 23, yPosition + 5.5, { align: 'right' });
        
        yPosition += 15;
      }

      // Tabela de Serviços (mesma lógica)
      if (itensRevisaoOrganizados.servicos.length > 0) {
        const espacoNecessario = 10 + 8 + 16;
        if (yPosition + espacoNecessario > pageHeight - 30) {
          adicionarRodape();
          doc.addPage();
          yPosition = 20;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(220, 38, 38);
        doc.text('SERVIÇOS A EXECUTAR', 20, yPosition);
        doc.setTextColor(0, 0, 0);
        yPosition += 10;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setFillColor(220, 220, 220);
        doc.rect(20, yPosition, pageWidth - 40, 8, 'F');
        doc.setDrawColor(200, 200, 200);
        doc.rect(20, yPosition, pageWidth - 40, 8);

        doc.text('Descrição', colDescricao + 2, yPosition + 5.5);
        doc.text('Qtd.', colQtd + (colQtdWidth / 2), yPosition + 5.5, { align: 'center' });
        doc.text('Codigo', colCodigo + (colCodigoWidth / 2), yPosition + 5.5, { align: 'center' });
        doc.text('Valor Unitario', colValorUnit + colValorUnitWidth - 2, yPosition + 5.5, { align: 'right' });
        doc.text('Valor Total', colTotal + colTotalWidth - 2, yPosition + 5.5, { align: 'right' });
        yPosition += 8;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        let totalServicos = 0;

        itensRevisaoOrganizados.servicos.forEach((item, index) => {
          if (yPosition + 8 > pageHeight - 30) {
            adicionarRodape();
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

          const desc = item.descricao.length > 40 ? item.descricao.substring(0, 38) + '...' : item.descricao;
          doc.text(desc, colDescricao + 2, yPosition + 5.5);
          doc.text(item.quantidade.toString(), colQtd + (colQtdWidth / 2), yPosition + 5.5, { align: 'center' });
          doc.text(item.codigo || '-', colCodigo + (colCodigoWidth / 2), yPosition + 5.5, { align: 'center' });
          
          const valorUnit = item.valorUnitario > 0 ? `R$ ${item.valorUnitario.toFixed(2).replace('.', ',')}` : '';
          doc.text(valorUnit, colValorUnit + colValorUnitWidth - 2, yPosition + 5.5, { align: 'right' });
          const valorTot = item.valorTotal > 0 ? `R$ ${item.valorTotal.toFixed(2).replace('.', ',')}` : '';
          doc.text(valorTot, colTotal + colTotalWidth - 2, yPosition + 5.5, { align: 'right' });
          totalServicos += item.valorTotal;

          yPosition += rowHeight;
        });

        yPosition += 5;
        const boxWidth = 50;
        const boxHeight = 8;
        const boxX = pageWidth - 20 - 25 - boxWidth;
        
        doc.setDrawColor(200, 200, 200);
        doc.rect(boxX, yPosition, boxWidth, boxHeight);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('Total de Serviços', boxX + 2, yPosition + 5.5);
        
        const valorBoxX = boxX + boxWidth;
        doc.rect(valorBoxX, yPosition, 25, boxHeight);
        const totalServicosTexto = totalServicos > 0 ? `R$ ${totalServicos.toFixed(2).replace('.', ',')}` : '';
        doc.text(totalServicosTexto, valorBoxX + 23, yPosition + 5.5, { align: 'right' });
        
        yPosition += 15;
      }

      // Tabela de Usinagem (mesma lógica)
      if (itensRevisaoOrganizados.usinagem.length > 0) {
        const espacoNecessario = 10 + 8 + 16;
        if (yPosition + espacoNecessario > pageHeight - 30) {
          adicionarRodape();
          doc.addPage();
          yPosition = 20;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(220, 38, 38);
        doc.text('USINAGEM NECESSÁRIA', 20, yPosition);
        doc.setTextColor(0, 0, 0);
        yPosition += 10;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setFillColor(220, 220, 220);
        doc.rect(20, yPosition, pageWidth - 40, 8, 'F');
        doc.setDrawColor(200, 200, 200);
        doc.rect(20, yPosition, pageWidth - 40, 8);

        doc.text('Descrição', colDescricao + 2, yPosition + 5.5);
        doc.text('Qtd.', colQtd + (colQtdWidth / 2), yPosition + 5.5, { align: 'center' });
        doc.text('Codigo', colCodigo + (colCodigoWidth / 2), yPosition + 5.5, { align: 'center' });
        doc.text('Valor Unitario', colValorUnit + colValorUnitWidth - 2, yPosition + 5.5, { align: 'right' });
        doc.text('Valor Total', colTotal + colTotalWidth - 2, yPosition + 5.5, { align: 'right' });
        yPosition += 8;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        let totalUsinagem = 0;

        itensRevisaoOrganizados.usinagem.forEach((item, index) => {
          if (yPosition + 8 > pageHeight - 30) {
            adicionarRodape();
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

          const desc = item.descricao.length > 40 ? item.descricao.substring(0, 38) + '...' : item.descricao;
          doc.text(desc, colDescricao + 2, yPosition + 5.5);
          doc.text(item.quantidade.toString(), colQtd + (colQtdWidth / 2), yPosition + 5.5, { align: 'center' });
          doc.text(item.codigo || '-', colCodigo + (colCodigoWidth / 2), yPosition + 5.5, { align: 'center' });
          
          const valorUnit = item.valorUnitario > 0 ? `R$ ${item.valorUnitario.toFixed(2).replace('.', ',')}` : '';
          doc.text(valorUnit, colValorUnit + colValorUnitWidth - 2, yPosition + 5.5, { align: 'right' });
          const valorTot = item.valorTotal > 0 ? `R$ ${item.valorTotal.toFixed(2).replace('.', ',')}` : '';
          doc.text(valorTot, colTotal + colTotalWidth - 2, yPosition + 5.5, { align: 'right' });
          totalUsinagem += item.valorTotal;

          yPosition += rowHeight;
        });

        yPosition += 5;
        const boxWidth = 50;
        const boxHeight = 8;
        const boxX = pageWidth - 20 - 25 - boxWidth;
        
        doc.setDrawColor(200, 200, 200);
        doc.rect(boxX, yPosition, boxWidth, boxHeight);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('Total de Usinagem', boxX + 2, yPosition + 5.5);
        
        const valorBoxX = boxX + boxWidth;
        doc.rect(valorBoxX, yPosition, 25, boxHeight);
        const totalUsinagemTexto = totalUsinagem > 0 ? `R$ ${totalUsinagem.toFixed(2)}` : '';
        doc.text(totalUsinagemTexto, valorBoxX + 23, yPosition + 5.5, { align: 'right' });
        
        yPosition += 15;
      }

      // Adicionar fotos se existirem
      if (fotosRevisao && fotosRevisao.length > 0) {
        doc.addPage();
        let yPosFotos = 20;
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(220, 38, 38);
        doc.text('Fotos do Orçamento', 20, yPosFotos);
        doc.setTextColor(0, 0, 0);
        yPosFotos += 10;
        
        const fotosPorPagina = 4;
        const maxFotoWidth = 80;
        const maxFotoHeight = 55;
        const espacoHorizontal = 12;
        const espacoVertical = 12;
        
        for (let i = 0; i < fotosRevisao.length; i += fotosPorPagina) {
          if (i > 0) {
            doc.addPage();
            yPosFotos = 20;
          }
          
          const fotosPagina = fotosRevisao.slice(i, i + fotosPorPagina);
          
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
      }

      // Adicionar rodapés
      adicionarRodape();

      // Salvar PDF
      doc.save(`Orcamento_${revisao.numero.replace(/[^a-zA-Z0-9]/g, "_")}_REV${revisao.numero_revisao}.pdf`);
      
      toast({
        title: "PDF gerado com sucesso!",
        description: `Orçamento ${revisao.numero} REV ${revisao.numero_revisao}`
      });
    } catch (error) {
      console.error('Erro ao gerar PDF da revisão:', error);
      toast({
        title: "Erro",
        description: "Erro ao gerar PDF da revisão",
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

    // Definir posições das colunas da tabela - ORDEM CORRETA: Descrição → Qtd → Codigo → Valor Unitario → Valor Total
    const tableStartX = 20;
    const tableWidth = pageWidth - 50; // ~160mm para garantir margens adequadas
    
    // Definir larguras de cada coluna (ordem correta) - total 160mm
    const colDescricaoWidth = 70;      // Descrição (maior coluna)
    const colQtdWidth = 18;            // Qtd (pequena, centralizada)
    const colCodigoWidth = 22;         // Codigo (números)
    const colValorUnitWidth = 28;      // Valor Unitario
    const colTotalWidth = 28;          // Valor Total
    
    // Calcular posições iniciais (x) de cada coluna (da esquerda para direita)
    const colDescricao = tableStartX;
    const colQtd = colDescricao + colDescricaoWidth;
    const colCodigo = colQtd + colQtdWidth;
    const colValorUnit = colCodigo + colCodigoWidth;
    const colTotal = colValorUnit + colValorUnitWidth;

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
    } else if (dadosOrcamento.cliente) {
      // Buscar por nome como fallback (para orçamentos antigos sem cliente_id)
      const { data: clienteData } = await supabase
        .from('clientes')
        .select('cnpj_cpf')
        .eq('nome', dadosOrcamento.cliente)
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
    const validadeProposta = informacoesComerciais.validadeProposta 
      ? `${informacoesComerciais.validadeProposta} dias` 
      : '30 dias';
    
    const assunto = informacoesComerciais.assuntoProposta || dadosOrcamento.tag || 'REFORMA/MANUTENÇÃO';
    const prazoEntrega = informacoesComerciais.prazoEntrega || '5 dias úteis';
    const garantia = informacoesComerciais.garantia === 'sem' 
      ? 'Sem Garantia'
      : informacoesComerciais.garantia === '12'
      ? '12 meses'
      : informacoesComerciais.garantia === '6'
      ? '6 meses'
      : '12 meses';
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

      doc.text('Descrição', colDescricao + 2, yPosition + 5.5);
      doc.text('Qtd.', colQtd + (colQtdWidth / 2), yPosition + 5.5, { align: 'center' });
      doc.text('Codigo', colCodigo + (colCodigoWidth / 2), yPosition + 5.5, { align: 'center' });
      if (informacoesComerciais.mostrarValores !== false) {
        doc.text('Valor Unitario', colValorUnit + colValorUnitWidth - 2, yPosition + 5.5, { align: 'right' });
        doc.text('Valor Total', colTotal + colTotalWidth - 2, yPosition + 5.5, { align: 'right' });
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

          const desc = item.descricao.length > 40 ? item.descricao.substring(0, 38) + '...' : item.descricao;
        doc.text(desc, colDescricao + 2, yPosition + 5.5);
        doc.text(item.quantidade.toString(), colQtd + (colQtdWidth / 2), yPosition + 5.5, { align: 'center' });
        doc.text(item.codigo || '-', colCodigo + (colCodigoWidth / 2), yPosition + 5.5, { align: 'center' });
        
        if (informacoesComerciais.mostrarValores !== false) {
          const valorUnit = item.valorUnitario > 0 ? `R$ ${item.valorUnitario.toFixed(2).replace('.', ',')}` : '';
          doc.text(valorUnit, colValorUnit + colValorUnitWidth - 2, yPosition + 5.5, { align: 'right' });
          const valorTot = item.valorTotal > 0 ? `R$ ${item.valorTotal.toFixed(2).replace('.', ',')}` : '';
          doc.text(valorTot, colTotal + colTotalWidth - 2, yPosition + 5.5, { align: 'right' });
          totalPecas += item.valorTotal;
        }

        yPosition += rowHeight;
      });

      // Total das peças em box
      if (informacoesComerciais.mostrarValores !== false) {
        yPosition += 5;
        const boxWidth = 50;
        const boxHeight = 8;
        const boxX = pageWidth - 20 - 25 - boxWidth;
        
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
      // Verificar se há espaço suficiente para pelo menos o título + cabeçalho + 2 linhas
      const espacoNecessario = 10 + 8 + 16; // ~34mm
      if (yPosition + espacoNecessario > pageHeight - 30) {
        adicionarRodape();
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

      doc.text('Descrição', colDescricao + 2, yPosition + 5.5);
      doc.text('Qtd.', colQtd + (colQtdWidth / 2), yPosition + 5.5, { align: 'center' });
      doc.text('Codigo', colCodigo + (colCodigoWidth / 2), yPosition + 5.5, { align: 'center' });
      if (informacoesComerciais.mostrarValores !== false) {
        doc.text('Valor Unitario', colValorUnit + colValorUnitWidth - 2, yPosition + 5.5, { align: 'right' });
        doc.text('Valor Total', colTotal + colTotalWidth - 2, yPosition + 5.5, { align: 'right' });
      }
      yPosition += 8;

      // Linhas de dados
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      let totalServicos = 0;

      itensAnalise.servicos.forEach((item, index) => {
        // Verificar se há espaço para a linha (altura 8mm + margem)
        if (yPosition + 8 > pageHeight - 30) {
          adicionarRodape();
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

          const desc = item.descricao.length > 40 ? item.descricao.substring(0, 38) + '...' : item.descricao;
        doc.text(desc, colDescricao + 2, yPosition + 5.5);
        doc.text(item.quantidade.toString(), colQtd + (colQtdWidth / 2), yPosition + 5.5, { align: 'center' });
        doc.text(item.codigo || '-', colCodigo + (colCodigoWidth / 2), yPosition + 5.5, { align: 'center' });
        
        if (informacoesComerciais.mostrarValores !== false) {
          const valorUnit = item.valorUnitario > 0 ? `R$ ${item.valorUnitario.toFixed(2).replace('.', ',')}` : '';
          doc.text(valorUnit, colValorUnit + colValorUnitWidth - 2, yPosition + 5.5, { align: 'right' });
          const valorTot = item.valorTotal > 0 ? `R$ ${item.valorTotal.toFixed(2).replace('.', ',')}` : '';
          doc.text(valorTot, colTotal + colTotalWidth - 2, yPosition + 5.5, { align: 'right' });
          totalServicos += item.valorTotal;
        }

        yPosition += rowHeight;
      });

      // Total dos serviços em box
      if (informacoesComerciais.mostrarValores !== false) {
        yPosition += 5;
        const boxWidth = 50;
        const boxHeight = 8;
        const boxX = pageWidth - 20 - 25 - boxWidth;
        
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
      // Verificar se há espaço suficiente para pelo menos o título + cabeçalho + 2 linhas
      const espacoNecessario = 10 + 8 + 16; // ~34mm
      if (yPosition + espacoNecessario > pageHeight - 30) {
        adicionarRodape();
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

      doc.text('Descrição', colDescricao + 2, yPosition + 5.5);
      doc.text('Qtd.', colQtd + (colQtdWidth / 2), yPosition + 5.5, { align: 'center' });
      doc.text('Codigo', colCodigo + (colCodigoWidth / 2), yPosition + 5.5, { align: 'center' });
      if (informacoesComerciais.mostrarValores !== false) {
        doc.text('Valor Unitario', colValorUnit + colValorUnitWidth - 2, yPosition + 5.5, { align: 'right' });
        doc.text('Valor Total', colTotal + colTotalWidth - 2, yPosition + 5.5, { align: 'right' });
      }
      yPosition += 8;

      // Linhas de dados
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      let totalUsinagem = 0;

      itensAnalise.usinagem.forEach((item, index) => {
        // Verificar se há espaço para a linha (altura 8mm + margem)
        if (yPosition + 8 > pageHeight - 30) {
          adicionarRodape();
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

        const desc = item.descricao.length > 40 ? item.descricao.substring(0, 38) + '...' : item.descricao;
        doc.text(desc, colDescricao + 2, yPosition + 5.5);
        doc.text(item.quantidade.toString(), colQtd + (colQtdWidth / 2), yPosition + 5.5, { align: 'center' });
        doc.text(item.codigo || '-', colCodigo + (colCodigoWidth / 2), yPosition + 5.5, { align: 'center' });
        
        if (informacoesComerciais.mostrarValores !== false) {
          const valorUnit = item.valorUnitario > 0 ? `R$ ${item.valorUnitario.toFixed(2).replace('.', ',')}` : '';
          doc.text(valorUnit, colValorUnit + colValorUnitWidth - 2, yPosition + 5.5, { align: 'right' });
          const valorTot = item.valorTotal > 0 ? `R$ ${item.valorTotal.toFixed(2).replace('.', ',')}` : '';
          doc.text(valorTot, colTotal + colTotalWidth - 2, yPosition + 5.5, { align: 'right' });
          totalUsinagem += item.valorTotal;
        }

        yPosition += rowHeight;
      });

      // Total da usinagem em box
      if (informacoesComerciais.mostrarValores !== false) {
        yPosition += 5;
        const boxWidth = 50;
        const boxHeight = 8;
        const boxX = pageWidth - 20 - 25 - boxWidth;
        
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
        const espacoVertical = 18; // Aumentado para acomodar legendas
        
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
                  
                  // Adicionar legenda abaixo da foto se existir
                  if (fotosPagina[j].legenda) {
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(8);
                    doc.setTextColor(80, 80, 80);
                    
                    const legendaY = yPos + finalHeight + yOffset + 3;
                    const legendaTexto = fotosPagina[j].legenda.substring(0, 50);
                    doc.text(legendaTexto, xPos + (maxFotoWidth / 2), legendaY, { 
                      align: 'center',
                      maxWidth: maxFotoWidth - 4
                    });
                    
                    doc.setTextColor(0, 0, 0);
                  }
                  
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
            {t('novoOrcamento.back')}
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              {ordemServicoId ? t('novoOrcamento.pageTitleServiceOrder') : 
               analiseId ? t('novoOrcamento.pageTitleAnalysis') : t('novoOrcamento.pageTitle')}
            </h2>
            <p className="text-muted-foreground">
              {t('novoOrcamento.pageSubtitle')}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Informações Básicas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                {t('novoOrcamento.quoteData')}
              </CardTitle>
              <CardDescription>
                {t('novoOrcamento.quoteDataDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="numeroOrdem">{t('novoOrcamento.quoteNumber')} *</Label>
                  <Input 
                    id="numeroOrdem" 
                    value={dadosOrcamento.numeroOrdem} 
                    onChange={e => setDadosOrcamento(prev => ({
                      ...prev,
                      numeroOrdem: e.target.value
                    }))} 
                    className="bg-muted" 
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('novoOrcamento.quoteNumberAuto')}
                  </p>
                </div>
                <div>
                  <Label htmlFor="tipoOrdem">{t('novoOrcamento.orderType')} *</Label>
                  <Select 
                    value={dadosOrcamento.tipoOrdem} 
                    onValueChange={value => setDadosOrcamento(prev => ({
                      ...prev,
                      tipoOrdem: value
                    }))}
                    disabled={loadingCategorias}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('novoOrcamento.selectPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {receitasOperacionais.length === 0 ? (
                        <SelectItem value="sem_categoria" disabled>
                          {t('novoOrcamento.noRevenueCategories')}
                        </SelectItem>
                      ) : (
                        receitasOperacionais.map(categoria => (
                          <SelectItem key={categoria.id} value={categoria.id}>
                            {categoria.codigo} - {categoria.nome}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('novoOrcamento.operationalRevenueCategories')}
                  </p>
                </div>
                
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cliente">{t('novoOrcamento.client')} *</Label>
                  {ordemServicoId ? (
                    <Input 
                      id="cliente" 
                      value={dadosOrcamento.cliente} 
                      disabled 
                      className="bg-muted"
                    />
                  ) : (
                    <>
                      <Select value={dadosOrcamento.clienteId} onValueChange={value => {
                        const clienteSelecionado = clientes.find(c => c.id === value);
                        setDadosOrcamento(prev => ({
                          ...prev,
                          clienteId: value,
                          cliente: clienteSelecionado?.nome || ''
                        }));
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder={t('novoOrcamento.selectPlaceholder')} />
                        </SelectTrigger>
                        <SelectContent>
                          {clientes.map(cliente => <SelectItem key={cliente.id} value={cliente.id}>
                              {cliente.nome}{cliente.cnpj_cpf ? ` - ${cliente.cnpj_cpf.slice(-4)}` : ''}
                            </SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setModalNovoCliente(true)}
                        className="w-full mt-2"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        {t('novoOrcamento.registerNewClient')}
                      </Button>
                    </>
                  )}
                </div>
                <div>
                  <Label htmlFor="solicitante">{t('novoOrcamento.requester')}</Label>
                  <Input id="solicitante" value={dadosOrcamento.solicitante} onChange={e => setDadosOrcamento(prev => ({
                  ...prev,
                  solicitante: e.target.value
                }))} placeholder={t('novoOrcamento.requesterPlaceholder')} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dataAbertura">{t('novoOrcamento.openingDate')} *</Label>
                  <Input id="dataAbertura" type="date" value={dadosOrcamento.dataAbertura} onChange={e => setDadosOrcamento(prev => ({
                  ...prev,
                  dataAbertura: e.target.value
                }))} />
                </div>
                <div>
                  <Label htmlFor="numeroNota">{t('novoOrcamento.invoiceNumber')} *</Label>
                  <Input id="numeroNota" value={dadosOrcamento.numeroNota} onChange={e => setDadosOrcamento(prev => ({
                  ...prev,
                  numeroNota: e.target.value
                }))} placeholder={t('novoOrcamento.invoicePlaceholder')} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="numeroSerie">{t('novoOrcamento.referenceOrder')}</Label>
                  <Input id="numeroSerie" value={dadosOrcamento.numeroSerie} onChange={e => setDadosOrcamento(prev => ({
                  ...prev,
                  numeroSerie: e.target.value
                }))} placeholder={t('novoOrcamento.referenceOrderPlaceholder')} className="bg-muted" disabled />
                </div>
                <div>
                  <Label htmlFor="tag">{t('novoOrcamento.tag')}</Label>
                  <Input id="tag" value={dadosOrcamento.tag} onChange={e => setDadosOrcamento(prev => ({
                  ...prev,
                  tag: e.target.value
                }))} placeholder={t('novoOrcamento.tagPlaceholder')} />
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
              {t('novoOrcamento.equipmentPhotos')}
            </CardTitle>
            <CardDescription>
              {t('novoOrcamento.equipmentPhotosDesc')}
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
                    {t('novoOrcamento.clickToUpload')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('novoOrcamento.uploadFormats')}
                  </p>
                </label>
                {uploadingFoto && (
                  <p className="text-sm text-primary mt-3 animate-pulse">{t('novoOrcamento.uploading')}</p>
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
                          {t('novoOrcamento.presentInQuote')}
                        </label>
                      </div>
                      <div className="px-1">
                        <Input
                          placeholder={t('novoOrcamento.photoCaption')}
                          value={foto.legenda || ''}
                          onChange={(e) => atualizarLegenda(foto.id, e.target.value)}
                          className="text-xs h-8"
                        />
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
                        {t('novoOrcamento.addMorePhotos')}
                      </p>
                    </label>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dados Técnicos - Apenas quando baseado em ordem de serviço */}
        {ordemServicoId && dadosTecnicos && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                {t('novoOrcamento.technicalData')}
              </CardTitle>
              <CardDescription>
                {t('novoOrcamento.technicalDataDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                {dadosTecnicos.pressaoTrabalho && (
                  <div>
                    <Label className="text-muted-foreground text-sm">{t('novoOrcamento.workPressure')}</Label>
                    <p className="font-medium">{dadosTecnicos.pressaoTrabalho}</p>
                  </div>
                )}
                {dadosTecnicos.temperaturaTrabalho && (
                  <div>
                    <Label className="text-muted-foreground text-sm">{t('novoOrcamento.workTemperature')}</Label>
                    <p className="font-medium">{dadosTecnicos.temperaturaTrabalho}</p>
                  </div>
                )}
                {dadosTecnicos.fluidoTrabalho && (
                  <div>
                    <Label className="text-muted-foreground text-sm">{t('novoOrcamento.workFluid')}</Label>
                    <p className="font-medium">{dadosTecnicos.fluidoTrabalho}</p>
                  </div>
                )}
                {dadosTecnicos.camisa && (
                  <div>
                    <Label className="text-muted-foreground text-sm">{t('novoOrcamento.shirt')}</Label>
                    <p className="font-medium">{dadosTecnicos.camisa}</p>
                  </div>
                )}
                {dadosTecnicos.hasteComprimento && (
                  <div>
                    <Label className="text-muted-foreground text-sm">{t('novoOrcamento.rodLength')}</Label>
                    <p className="font-medium">{dadosTecnicos.hasteComprimento}</p>
                  </div>
                )}
                {dadosTecnicos.curso && (
                  <div>
                    <Label className="text-muted-foreground text-sm">{t('novoOrcamento.stroke')}</Label>
                    <p className="font-medium">{dadosTecnicos.curso}</p>
                  </div>
                )}
                {dadosTecnicos.conexaoA && (
                  <div>
                    <Label className="text-muted-foreground text-sm">{t('novoOrcamento.connectionA')}</Label>
                    <p className="font-medium">{dadosTecnicos.conexaoA}</p>
                  </div>
                )}
                {dadosTecnicos.conexaoB && (
                  <div>
                    <Label className="text-muted-foreground text-sm">{t('novoOrcamento.connectionB')}</Label>
                    <p className="font-medium">{dadosTecnicos.conexaoB}</p>
                  </div>
                )}
                {dadosTecnicos.localInstalacao && (
                  <div>
                    <Label className="text-muted-foreground text-sm">{t('novoOrcamento.installationLocation')}</Label>
                    <p className="font-medium">{dadosTecnicos.localInstalacao}</p>
                  </div>
                )}
                {dadosTecnicos.potencia && (
                  <div>
                    <Label className="text-muted-foreground text-sm">{t('novoOrcamento.power')}</Label>
                    <p className="font-medium">{dadosTecnicos.potencia}</p>
                  </div>
                )}
                {dadosTecnicos.ambienteTrabalho && (
                  <div>
                    <Label className="text-muted-foreground text-sm">{t('novoOrcamento.workEnvironment')}</Label>
                    <p className="font-medium">{dadosTecnicos.ambienteTrabalho}</p>
                  </div>
                )}
                {dadosTecnicos.categoriaEquipamento && (
                  <div>
                    <Label className="text-muted-foreground text-sm">{t('novoOrcamento.equipmentCategory')}</Label>
                    <p className="font-medium">{dadosTecnicos.categoriaEquipamento}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

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
              {t('novoOrcamento.parts')}
            </CardTitle>
            <CardDescription>
              {analiseId ? t('novoOrcamento.partsDescAnalysis') : t('novoOrcamento.partsDescNew')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {itensAnalise.pecas.length > 0 ? <>
                <Table>
                  <TableHeader>
                      <TableRow>
                      <TableHead>{t('novoOrcamento.part')}</TableHead>
                      <TableHead>{t('novoOrcamento.code')}</TableHead>
                      <TableHead className="text-center">{t('novoOrcamento.qty')}</TableHead>
                      <TableHead className="text-right">{t('novoOrcamento.unitValue')}</TableHead>
                      <TableHead className="text-right">{t('novoOrcamento.total')}</TableHead>
                      <TableHead className="text-center">{t('novoOrcamento.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itensAnalise.pecas.map(peca => <TableRow key={peca.id}>
                        <TableCell>
                          <Input value={peca.descricao} onChange={e => atualizarDescricaoItem('pecas', peca.id, e.target.value)} placeholder={t('novoOrcamento.partDescPlaceholder')} className="min-w-[200px]" />
                        </TableCell>
                        <TableCell>
                          <Input 
                            value={peca.codigo || ''} 
                            onChange={e => setItensAnalise(prev => ({
                              ...prev,
                              pecas: prev.pecas.map(p => 
                                p.id === peca.id 
                                  ? { ...p, codigo: e.target.value } 
                                  : p
                              )
                            }))} 
                            placeholder={t('novoOrcamento.codePlaceholder')} 
                            className="min-w-[100px]" 
                          />
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
                      {t('novoOrcamento.partsTotal')}: R$ {itensAnalise.pecas.reduce((acc, item) => acc + item.valorTotal, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                )}
                <div className="mt-4 pt-4 border-t">
                  <Button variant="outline" onClick={() => adicionarItemAdicional('pecas')} className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    {t('novoOrcamento.addPart')}
                  </Button>
                </div>
              </> : <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">{t('novoOrcamento.noPartsAdded')}</p>
                <Button variant="outline" onClick={() => adicionarItemAdicional('pecas')} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  {t('novoOrcamento.addFirstPart')}
                </Button>
              </div>}
          </CardContent>
        </Card>

        {/* Serviços */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-primary" />
              {t('novoOrcamento.services')}
            </CardTitle>
            <CardDescription>
              {analiseId ? t('novoOrcamento.servicesDescAnalysis') : t('novoOrcamento.servicesDescNew')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {itensAnalise.servicos.length > 0 ? <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('novoOrcamento.service')}</TableHead>
                      <TableHead>{t('novoOrcamento.code')}</TableHead>
                      <TableHead className="text-center">{t('novoOrcamento.qty')}</TableHead>
                      <TableHead className="text-right">{t('novoOrcamento.unitValue')}</TableHead>
                      <TableHead className="text-right">{t('novoOrcamento.total')}</TableHead>
                      <TableHead className="text-center">{t('novoOrcamento.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itensAnalise.servicos.map(servico => <TableRow key={servico.id}>
                        <TableCell>
                          <Input value={servico.descricao} onChange={e => atualizarDescricaoItem('servicos', servico.id, e.target.value)} placeholder={t('novoOrcamento.serviceDescPlaceholder')} className="min-w-[250px]" />
                        </TableCell>
                        <TableCell>
                          <Input value={servico.codigo || ''} onChange={e => setItensAnalise(prev => ({
                      ...prev,
                      servicos: prev.servicos.map(s => s.id === servico.id ? {
                        ...s,
                        codigo: e.target.value
                      } : s)
                    }))} placeholder={t('novoOrcamento.codePlaceholder')} className="min-w-[100px]" />
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
                      {t('novoOrcamento.servicesTotal')}: R$ {itensAnalise.servicos.reduce((acc, item) => acc + item.valorTotal, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                )}
                <div className="mt-4 pt-4 border-t">
                  <Button variant="outline" onClick={() => adicionarItemAdicional('servicos')} className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    {t('novoOrcamento.addService')}
                  </Button>
                </div>
              </> : <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">{t('novoOrcamento.noServicesAdded')}</p>
                <Button variant="outline" onClick={() => adicionarItemAdicional('servicos')} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  {t('novoOrcamento.addFirstService')}
                </Button>
              </div>}
          </CardContent>
        </Card>

        {/* Usinagem */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              {t('novoOrcamento.machining')}
            </CardTitle>
            <CardDescription>
              {analiseId ? t('novoOrcamento.machiningDescAnalysis') : t('novoOrcamento.machiningDescNew')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {itensAnalise.usinagem.length > 0 ? <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('novoOrcamento.machining')}</TableHead>
                      <TableHead>{t('novoOrcamento.code')}</TableHead>
                      <TableHead className="text-center">{t('novoOrcamento.qty')}</TableHead>
                      <TableHead className="text-right">{t('novoOrcamento.unitValue')}</TableHead>
                      <TableHead className="text-right">{t('novoOrcamento.total')}</TableHead>
                      <TableHead className="text-center">{t('novoOrcamento.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itensAnalise.usinagem.map(usinagem => <TableRow key={usinagem.id}>
                        <TableCell>
                          <Input value={usinagem.descricao} onChange={e => atualizarDescricaoItem('usinagem', usinagem.id, e.target.value)} placeholder={t('novoOrcamento.machiningDescPlaceholder')} className="min-w-[250px]" />
                        </TableCell>
                        <TableCell>
                          <Input value={usinagem.codigo || ''} onChange={e => setItensAnalise(prev => ({
                      ...prev,
                      usinagem: prev.usinagem.map(u => u.id === usinagem.id ? {
                        ...u,
                        codigo: e.target.value
                      } : u)
                    }))} placeholder={t('novoOrcamento.codePlaceholder')} className="min-w-[100px]" />
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
                      {t('novoOrcamento.machiningTotal')}: R$ {itensAnalise.usinagem.reduce((acc, item) => acc + item.valorTotal, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                )}
                <div className="mt-4 pt-4 border-t">
                  <Button variant="outline" onClick={() => adicionarItemAdicional('usinagem')} className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    {t('novoOrcamento.addMachining')}
                  </Button>
                </div>
              </> : <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">{t('novoOrcamento.noMachiningAdded')}</p>
                <Button variant="outline" onClick={() => adicionarItemAdicional('usinagem')} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  {t('novoOrcamento.addFirstMachining')}
                </Button>
              </div>}
          </CardContent>
        </Card>

        {/* Informações Comerciais */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              {t('novoOrcamento.commercialInfo')}
            </CardTitle>
            <CardDescription>
              {t('novoOrcamento.commercialInfoDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="valorOrcamento">{t('novoOrcamento.quoteValue')}</Label>
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
                        title: t('novoOrcamento.valueRecalculated'),
                        description: `${t('novoOrcamento.valueUpdatedTo')} R$ ${totalCalculado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                      });
                    }}
                    className="whitespace-nowrap"
                  >
                    <Calculator className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div>
                <Label htmlFor="desconto">{t('novoOrcamento.discount')}</Label>
                <Input id="desconto" type="number" min="0" max="100" step="0.5" value={informacoesComerciais.desconto} onChange={e => setInformacoesComerciais(prev => ({
                ...prev,
                desconto: parseFloat(e.target.value) || 0
              }))} />
              </div>
              <div>
                <Label htmlFor="valorComDesconto">{t('novoOrcamento.valueWithDiscount')}</Label>
                <Input id="valorComDesconto" value={`R$ ${calcularValorComDesconto().toLocaleString('pt-BR', {
                minimumFractionDigits: 2
              })}`} disabled className="bg-muted font-medium" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="assuntoProposta">{t('novoOrcamento.proposalSubject')}</Label>
                <Input id="assuntoProposta" value={informacoesComerciais.assuntoProposta} onChange={e => setInformacoesComerciais(prev => ({
                ...prev,
                assuntoProposta: e.target.value
              }))} placeholder={t('novoOrcamento.proposalSubjectPlaceholder')} maxLength={100} />
              </div>
              <div>
                <Label htmlFor="frete">{t('novoOrcamento.freightType')}</Label>
                <Select value={informacoesComerciais.frete} onValueChange={value => setInformacoesComerciais(prev => ({
                ...prev,
                frete: value
              }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CIF">{t('novoOrcamento.freightCIF')}</SelectItem>
                    <SelectItem value="FOB">{t('novoOrcamento.freightFOB')}</SelectItem>
                    <SelectItem value="EXW">{t('novoOrcamento.freightEXW')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="condicaoPagamento">{t('novoOrcamento.paymentCondition')}</Label>
                <Input id="condicaoPagamento" value={informacoesComerciais.condicaoPagamento} onChange={e => setInformacoesComerciais(prev => ({
                ...prev,
                condicaoPagamento: e.target.value
              }))} placeholder={t('novoOrcamento.paymentConditionPlaceholder')} />
              </div>
              <div>
                <Label htmlFor="prazoEntrega">{t('novoOrcamento.deliveryTime')}</Label>
                <Input 
                  id="prazoEntrega" 
                  type="text"
                  value={informacoesComerciais.prazoEntrega} 
                  onChange={e => setInformacoesComerciais(prev => ({
                    ...prev,
                    prazoEntrega: e.target.value
                  }))} 
                  placeholder={t('novoOrcamento.deliveryTimePlaceholder')}
                />
              </div>
              <div>
                <Label htmlFor="garantia">{t('novoOrcamento.warranty')}</Label>
                <Select value={informacoesComerciais.garantia} onValueChange={value => setInformacoesComerciais(prev => ({
                ...prev,
                garantia: value
              }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24">{t('novoOrcamento.warranty24')}</SelectItem>
                    <SelectItem value="12">{t('novoOrcamento.warranty12')}</SelectItem>
                    <SelectItem value="6">{t('novoOrcamento.warranty6')}</SelectItem>
                    <SelectItem value="sem">{t('novoOrcamento.noWarranty')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="validadeProposta">{t('novoOrcamento.proposalValidity')}</Label>
                <Input 
                  id="validadeProposta" 
                  type="number"
                  min="1"
                  value={informacoesComerciais.validadeProposta} 
                  onChange={e => setInformacoesComerciais(prev => ({
                    ...prev,
                    validadeProposta: e.target.value
                  }))} 
                  placeholder={t('novoOrcamento.proposalValidityPlaceholder')}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="observacoes">{t('novoOrcamento.observations')}</Label>
              <Textarea id="observacoes" value={dadosOrcamento.observacoes} onChange={e => setDadosOrcamento(prev => ({
              ...prev,
              observacoes: e.target.value
            }))} placeholder={t('novoOrcamento.observationsPlaceholder')} rows={3} />
            </div>
          </CardContent>
        </Card>

        {/* Histórico de Revisões - mostrar apenas em modo de edição */}
        {mostrarHistorico && dadosOrcamento.id && (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                📚 {t('novoOrcamento.revisionHistory')}
              </CardTitle>
              <CardDescription>
                {t('novoOrcamento.revisionHistoryDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {carregandoHistorico ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t('novoOrcamento.loadingHistory')}
                </p>
              ) : historicoOrcamento.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t('novoOrcamento.noRevisionsFound')}
                </p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {historicoOrcamento.map((revisao) => (
                    <div
                      key={revisao.id}
                      className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="font-mono">
                            REV {revisao.numero_revisao}
                          </Badge>
                          <span className="text-sm font-medium">
                            {revisao.numero}
                          </span>
                          <Badge variant="secondary">
                            {revisao.status}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <span className="font-medium">Data:</span> {new Date(revisao.data_revisao).toLocaleString("pt-BR")}
                          <span className="mx-2">•</span>
                          <span className="font-medium">Valor:</span> {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(revisao.valor)}
                          {revisao.desconto_percentual > 0 && (
                            <>
                              <span className="mx-2">•</span>
                              <span className="font-medium">Desconto:</span> {revisao.desconto_percentual}%
                            </>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleBaixarPDFRevisao(revisao)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        {t('novoOrcamento.downloadPdf')}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Botões de Ação */}
        <div className="flex justify-end gap-4 pt-6">
          <Button variant="outline" onClick={() => navigate("/orcamentos")}>
            {t('novoOrcamento.cancel')}
          </Button>
          <Button onClick={exportarPDF} variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            {t('novoOrcamento.exportPdf')}
          </Button>
          <Button onClick={salvarOrcamento} className="flex items-center gap-2 bg-gradient-primary hover:bg-primary-hover">
            <Save className="h-4 w-4" />
            {t('novoOrcamento.saveQuote')}
          </Button>
        </div>
      </div>

      {/* Modal de Cadastro de Novo Cliente */}
      <Dialog open={modalNovoCliente} onOpenChange={setModalNovoCliente}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('novoOrcamento.registerClient')}</DialogTitle>
            <DialogDescription>
              {t('novoOrcamento.registerClientDesc')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4">
            <div>
              <Label>{t('novoOrcamento.nameRazaoSocial')} *</Label>
              <Input 
                value={novoClienteData.nome}
                onChange={(e) => setNovoClienteData(prev => ({ ...prev, nome: e.target.value }))}
                placeholder={t('novoOrcamento.nameRazaoSocialPlaceholder')}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('novoOrcamento.cnpjCpf')}</Label>
                <Input 
                  value={novoClienteData.cnpj_cpf}
                  onChange={(e) => setNovoClienteData(prev => ({ ...prev, cnpj_cpf: e.target.value }))}
                  placeholder="00.000.000/0000-00"
                />
              </div>
              <div>
                <Label>{t('novoOrcamento.phone')}</Label>
                <Input 
                  value={novoClienteData.telefone}
                  onChange={(e) => setNovoClienteData(prev => ({ ...prev, telefone: e.target.value }))}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>
            
            <div>
              <Label>E-mail</Label>
              <Input 
                type="email"
                value={novoClienteData.email}
                onChange={(e) => setNovoClienteData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="cliente@exemplo.com"
              />
            </div>
            
            <div>
              <Label>Endereço</Label>
              <Input 
                value={novoClienteData.endereco}
                onChange={(e) => setNovoClienteData(prev => ({ ...prev, endereco: e.target.value }))}
                placeholder="Rua, número, complemento"
              />
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Cidade</Label>
                <Input 
                  value={novoClienteData.cidade}
                  onChange={(e) => setNovoClienteData(prev => ({ ...prev, cidade: e.target.value }))}
                  placeholder="São Paulo"
                />
              </div>
              <div>
                <Label>Estado</Label>
                <Input 
                  value={novoClienteData.estado}
                  onChange={(e) => setNovoClienteData(prev => ({ ...prev, estado: e.target.value.toUpperCase() }))}
                  maxLength={2}
                  placeholder="SP"
                />
              </div>
              <div>
                <Label>CEP</Label>
                <Input 
                  value={novoClienteData.cep}
                  onChange={(e) => setNovoClienteData(prev => ({ ...prev, cep: e.target.value }))}
                  placeholder="00000-000"
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalNovoCliente(false)}>
              {t('novoOrcamento.cancel')}
            </Button>
            <Button onClick={handleSalvarNovoCliente}>
              <Plus className="h-4 w-4 mr-2" />
              {t('novoOrcamento.saveClient')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>;
}