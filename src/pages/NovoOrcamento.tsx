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
import { Calculator, FileText, DollarSign, ArrowLeft, Wrench, Settings, Package, Plus, Trash2, Download, Save, Camera } from "lucide-react";
import { useState, useEffect } from "react";
import { useClientes } from "@/hooks/use-clientes";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import jsPDF from "jspdf";
interface ItemOrcamento {
  id: string;
  tipo: 'peca' | 'servico' | 'usinagem';
  descricao: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
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
        setDadosOrcamento({
          id: orcamentoParaEdicao.id,
          tipoOrdem: 'reforma', // Você pode ajustar baseado no tipo
          numeroOrdem: orcamentoParaEdicao.numero,
          urgencia: false,
          cliente: orcamentoParaEdicao.cliente_nome,
          tag: orcamentoParaEdicao.equipamento,
          solicitante: '',
          dataAbertura: new Date(orcamentoParaEdicao.data_criacao).toISOString().split('T')[0],
          numeroNota: '',
          numeroSerie: '',
          observacoes: orcamentoParaEdicao.observacoes || '',
          status: orcamentoParaEdicao.status
        });

        setInformacoesComerciais(prev => ({
          ...prev,
          valorTotal: orcamentoParaEdicao.valor || 0,
          valorComDesconto: orcamentoParaEdicao.valor || 0
        }));

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
                cliente_id
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
              solicitante: '',
              numeroNota: ordemServico.recebimentos?.nota_fiscal || '',
              numeroSerie: ordemServico.recebimentos?.numero_serie || '',
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

  // Atualizar valor total automaticamente
  useEffect(() => {
    const total = calcularTotalGeral();
    const valorComDesconto = calcularValorComDesconto();
    setInformacoesComerciais(prev => ({
      ...prev,
      valorTotal: total,
      valorComDesconto
    }));
  }, [itensAnalise, informacoesComerciais.desconto]);
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

    const valorFinal = calcularValorComDesconto();
    
    try {
      // Criar dados para inserir no Supabase
      const orcamentoData = {
        numero: dadosOrcamento.numeroOrdem,
        cliente_nome: dadosOrcamento.cliente,
        equipamento: dadosOrcamento.tag || 'Equipamento não especificado',
        descricao: dadosOrcamento.observacoes || '',
        valor: valorFinal,
        status: 'pendente',
        observacoes: `Tipo: ${dadosOrcamento.tipoOrdem} | Solicitante: ${dadosOrcamento.solicitante} | Nota: ${dadosOrcamento.numeroNota} | Série: ${dadosOrcamento.numeroSerie}`,
        ordem_servico_id: ordemServicoId || null
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

      console.log('Orçamento salvo no Supabase:', data);
      
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
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    let yPosition = 20;

    // Cabeçalho
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("ORÇAMENTO", pageWidth / 2, yPosition, {
      align: "center"
    });
    yPosition += 15;

    // Informações básicas
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Número: ${dadosOrcamento.numeroOrdem}`, 20, yPosition);
    doc.text(`Data: ${new Date().toLocaleDateString("pt-BR")}`, pageWidth - 60, yPosition);
    yPosition += 10;
    doc.text(`Cliente: ${dadosOrcamento.cliente}`, 20, yPosition);
    yPosition += 8;
    doc.text(`Tipo Ordem: ${dadosOrcamento.tipoOrdem}`, 20, yPosition);
    yPosition += 8;
    doc.text(`Nº da Ordem: ${dadosOrcamento.numeroOrdem}`, 20, yPosition);
    yPosition += 8;
    if (dadosOrcamento.tag) {
      doc.text(`TAG: ${dadosOrcamento.tag}`, 20, yPosition);
      yPosition += 8;
    }
    if (dadosOrcamento.numeroNota) {
      doc.text(`Nº da Nota: ${dadosOrcamento.numeroNota}`, 20, yPosition);
      yPosition += 8;
    }
    yPosition += 10;

    // Função para adicionar tabela de itens
    const adicionarTabelaItens = (titulo: string, itens: ItemOrcamento[]) => {
      if (itens.length === 0) return;

      // Verificar se há espaço na página
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }
      doc.setFont("helvetica", "bold");
      doc.text(titulo, 20, yPosition);
      yPosition += 10;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);

      // Cabeçalho da tabela
      const headers = ["Descrição", "Qtd", "Valor Unit.", "Total"];
      const colWidths = [100, 20, 30, 30];
      let xPos = 20;
      doc.setFont("helvetica", "bold");
      headers.forEach((header, index) => {
        doc.text(header, xPos, yPosition);
        xPos += colWidths[index];
      });
      yPosition += 8;

      // Linha separadora
      doc.line(20, yPosition - 2, pageWidth - 20, yPosition - 2);
      doc.setFont("helvetica", "normal");

      // Itens da tabela
      itens.forEach(item => {
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 20;
        }
        xPos = 20;
        const descricao = item.descricao.length > 35 ? item.descricao.substring(0, 32) + "..." : item.descricao;
        doc.text(descricao, xPos, yPosition);
        xPos += colWidths[0];
        doc.text(item.quantidade.toString(), xPos, yPosition, {
          align: "right"
        });
        xPos += colWidths[1];
        doc.text(`R$ ${item.valorUnitario.toFixed(2)}`, xPos, yPosition, {
          align: "right"
        });
        xPos += colWidths[2];
        doc.text(`R$ ${item.valorTotal.toFixed(2)}`, xPos, yPosition, {
          align: "right"
        });
        yPosition += 8;
      });
      yPosition += 10;
    };

    // Adicionar tabelas
    adicionarTabelaItens("PEÇAS", itensAnalise.pecas);
    adicionarTabelaItens("SERVIÇOS", itensAnalise.servicos);
    adicionarTabelaItens("USINAGEM", itensAnalise.usinagem);

    // Totais
    if (yPosition > 220) {
      doc.addPage();
      yPosition = 20;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    const valorTotal = calcularTotalGeral();
    const valorComDesconto = calcularValorComDesconto();
    yPosition += 10;
    doc.text(`Valor Total: R$ ${valorTotal.toLocaleString("pt-BR", {
      minimumFractionDigits: 2
    })}`, pageWidth - 80, yPosition, {
      align: "right"
    });
    if (informacoesComerciais.desconto > 0) {
      yPosition += 10;
      doc.text(`Desconto (${informacoesComerciais.desconto}%): R$ ${(valorTotal - valorComDesconto).toLocaleString("pt-BR", {
        minimumFractionDigits: 2
      })}`, pageWidth - 80, yPosition, {
        align: "right"
      });
      yPosition += 10;
      doc.text(`Valor Final: R$ ${valorComDesconto.toLocaleString("pt-BR", {
        minimumFractionDigits: 2
      })}`, pageWidth - 80, yPosition, {
        align: "right"
      });
    }

    // Informações comerciais
    yPosition += 20;
    doc.setFont("helvetica", "bold");
    doc.text("CONDIÇÕES COMERCIAIS", 20, yPosition);
    yPosition += 10;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    if (informacoesComerciais.condicaoPagamento) {
      doc.text(`Condição de Pagamento: ${informacoesComerciais.condicaoPagamento}`, 20, yPosition);
      yPosition += 8;
    }
    if (informacoesComerciais.prazoEntrega) {
      doc.text(`Prazo de Entrega: ${informacoesComerciais.prazoEntrega} dias`, 20, yPosition);
      yPosition += 8;
    }
    if (informacoesComerciais.prazoMeses) {
      doc.text(`Garantia: ${informacoesComerciais.prazoMeses} meses`, 20, yPosition);
      yPosition += 8;
    }
    if (informacoesComerciais.freteIncluso) {
      doc.text("Frete: Incluso (CIF)", 20, yPosition);
      yPosition += 8;
    }

    // Fotos da análise
    if (analiseData && (analiseData.fotosChegada?.length > 0 || analiseData.fotosAnalise?.length > 0)) {
      // Função para adicionar imagens ao PDF
      const adicionarImagemPDF = async (imageUrl: string, titulo: string, maxWidth = 80, maxHeight = 60) => {
        try {
          return new Promise<void>(resolve => {
            const img = new Image();
            img.onload = () => {
              // Calcular dimensões mantendo proporção
              let width = img.width;
              let height = img.height;
              const ratio = Math.min(maxWidth / width, maxHeight / height);
              width = width * ratio;
              height = height * ratio;

              // Verificar se há espaço na página
              if (yPosition + height + 15 > 270) {
                doc.addPage();
                yPosition = 20;
              }

              // Adicionar título da imagem
              doc.setFont('helvetica', 'bold');
              doc.setFontSize(10);
              doc.text(titulo, 20, yPosition);
              yPosition += 8;

              // Adicionar imagem
              doc.addImage(img, 'JPEG', 20, yPosition, width, height);
              yPosition += height + 10;
              resolve();
            };
            img.onerror = () => resolve(); // Continue mesmo se a imagem falhar
            img.src = imageUrl;
          });
        } catch (error) {
          console.error('Erro ao adicionar imagem ao PDF:', error);
        }
      };

      // Adicionar fotos de chegada
      if (analiseData.fotosChegada && analiseData.fotosChegada.some((foto: string) => foto)) {
        // Verificar espaço para o título
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text("FOTOS DE CHEGADA DO EQUIPAMENTO", 20, yPosition);
        yPosition += 15;
        for (let i = 0; i < analiseData.fotosChegada.length; i++) {
          if (analiseData.fotosChegada[i]) {
            await adicionarImagemPDF(analiseData.fotosChegada[i], `Foto de Chegada ${i + 1}`);
          }
        }
      }

      // Adicionar fotos da análise
      if (analiseData.fotosAnalise && analiseData.fotosAnalise.some((foto: string) => foto)) {
        // Verificar espaço para o título
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text("FOTOS DA ANÁLISE TÉCNICA", 20, yPosition);
        yPosition += 15;
        for (let i = 0; i < analiseData.fotosAnalise.length; i++) {
          if (analiseData.fotosAnalise[i]) {
            await adicionarImagemPDF(analiseData.fotosAnalise[i], `Foto da Análise ${i + 1}`);
          }
        }
      }
    }

    // Observações
    if (dadosOrcamento.observacoes) {
      // Verificar espaço para observações
      if (yPosition > 220) {
        doc.addPage();
        yPosition = 20;
      }
      yPosition += 10;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("OBSERVAÇÕES", 20, yPosition);
      yPosition += 10;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const observacoes = dadosOrcamento.observacoes.split("\n");
      observacoes.forEach(linha => {
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 20;
        }
        doc.text(linha, 20, yPosition);
        yPosition += 8;
      });
    }

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
                    <Select value={dadosOrcamento.cliente} onValueChange={value => setDadosOrcamento(prev => ({
                      ...prev,
                      cliente: value
                    }))}>
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
                  <Label htmlFor="numeroSerie">Nº de Série *</Label>
                  <Input id="numeroSerie" value={dadosOrcamento.numeroSerie} onChange={e => setDadosOrcamento(prev => ({
                  ...prev,
                  numeroSerie: e.target.value
                }))} placeholder="Número de série do equipamento" />
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

        {/* Fotos da Análise */}
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
                <Input id="valorOrcamento" value={`R$ ${informacoesComerciais.valorTotal.toLocaleString('pt-BR', {
                minimumFractionDigits: 2
              })}`} disabled className="bg-muted font-medium" />
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="condicaoPagamento">Condição de Pagamento</Label>
                <Input id="condicaoPagamento" value={informacoesComerciais.condicaoPagamento} onChange={e => setInformacoesComerciais(prev => ({
                ...prev,
                condicaoPagamento: e.target.value
              }))} placeholder="Ex: 21 DDL" />
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
              <div>
                <Label htmlFor="prazoEntrega">Prazo de Entrega (dias)</Label>
                <Input id="prazoEntrega" type="number" min="1" value={informacoesComerciais.prazoEntrega} onChange={e => setInformacoesComerciais(prev => ({
                ...prev,
                prazoEntrega: e.target.value
              }))} />
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