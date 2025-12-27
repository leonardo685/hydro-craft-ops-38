import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, FileText, Edit, Check, X, Copy, Search, Download, DollarSign, CalendarIcon, TrendingUp, TrendingDown, XCircle, FileCheck, Link2 } from "lucide-react";
import { LineChart, Line, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { AprovarOrcamentoModal } from "@/components/AprovarOrcamentoModal";
import { PrecificacaoModal } from "@/components/PrecificacaoModal";
import { VincularOrdensModal } from "@/components/VincularOrdensModal";
import jsPDF from "jspdf";
import mecHidroLogo from "@/assets/mec-hidro-logo.jpg";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { translations } from "@/i18n/translations";

// Custom Tooltip for mini charts (valores monetários)
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-border bg-background/95 p-2 text-sm shadow-md backdrop-blur-sm">
        <p className="text-foreground">{`Valor: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payload[0].value)}`}</p>
      </div>
    );
  }
  return null;
};

// Custom Tooltip for count values (valores absolutos)
const CustomTooltipCount = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const count = payload[0].value;
    return (
      <div className="rounded-lg border border-border bg-background/95 p-2 text-sm shadow-md backdrop-blur-sm">
        <p className="text-foreground">{`Quantidade: ${count} orçamento${count !== 1 ? 's' : ''}`}</p>
      </div>
    );
  }
  return null;
};

export default function Orcamentos() {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [ordensServico, setOrdensServico] = useState<any[]>([]);
  const [ordensFiltered, setOrdensFiltered] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrdemServico, setSelectedOrdemServico] = useState<any>(null);
  const [orcamentos, setOrcamentos] = useState<any[]>([]);
  const navigate = useNavigate();
  const { t, language } = useLanguage();

  // Estados para filtros
  const [dataInicio, setDataInicio] = useState<Date | undefined>();
  const [dataFim, setDataFim] = useState<Date | undefined>();
  const [filtroCliente, setFiltroCliente] = useState("");
  const [filtroNumero, setFiltroNumero] = useState("");

  useEffect(() => {
    carregarOrdensServico();
    carregarOrcamentos();
  }, []);

  const carregarOrdensServico = async () => {
    try {
      const { data, error } = await supabase
        .from('ordens_servico')
        .select(`
          *,
          recebimentos:recebimento_id (
            numero_ordem
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao carregar ordens de serviço:', error);
        toast.error(t('orcamentos.errorLoadingOrders'));
        return;
      }

      console.log('Ordens de serviço carregadas:', data);
      setOrdensServico(data || []);
      setOrdensFiltered(data || []);
    } catch (error) {
      console.error('Erro ao carregar ordens de serviço:', error);
      toast.error(t('orcamentos.errorLoadingOrders'));
    }
  };

  const carregarOrcamentos = async () => {
    try {
      const { data, error } = await supabase
        .from('orcamentos')
        .select(`
          *,
          itens_orcamento(*)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao carregar orçamentos:', error);
        toast.error(t('orcamentos.errorLoadingQuotes'));
        return;
      }

      // Buscar ordens de serviço vinculadas a cada orçamento
      const { data: ordensVinculadas } = await supabase
        .from('ordens_servico')
        .select(`
          id,
          orcamento_id,
          numero_ordem,
          recebimentos:recebimento_id (
            numero_ordem
          )
        `)
        .not('orcamento_id', 'is', null);

      // Mapear ordens vinculadas por orcamento_id
      const ordensPorOrcamento: Record<string, any[]> = {};
      ordensVinculadas?.forEach(ordem => {
        if (ordem.orcamento_id) {
          if (!ordensPorOrcamento[ordem.orcamento_id]) {
            ordensPorOrcamento[ordem.orcamento_id] = [];
          }
          ordensPorOrcamento[ordem.orcamento_id].push({
            id: ordem.id,
            numero_ordem: ordem.recebimentos?.numero_ordem || ordem.numero_ordem
          });
        }
      });

      // Adicionar ordens vinculadas aos orçamentos
      const orcamentosComOrdens = data?.map(orc => ({
        ...orc,
        ordens_vinculadas: ordensPorOrcamento[orc.id] || []
      })) || [];

      console.log('Orçamentos carregados:', orcamentosComOrdens);
      setOrcamentos(orcamentosComOrdens);
    } catch (error) {
      console.error('Erro ao carregar orçamentos:', error);
      toast.error(t('orcamentos.errorLoadingQuotes'));
    }
  };

  useEffect(() => {
    if (searchTerm) {
      const filtered = ordensServico.filter((ordem) =>
        ordem.cliente_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ordem.equipamento?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ordem.recebimentos?.numero_ordem?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setOrdensFiltered(filtered);
    } else {
      setOrdensFiltered(ordensServico);
    }
  }, [searchTerm, ordensServico]);

  const handleCreateOrcamentoFromOrdemServico = () => {
    if (selectedOrdemServico) {
      navigate(`/orcamentos/novo?ordemServicoId=${selectedOrdemServico.id}`);
      setIsSheetOpen(false);
    } else {
      toast.error(t('orcamentos.selectOrderFirst'));
    }
  };

  const handleCreateNewOrcamento = () => {
    navigate('/orcamentos/novo');
    setIsSheetOpen(false);
  };

  const [showAprovarModal, setShowAprovarModal] = useState(false);
  const [orcamentoParaAprovar, setOrcamentoParaAprovar] = useState<any>(null);
  const [showPrecificacaoModal, setShowPrecificacaoModal] = useState(false);
  const [orcamentoParaPrecificar, setOrcamentoParaPrecificar] = useState<any>(null);
  const [showVincularModal, setShowVincularModal] = useState(false);
  const [orcamentoParaVincular, setOrcamentoParaVincular] = useState<any>(null);

  const handleVincularOrdens = (orcamento: any) => {
    setOrcamentoParaVincular(orcamento);
    setShowVincularModal(true);
  };

  const handleAprovarOrcamento = (orcamento: any) => {
    setOrcamentoParaAprovar(orcamento);
    setShowAprovarModal(true);
  };

  const confirmarAprovacao = async () => {
    try {
      await carregarOrcamentos();
      setShowAprovarModal(false);
      setOrcamentoParaAprovar(null);
    } catch (error) {
      console.error('Erro ao recarregar orçamentos:', error);
    }
  };

  const handleReprovarOrcamento = async (id: string) => {
    try {
      const { error } = await supabase
        .from('orcamentos')
        .update({ status: 'rejeitado' })
        .eq('id', id);

      if (error) {
        console.error('Erro ao reprovar orçamento:', error);
        toast.error('Erro ao reprovar orçamento');
        return;
      }

      await carregarOrcamentos();
      toast(t('orcamentos.quoteRejected'), {
        description: t('orcamentos.quoteRejectedDesc'),
      });
    } catch (error) {
      console.error('Erro ao reprovar orçamento:', error);
      toast.error(t('orcamentos.errorRejectingQuote'));
    }
  };

  const editarOrcamento = (orcamento: any) => {
    console.log('🔧 Editando orçamento - Dados enviados:', {
      id: orcamento.id,
      numero: orcamento.numero,
      cliente_id: orcamento.cliente_id,
      cliente_nome: orcamento.cliente_nome,
      status: orcamento.status,
      objetoCompleto: orcamento
    });
    navigate('/orcamentos/novo', { state: { orcamento } });
  };

  const abrirPrecificacao = (orcamento: any) => {
    setOrcamentoParaPrecificar(orcamento);
    setShowPrecificacaoModal(true);
  };

  // Função para aplicar filtros
  const aplicarFiltros = (orcamentosLista: any[]) => {
    return orcamentosLista.filter((orc) => {
      // Filtro por cliente
      if (filtroCliente && !orc.cliente_nome?.toLowerCase().includes(filtroCliente.toLowerCase())) {
        return false;
      }
      
      // Filtro por número
      if (filtroNumero && !orc.numero?.toLowerCase().includes(filtroNumero.toLowerCase())) {
        return false;
      }
      
      // Filtro por data
      if (dataInicio || dataFim) {
        const dataOrcamento = new Date(orc.data_criacao);
        
        if (dataInicio && dataOrcamento < dataInicio) {
          return false;
        }
        
        if (dataFim) {
          const dataFimAjustada = new Date(dataFim);
          dataFimAjustada.setHours(23, 59, 59, 999);
          if (dataOrcamento > dataFimAjustada) {
            return false;
          }
        }
      }
      
      return true;
    });
  };

  const gerarPDFOrcamento = async (orcamento: any, language: 'pt-BR' | 'en' = 'pt-BR') => {
    try {
      const EMPRESA_INFO = {
        nome: "MEC-HIDRO MECANICA E HIDRAULICA LTDA",
        cnpj: "03.328.334/0001-87",
        telefone: "(19) 3026-6227",
        email: "contato@mechidro.com.br"
      };

      // Get translations based on language
      const pdfT = translations[language].pdf;
      const locale = language === 'en' ? 'en-US' : 'pt-BR';
      const currency = language === 'en' ? 'USD' : 'BRL';
      
      const formatCurrency = (value: number) => {
        return value.toLocaleString(locale, { style: 'currency', currency });
      };
      
      const formatDate = (date: Date) => {
        return date.toLocaleDateString(locale);
      };

      // Buscar dados do orçamento
      const { data: itensData } = await supabase
        .from('itens_orcamento')
        .select('*')
        .eq('orcamento_id', orcamento.id);

      // Buscar fotos
      let fotosData: any[] = [];
      if (orcamento.ordem_servico_id) {
        const { data: osData } = await supabase
          .from('ordens_servico')
          .select('recebimento_id')
          .eq('id', orcamento.ordem_servico_id)
          .maybeSingle();
        
        if (osData?.recebimento_id) {
          const { data: fotos } = await supabase
            .from('fotos_equipamentos')
            .select('*')
            .eq('recebimento_id', osData.recebimento_id)
            .eq('apresentar_orcamento', true);
          fotosData = fotos || [];
        }
      } else {
        const { data: fotos } = await supabase
          .from('fotos_orcamento')
          .select('*')
          .eq('orcamento_id', orcamento.id)
          .eq('apresentar_orcamento', true);
        fotosData = fotos || [];
      }

      // Separar itens por tipo
      const pecas = itensData?.filter(i => i.tipo === 'peca') || [];
      const servicos = itensData?.filter(i => i.tipo === 'servico') || [];
      const usinagem = itensData?.filter(i => i.tipo === 'usinagem') || [];

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      let yPosition = 10;
      let currentPage = 1;

      // Função para adicionar detalhes decorativos (triângulo vermelho)
      const adicionarDetalheDecorativo = () => {
        doc.setFillColor(220, 38, 38);
        doc.triangle(pageWidth - 20, 8, pageWidth - 5, 8, pageWidth - 5, 23, 'F');
      };

      // Função para adicionar rodapé
      const adicionarRodape = (numeroPagina: number) => {
        const rodapeY = pageHeight - 15;
        
        // Triângulos decorativos no canto inferior direito
        doc.setFillColor(220, 38, 38);
        doc.triangle(pageWidth - 30, pageHeight - 5, pageWidth - 15, pageHeight - 5, pageWidth - 15, pageHeight - 20, 'F');
        doc.setFillColor(0, 0, 0);
        doc.triangle(pageWidth - 15, pageHeight - 5, pageWidth - 5, pageHeight - 5, pageWidth - 5, pageHeight - 15, 'F');
        
        // Número da página
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        doc.text(`${pdfT.page} ${numeroPagina}`, pageWidth / 2, rodapeY, { align: "center" });
        doc.text(`${pdfT.generatedOn}: ${formatDate(new Date())}`, 20, rodapeY);
        doc.setTextColor(0, 0, 0);
      };

      // Função para criar tabelas formatadas
      const criarTabela = (
        headers: string[],
        rows: any[][],
        startY: number,
        columnWidths: number[]
      ): number => {
        let y = startY;
        const minRowHeight = 8;
        const headerHeight = 10;
        const cellPadding = 2;
        const lineHeight = 4;

        // Verificar se precisa de nova página para o cabeçalho
        if (y + headerHeight > pageHeight - 30) {
          doc.addPage();
          currentPage++;
          adicionarRodape(currentPage - 1);
          y = 20;
        }

        // Desenhar cabeçalho
        doc.setFillColor(128, 128, 128);
        doc.rect(20, y, pageWidth - 40, headerHeight, 'F');
        
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(255, 255, 255);
        
        let xPos = 20;
        headers.forEach((header, index) => {
          doc.text(header, xPos + cellPadding, y + 7);
          xPos += columnWidths[index];
        });
        
        y += headerHeight;
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "normal");

        // Desenhar linhas
        rows.forEach((row, rowIndex) => {
          // Calcular altura necessária para esta linha
          let maxLines = 1;
          row.forEach((cell, cellIndex) => {
            const text = String(cell);
            const maxWidth = columnWidths[cellIndex] - cellPadding * 2;
            const textLines = doc.splitTextToSize(text, maxWidth);
            maxLines = Math.max(maxLines, textLines.length);
          });
          
          const rowHeight = Math.max(minRowHeight, maxLines * lineHeight + cellPadding * 2);
          
          // Verificar se precisa de nova página
          if (y + rowHeight > pageHeight - 30) {
            adicionarRodape(currentPage);
            doc.addPage();
            currentPage++;
            y = 20;
            
            // Redesenhar cabeçalho na nova página
            doc.setFillColor(128, 128, 128);
            doc.rect(20, y, pageWidth - 40, headerHeight, 'F');
            doc.setFont("helvetica", "bold");
            doc.setTextColor(255, 255, 255);
            xPos = 20;
            headers.forEach((header, index) => {
              doc.text(header, xPos + cellPadding, y + 7);
              xPos += columnWidths[index];
            });
            y += headerHeight;
            doc.setTextColor(0, 0, 0);
            doc.setFont("helvetica", "normal");
          }

          // Alternar cor de fundo (zebrado)
          if (rowIndex % 2 === 0) {
            doc.setFillColor(245, 245, 245);
            doc.rect(20, y, pageWidth - 40, rowHeight, 'F');
          }

          // Desenhar células com quebra de linha
          xPos = 20;
          row.forEach((cell, cellIndex) => {
            const align = cellIndex >= row.length - 2 ? 'right' : 'left';
            const text = String(cell);
            const maxWidth = columnWidths[cellIndex] - cellPadding * 2;
            const textLines = doc.splitTextToSize(text, maxWidth);
            
            textLines.forEach((line: string, lineIndex: number) => {
              const textY = y + 5 + (lineIndex * lineHeight);
              if (align === 'right') {
                doc.text(line, xPos + columnWidths[cellIndex] - cellPadding, textY, { align: 'right' });
              } else {
                doc.text(line, xPos + cellPadding, textY);
              }
            });
            
            xPos += columnWidths[cellIndex];
          });

          // Bordas
          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.1);
          doc.rect(20, y, pageWidth - 40, rowHeight);
          
          y += rowHeight;
        });

        return y;
      };

      // Função para desenhar célula com quebra automática de linha
      const desenharCelulaComQuebraLinha = (
        texto: string,
        x: number,
        y: number,
        largura: number,
        alturaMinima: number = 8
      ): number => {
        const maxWidth = largura - 4; // padding de 2 em cada lado
        const lineHeight = 4;
        const cellPadding = 2;
        
        // Quebrar texto em linhas
        const textLines = doc.splitTextToSize(texto, maxWidth);
        const alturaCalculada = Math.max(alturaMinima, textLines.length * lineHeight + cellPadding * 2);
        
        // Desenhar célula
        doc.setDrawColor(200, 200, 200);
        doc.rect(x, y, largura, alturaCalculada);
        
        // Desenhar texto linha por linha
        textLines.forEach((line: string, index: number) => {
          const textY = y + 5 + (index * lineHeight);
          doc.text(line, x + cellPadding, textY);
        });
        
        return alturaCalculada;
      };

      // === CABEÇALHO ===
      // Logo
      try {
        doc.addImage(mecHidroLogo, 'JPEG', pageWidth - 50, 8, 35, 20);
      } catch (error) {
        console.error('Erro ao carregar logo:', error);
      }

      // Informações da empresa (lado esquerdo)
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(EMPRESA_INFO.nome, 20, 15);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(`CNPJ: ${EMPRESA_INFO.cnpj}`, 20, 20);
      doc.text(`Tel: ${EMPRESA_INFO.telefone} | Email: ${EMPRESA_INFO.email}`, 20, 24);

      // Linha vermelha decorativa
      doc.setDrawColor(220, 38, 38);
      doc.setLineWidth(1);
      doc.line(20, 28, pageWidth - 20, 28);

      // Triângulo decorativo
      adicionarDetalheDecorativo();

      // === TÍTULO ===
      yPosition = 40;
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(220, 38, 38);
      doc.text(pdfT.commercialProposal, pageWidth / 2, yPosition, { align: "center" });
      
      // Adicionar indicação de revisão no título (se houver)
      if (orcamento.numero_revisao) {
        yPosition += 8;
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(220, 38, 38);
        doc.text(`(${pdfT.revision} ${orcamento.numero_revisao})`, pageWidth / 2, yPosition, { align: "center" });
      }
      
      doc.setTextColor(0, 0, 0);

      // === INFORMAÇÕES DO CLIENTE ===
      yPosition = 55;
      
      // Buscar CNPJ do cliente usando cliente_id
      let cnpjCliente = '';
      if (orcamento.cliente_id) {
        const { data: clienteData } = await supabase
          .from('clientes')
          .select('cnpj_cpf')
          .eq('id', orcamento.cliente_id)
          .maybeSingle();
        
        if (clienteData) {
          cnpjCliente = clienteData.cnpj_cpf || '';
        }
      } else if (orcamento.cliente_nome) {
        // Fallback: buscar por nome (para orçamentos antigos)
        const { data: clienteData } = await supabase
          .from('clientes')
          .select('cnpj_cpf')
          .eq('nome', orcamento.cliente_nome)
          .maybeSingle();
        
        if (clienteData) {
          cnpjCliente = clienteData.cnpj_cpf || '';
        }
      }
      
      // Título centralizado "Informações do Cliente"
      doc.setFillColor(220, 220, 220);
      doc.rect(20, yPosition, pageWidth - 40, 10, 'F');
      doc.setDrawColor(200, 200, 200);
      doc.rect(20, yPosition, pageWidth - 40, 10);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text(pdfT.clientInfo, pageWidth / 2, yPosition + 7, { align: "center" });
      yPosition += 10;
      
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      
      // Primeira linha: Nº Orçamento + Data
      const colWidth = (pageWidth - 40) / 2;
      
      doc.setDrawColor(200, 200, 200);
      doc.rect(20, yPosition, colWidth, 8);
      doc.rect(20 + colWidth, yPosition, colWidth, 8);
      
      // Adicionar indicação de revisão no número do orçamento
      const numeroExibicao = orcamento.numero_revisao 
        ? `${orcamento.numero} REV${orcamento.numero_revisao}`
        : orcamento.numero || pdfT.na;
      
      doc.text(`${pdfT.quoteNumber}: ${numeroExibicao}`, 22, yPosition + 5.5);
      doc.text(`${pdfT.date}: ${formatDate(new Date())}`, 22 + colWidth, yPosition + 5.5);
      yPosition += 8;
      
      // Segunda linha: Nome do Cliente com quebra automática
      const alturaCliente = desenharCelulaComQuebraLinha(
        `${pdfT.clientName}: ${orcamento.cliente_nome || pdfT.na}`,
        20,
        yPosition,
        pageWidth - 40
      );
      yPosition += alturaCliente;
      
      // Terceira linha: CNPJ (altura fixa, geralmente curto)
      doc.setDrawColor(200, 200, 200);
      doc.rect(20, yPosition, pageWidth - 40, 8);
      doc.text(`${pdfT.taxId}: ${cnpjCliente || pdfT.na}`, 22, yPosition + 5.5);
      yPosition += 8;

      // Quarta linha: NF de Entrada e Ordem Referência (duas colunas) - sempre exibir
      doc.setDrawColor(200, 200, 200);
      doc.rect(20, yPosition, colWidth, 8);
      doc.rect(20 + colWidth, yPosition, colWidth, 8);
      
      doc.text(`${pdfT.entryInvoice}: ${orcamento.numero_nota_entrada || pdfT.na}`, 22, yPosition + 5.5);
      doc.text(`${pdfT.referenceOrder}: ${orcamento.ordem_referencia || pdfT.na}`, 22 + colWidth, yPosition + 5.5);
      
      yPosition += 8;

      // === CONDIÇÕES COMERCIAIS ===
      yPosition += 10;
      
      // Verificar se precisa de nova página
      if (yPosition + 40 > pageHeight - 30) {
        adicionarRodape(currentPage);
        doc.addPage();
        currentPage++;
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
      doc.text(pdfT.commercialConditions, pageWidth / 2, yPosition + 7, { align: "center" });
      yPosition += 10;
      
      const valorTotal = formatCurrency(Number(orcamento.valor || 0));
      const prazo = orcamento.condicao_pagamento || (orcamento.prazo_pagamento ? `${orcamento.prazo_pagamento} DDL` : (language === 'en' ? 'To be arranged' : 'A combinar'));
      const validade = orcamento.validade_proposta 
        ? `${orcamento.validade_proposta} ${pdfT.days}`
        : `30 ${pdfT.days}`;
      
      const assunto = orcamento.assunto_proposta || orcamento.equipamento || (language === 'en' ? 'REFORM/MAINTENANCE' : 'REFORMA/MANUTENÇÃO');
      const prazoEntrega = orcamento.prazo_entrega || `5 ${pdfT.businessDays}`;
          const garantia = orcamento.garantia === 'sem' 
            ? pdfT.noWarranty
            : orcamento.garantia === '24'
            ? `24 ${pdfT.months}`
            : orcamento.garantia === '12'
            ? `12 ${pdfT.months}`
            : orcamento.garantia === '6'
            ? `6 ${pdfT.months}`
            : `12 ${pdfT.months}`;
      const frete = orcamento.frete || 'CIF';
      
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      
      // Primeira linha: Assunto com quebra automática de linha
      const alturaAssunto = desenharCelulaComQuebraLinha(
        `${pdfT.subject}: ${assunto}`,
        20,
        yPosition,
        pageWidth - 40,
        8
      );
      yPosition += alturaAssunto;
      
      // Segunda linha: Valor Total + Condição Pagamento + Prazo Entrega
      const col3Width = (pageWidth - 40) / 3;
      const alturaLinha2 = Math.max(
        desenharCelulaComQuebraLinha(`${pdfT.totalValue}: ${valorTotal}`, 20, yPosition, col3Width, 8),
        desenharCelulaComQuebraLinha(`${pdfT.paymentTerms}: ${prazo}`, 20 + col3Width, yPosition, col3Width, 8),
        desenharCelulaComQuebraLinha(`${pdfT.deliveryTime}: ${prazoEntrega}`, 20 + col3Width * 2, yPosition, col3Width, 8)
      );
      yPosition += alturaLinha2;
      
      // Terceira linha: Garantia + Frete + Validade Proposta
      const alturaLinha3 = Math.max(
        desenharCelulaComQuebraLinha(`${pdfT.warranty}: ${garantia}`, 20, yPosition, col3Width, 8),
        desenharCelulaComQuebraLinha(`${pdfT.freight}: ${frete}`, 20 + col3Width, yPosition, col3Width, 8),
        desenharCelulaComQuebraLinha(`${pdfT.proposalValidity}: ${validade}`, 20 + col3Width * 2, yPosition, col3Width, 8)
      );
      yPosition += alturaLinha3;

      // === OBSERVAÇÕES ===
      if (orcamento.descricao && orcamento.descricao.trim()) {
        yPosition += 10;
        
        // Verificar se precisa de nova página
        if (yPosition + 40 > pageHeight - 30) {
          adicionarRodape(currentPage);
          doc.addPage();
          currentPage++;
          yPosition = 20;
        }
        
        // Título "Observações"
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(220, 38, 38);
        doc.text(pdfT.observations, 20, yPosition);
        doc.setTextColor(0, 0, 0);
        yPosition += 5;
        
        // Caixa com as observações
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        
        const maxWidth = pageWidth - 44; // 20 margem esquerda + 20 margem direita + 4 padding
        const observacoesText = orcamento.descricao.trim();
        const observacoesLines = doc.splitTextToSize(observacoesText, maxWidth);
        
        const lineHeight = 5;
        const boxPadding = 5;
        const boxHeight = (observacoesLines.length * lineHeight) + (boxPadding * 2);
        
        // Verificar se a caixa completa cabe na página
        if (yPosition + boxHeight > pageHeight - 30) {
          adicionarRodape(currentPage);
          doc.addPage();
          currentPage++;
          yPosition = 20;
        }
        
        // Desenhar caixa
        doc.setDrawColor(200, 200, 200);
        doc.setFillColor(250, 250, 250);
        doc.rect(20, yPosition, pageWidth - 40, boxHeight, 'FD');
        
        // Adicionar texto das observações
        let textY = yPosition + boxPadding + 4;
        observacoesLines.forEach((line: string) => {
          doc.text(line, 22, textY);
          textY += lineHeight;
        });
        
        yPosition += boxHeight + 2;
      }

      // === PEÇAS NECESSÁRIAS ===
      if (pecas.length > 0) {
        yPosition += 10;
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(220, 38, 38);
        doc.text(pdfT.requiredParts, 20, yPosition);
        doc.setTextColor(0, 0, 0);
        yPosition += 5;

        const pecasRows = pecas.map(item => {
          const valorUnit = Number(item.valor_unitario || 0);
          const valorTot = Number(item.valor_total || 0);
          return [
            item.codigo || '-',
            item.descricao || '-',
            Number(item.quantidade || 0).toFixed(0),
            valorUnit > 0 ? formatCurrency(valorUnit) : '',
            valorTot > 0 ? formatCurrency(valorTot) : ''
          ];
        });

        yPosition = criarTabela(
          [pdfT.code, pdfT.description, pdfT.qty, pdfT.unitPrice, pdfT.total],
          pecasRows,
          yPosition,
          [20, 60, 15, 25, 25]
        );

        // Total de Peças em box
        const totalPecas = pecas.reduce((acc, item) => acc + Number(item.valor_total || 0), 0);
        if (yPosition + 10 > pageHeight - 30) {
          adicionarRodape(currentPage);
          doc.addPage();
          currentPage++;
          yPosition = 20;
        }
        
        yPosition += 5;
        const boxWidth = 50;
        const boxHeight = 8;
        const boxX = pageWidth - 20 - 25 - boxWidth;
        
        doc.setDrawColor(200, 200, 200);
        doc.rect(boxX, yPosition, boxWidth, boxHeight);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text(pdfT.partsTotal, boxX + 2, yPosition + 5.5);
        
        const valorBoxX = boxX + boxWidth;
        doc.rect(valorBoxX, yPosition, 25, boxHeight);
        const totalPecasTexto = totalPecas > 0 ? formatCurrency(totalPecas) : '';
        doc.text(totalPecasTexto, valorBoxX + 23, yPosition + 5.5, { align: 'right' });
        
        yPosition += 10;
      }

      // === SERVIÇOS A EXECUTAR ===
      if (servicos.length > 0) {
        yPosition += 10;
        
        // Verificar se precisa de nova página
        if (yPosition + 30 > pageHeight - 30) {
          adicionarRodape(currentPage);
          doc.addPage();
          currentPage++;
          yPosition = 20;
        }
        
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(220, 38, 38);
        doc.text(pdfT.servicesToPerform, 20, yPosition);
        doc.setTextColor(0, 0, 0);
        yPosition += 5;

        const servicosRows = servicos.map(item => {
          const valorUnit = Number(item.valor_unitario || 0);
          const valorTot = Number(item.valor_total || 0);
          return [
            item.codigo || '-',
            item.descricao || '-',
            Number(item.quantidade || 0).toFixed(0),
            valorUnit > 0 ? formatCurrency(valorUnit) : '',
            valorTot > 0 ? formatCurrency(valorTot) : ''
          ];
        });

        yPosition = criarTabela(
          [pdfT.code, pdfT.description, pdfT.qty, pdfT.unitPrice, pdfT.total],
          servicosRows,
          yPosition,
          [20, 60, 15, 25, 25]
        );

        // Total de Serviços em box
        const totalServicos = servicos.reduce((acc, item) => acc + Number(item.valor_total || 0), 0);
        if (yPosition + 10 > pageHeight - 30) {
          adicionarRodape(currentPage);
          doc.addPage();
          currentPage++;
          yPosition = 20;
        }
        
        yPosition += 5;
        const boxWidth = 50;
        const boxHeight = 8;
        const boxX = pageWidth - 20 - 25 - boxWidth;
        
        doc.setDrawColor(200, 200, 200);
        doc.rect(boxX, yPosition, boxWidth, boxHeight);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text(pdfT.servicesTotal, boxX + 2, yPosition + 5.5);
        
        const valorBoxX = boxX + boxWidth;
        doc.rect(valorBoxX, yPosition, 25, boxHeight);
        const totalServicosTexto = totalServicos > 0 ? formatCurrency(totalServicos) : '';
        doc.text(totalServicosTexto, valorBoxX + 23, yPosition + 5.5, { align: 'right' });
        
        yPosition += 10;
      }

      // === USINAGEM NECESSÁRIA ===
      if (usinagem.length > 0) {
        yPosition += 10;
        
        // Verificar se precisa de nova página
        if (yPosition + 30 > pageHeight - 30) {
          adicionarRodape(currentPage);
          doc.addPage();
          currentPage++;
          yPosition = 20;
        }
        
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(220, 38, 38);
        doc.text(pdfT.requiredMachining, 20, yPosition);
        doc.setTextColor(0, 0, 0);
        yPosition += 5;

        const usinagemRows = usinagem.map(item => {
          const valorUnit = Number(item.valor_unitario || 0);
          const valorTot = Number(item.valor_total || 0);
          return [
            item.codigo || '-',
            item.descricao || '-',
            Number(item.quantidade || 0).toFixed(0),
            valorUnit > 0 ? formatCurrency(valorUnit) : '',
            valorTot > 0 ? formatCurrency(valorTot) : ''
          ];
        });

        yPosition = criarTabela(
          [pdfT.code, pdfT.description, pdfT.qty, pdfT.unitPrice, pdfT.total],
          usinagemRows,
          yPosition,
          [20, 60, 15, 25, 25]
        );

        // Total de Usinagem em box
        const totalUsinagem = usinagem.reduce((acc, item) => acc + Number(item.valor_total || 0), 0);
        if (yPosition + 10 > pageHeight - 30) {
          adicionarRodape(currentPage);
          doc.addPage();
          currentPage++;
          yPosition = 20;
        }
        
        yPosition += 5;
        const boxWidth = 50;
        const boxHeight = 8;
        const boxX = pageWidth - 20 - 25 - boxWidth;
        
        doc.setDrawColor(200, 200, 200);
        doc.rect(boxX, yPosition, boxWidth, boxHeight);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text(pdfT.machiningTotal, boxX + 2, yPosition + 5.5);
        
        const valorBoxX = boxX + boxWidth;
        doc.rect(valorBoxX, yPosition, 25, boxHeight);
        const totalUsinagemTexto = totalUsinagem > 0 ? formatCurrency(totalUsinagem) : '';
        doc.text(totalUsinagemTexto, valorBoxX + 23, yPosition + 5.5, { align: 'right' });
        
        yPosition += 10;
      }

      // === FOTOS (se houver) ===
      if (fotosData.length > 0) {
        // Adicionar espaçamento antes das fotos
        yPosition += 10;
        
        const alturaLinhaFotoCalc = 75; // altura da foto + legenda
        const espacoMinimoFotos = 20 + alturaLinhaFotoCalc; // título + uma linha de fotos
        
        // Verificar se há espaço suficiente na página atual
        if (yPosition + espacoMinimoFotos > pageHeight - 30) {
          adicionarRodape(currentPage);
          doc.addPage();
          currentPage++;
          yPosition = 20;
        }

        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(220, 38, 38);
        doc.text(pdfT.equipmentPhotos, pageWidth / 2, yPosition, { align: "center" });
        doc.setTextColor(0, 0, 0);
        yPosition += 15;

        // Função para processar imagem com canvas (corrige orientação EXIF)
        const processarImagem = (img: HTMLImageElement): string => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) return img.src;
          
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          ctx.drawImage(img, 0, 0);
          
          return canvas.toDataURL('image/jpeg', 0.85);
        };

        const maxFotoWidth = 80;
        const maxFotoHeight = 55;
        const espacoHorizontal = 10;
        const espacoVertical = 20; // Espaço para legendas
        const alturaLinhaFoto = maxFotoHeight + espacoVertical;

        // Grade 2x2
        for (let i = 0; i < fotosData.length; i += 4) {
          if (i > 0) {
            adicionarRodape(currentPage);
            doc.addPage();
            currentPage++;
            yPosition = 30;
          }

          const fotosPagina = fotosData.slice(i, i + 4);
          for (let j = 0; j < fotosPagina.length; j++) {
            const col = j % 2;
            const row = Math.floor(j / 2);
            const xPos = 20 + col * (maxFotoWidth + espacoHorizontal);
            const yPos = yPosition + row * alturaLinhaFoto;

            try {
              await new Promise<void>((resolve) => {
                const img = new Image();
                img.crossOrigin = "anonymous";
                img.onload = () => {
                  // Processar imagem via canvas para corrigir orientação
                  const imagemProcessada = processarImagem(img);
                  
                  const imgAspectRatio = img.naturalWidth / img.naturalHeight;
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
                  
                  doc.addImage(imagemProcessada, 'JPEG', xPos + xOffset, yPos + yOffset, finalWidth, finalHeight);
                  
                  // Adicionar legenda abaixo da foto se existir
                  if (fotosPagina[j].legenda) {
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(8);
                    doc.setTextColor(80, 80, 80);
                    
                    const legendaY = yPos + maxFotoHeight + 5;
                    const legendaTexto = fotosPagina[j].legenda.length > 60 
                      ? fotosPagina[j].legenda.substring(0, 57) + '...' 
                      : fotosPagina[j].legenda;
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
              console.error('Erro ao carregar imagem:', error);
            }
          }
        }
      }

      // Rodapé da última página
      adicionarRodape(currentPage);

      // Salvar PDF com indicação de revisão no nome
      const nomeArquivo = orcamento.numero_revisao
        ? `Orcamento_${orcamento.numero.replace(/\//g, '-')}_REV${orcamento.numero_revisao}.pdf`
        : `Orcamento_${orcamento.numero.replace(/\//g, '-')}.pdf`;
      
      doc.save(nomeArquivo);
      toast.success(pdfT.pdfSuccess);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error(t('pdf.pdfError'));
    }
  };


  const getStatusColor = (status: string) => {
    switch (status) {
      case "pendente":
        return "bg-warning-light text-warning border-warning/20";
      case "aprovado":
        return "bg-success-light text-success border-success/20";
      case "rejeitado":
        return "bg-destructive-light text-destructive border-destructive/20";
      default:
        return "bg-secondary-light text-secondary border-secondary/20";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "pendente":
        return t('orcamentos.pending');
      case "aprovado":
        return t('orcamentos.approved');
      case "rejeitado":
        return t('orcamentos.rejected');
      default:
        return status;
    }
  };

  return (
    <AppLayout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t('orcamentos.title')}</h1>
            <p className="text-muted-foreground">
              {t('orcamentos.subtitle')}
            </p>
          </div>
          
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                {t('orcamentos.new')}
              </Button>
            </SheetTrigger>
            <SheetContent className="sm:max-w-2xl">
              <SheetHeader>
                <SheetTitle>{t('orcamentos.createNewQuote')}</SheetTitle>
              </SheetHeader>
              
              <div className="py-6 space-y-6">
                <Card className="cursor-pointer hover:shadow-md transition-smooth border-2 hover:border-primary/20" onClick={handleCreateNewOrcamento}>
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Plus className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{t('orcamentos.blankQuote')}</CardTitle>
                        <CardDescription>
                          {t('orcamentos.createFromScratch')}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>

                <Card className="border-2">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-accent/10 rounded-lg">
                        <Copy className="h-5 w-5 text-accent" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{t('orcamentos.basedOnOrder')}</CardTitle>
                        <CardDescription>
                          {t('orcamentos.createBasedOnOrder')}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="search-ordem">{t('orcamentos.searchOrder')}</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="search-ordem"
                          placeholder={t('orcamentos.searchOrderPlaceholder')}
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>{t('orcamentos.selectOrderLabel')}</Label>
                      <Select onValueChange={(value) => setSelectedOrdemServico(ordensFiltered.find(o => o.id === value))}>
                        <SelectTrigger>
                          <SelectValue placeholder={t('orcamentos.selectOrderPlaceholder')} />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {ordensFiltered.length > 0 ? (
                            ordensFiltered.map((ordem) => (
                              <SelectItem key={ordem.id} value={ordem.id}>
                                 <div className="flex flex-col">
                                   <span className="font-medium">{ordem.recebimentos?.numero_ordem || ordem.numero_ordem}</span>
                                   <span className="text-sm text-muted-foreground">
                                     {ordem.cliente_nome} - {ordem.equipamento}
                                   </span>
                                 </div>
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no-ordens" disabled>
                              <div className="text-center text-muted-foreground">
                                <FileText className="h-4 w-4 mx-auto mb-1 opacity-50" />
                                <p>{t('orcamentos.noOrdersFound')}</p>
                              </div>
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedOrdemServico && (
                      <div className="p-3 bg-accent/5 rounded-lg border">
                         <div className="space-y-1">
                           <div className="font-medium text-sm">{selectedOrdemServico.recebimentos?.numero_ordem || selectedOrdemServico.numero_ordem}</div>
                           <div className="text-sm text-muted-foreground">{selectedOrdemServico.cliente_nome}</div>
                           <div className="text-xs text-muted-foreground">{selectedOrdemServico.equipamento}</div>
                           <Badge variant="outline" className="text-xs mt-2">
                             {selectedOrdemServico.status}
                           </Badge>
                         </div>
                      </div>
                    )}

                    <Button 
                      onClick={handleCreateOrcamentoFromOrdemServico}
                      disabled={!selectedOrdemServico}
                      className="w-full"
                    >
                      {t('orcamentos.createFromOrderButton')}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Cards de Métricas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Valor Total Aguardando Aprovação */}
          <div
            className="group rounded-2xl border border-border/50
                       bg-card/40 p-5 shadow-lg
                       transition-all duration-300 ease-in-out
                       hover:border-border hover:bg-card/60
                       hover:-translate-y-1 cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">{t('orcamentos.awaitingApproval')}</h3>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="mt-4 flex items-end justify-between">
              <div className="flex flex-col">
                <p className="text-2xl font-bold tracking-tighter text-success">
                  {useMemo(() => {
                    const total = orcamentos
                      .filter(o => o.status === 'pendente')
                      .reduce((acc, o) => acc + Number(o.valor || 0), 0);
                    return total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                  }, [orcamentos])}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {useMemo(() => {
                    return orcamentos.filter(o => o.status === 'pendente').length;
                  }, [orcamentos])} {t('orcamentos.quotes')}
                </p>
              </div>
              <div className="h-12 w-28">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart 
                    data={useMemo(() => {
                      const hoje = new Date();
                      const dados = [];
                      for (let i = 5; i >= 0; i--) {
                        const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
                        const mes = data.toLocaleDateString('pt-BR', { month: 'short' });
                        const mesIndex = data.getMonth();
                        const ano = data.getFullYear();
                        
                        const valor = orcamentos
                          .filter(o => {
                            const dataOrc = new Date(o.created_at || o.data_criacao);
                            return o.status === 'pendente' && 
                                   dataOrc.getMonth() === mesIndex && 
                                   dataOrc.getFullYear() === ano;
                          })
                          .reduce((acc, o) => acc + Number(o.valor || 0), 0);
                        
                        dados.push({ mes, value: valor });
                      }
                      return dados;
                    }, [orcamentos])}
                    margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient id="gradient-aguardando" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Tooltip
                      content={<CustomTooltip />}
                      cursor={{
                        stroke: 'hsl(var(--border))',
                        strokeWidth: 1,
                        strokeDasharray: '3 3',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={false}
                      fillOpacity={1}
                      fill="url(#gradient-aguardando)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Valor Total Aprovados */}
          <div
            className="group rounded-2xl border border-border/50
                       bg-card/40 p-5 shadow-lg
                       transition-all duration-300 ease-in-out
                       hover:border-border hover:bg-card/60
                       hover:-translate-y-1 cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">{t('orcamentos.approved')}</h3>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="mt-4 flex items-end justify-between">
              <div className="flex flex-col">
                <p className="text-2xl font-bold tracking-tighter text-success">
                  {useMemo(() => {
                    const total = orcamentos
                      .filter(o => o.status === 'aprovado' || o.status === 'faturamento')
                      .reduce((acc, o) => acc + Number(o.valor || 0), 0);
                    return total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                  }, [orcamentos])}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {useMemo(() => {
                    return orcamentos.filter(o => o.status === 'aprovado' || o.status === 'faturamento').length;
                  }, [orcamentos])} {t('orcamentos.quotes')}
                </p>
              </div>
              <div className="h-12 w-28">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart 
                    data={useMemo(() => {
                      const hoje = new Date();
                      const dados = [];
                      for (let i = 5; i >= 0; i--) {
                        const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
                        const mes = data.toLocaleDateString('pt-BR', { month: 'short' });
                        const mesIndex = data.getMonth();
                        const ano = data.getFullYear();
                        
                        const valor = orcamentos
                          .filter(o => {
                            const dataOrc = new Date(o.created_at || o.data_criacao);
                            return (o.status === 'aprovado' || o.status === 'faturamento') && 
                                   dataOrc.getMonth() === mesIndex && 
                                   dataOrc.getFullYear() === ano;
                          })
                          .reduce((acc, o) => acc + Number(o.valor || 0), 0);
                        
                        dados.push({ mes, value: valor });
                      }
                      return dados;
                    }, [orcamentos])}
                    margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient id="gradient-aprovados" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Tooltip
                      content={<CustomTooltip />}
                      cursor={{
                        stroke: 'hsl(var(--border))',
                        strokeWidth: 1,
                        strokeDasharray: '3 3',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={false}
                      fillOpacity={1}
                      fill="url(#gradient-aprovados)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Valor Total Reprovados */}
          <div
            className="group rounded-2xl border border-border/50
                       bg-card/40 p-5 shadow-lg
                       transition-all duration-300 ease-in-out
                       hover:border-border hover:bg-card/60
                       hover:-translate-y-1 cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">{t('orcamentos.rejected')}</h3>
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="mt-4 flex items-end justify-between">
              <div className="flex flex-col">
                <p className="text-2xl font-bold tracking-tighter text-success">
                  {useMemo(() => {
                    const total = orcamentos
                      .filter(o => o.status === 'rejeitado')
                      .reduce((acc, o) => acc + Number(o.valor || 0), 0);
                    return total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                  }, [orcamentos])}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {useMemo(() => {
                    return orcamentos.filter(o => o.status === 'rejeitado').length;
                  }, [orcamentos])} {t('orcamentos.quotes')}
                </p>
              </div>
              <div className="h-12 w-28">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart 
                    data={useMemo(() => {
                      const hoje = new Date();
                      const dados = [];
                      for (let i = 5; i >= 0; i--) {
                        const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
                        const mes = data.toLocaleDateString('pt-BR', { month: 'short' });
                        const mesIndex = data.getMonth();
                        const ano = data.getFullYear();
                        
                        const valor = orcamentos
                          .filter(o => {
                            const dataOrc = new Date(o.created_at || o.data_criacao);
                            return o.status === 'rejeitado' && 
                                   dataOrc.getMonth() === mesIndex && 
                                   dataOrc.getFullYear() === ano;
                          })
                          .reduce((acc, o) => acc + Number(o.valor || 0), 0);
                        
                        dados.push({ mes, value: valor });
                      }
                      return dados;
                    }, [orcamentos])}
                    margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient id="gradient-reprovados" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Tooltip
                      content={<CustomTooltip />}
                      cursor={{
                        stroke: 'hsl(var(--border))',
                        strokeWidth: 1,
                        strokeDasharray: '3 3',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#ef4444"
                      strokeWidth={2}
                      dot={false}
                      fillOpacity={1}
                      fill="url(#gradient-reprovados)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Contagem Total Anual */}
          <div
            className="group rounded-2xl border border-border/50
                       bg-card/40 p-5 shadow-lg
                       transition-all duration-300 ease-in-out
                       hover:border-border hover:bg-card/60
                       hover:-translate-y-1 cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">{t('orcamentos.totalYear')}</h3>
              <FileCheck className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="mt-4 flex items-end justify-between">
              <div className="flex flex-col">
                <p className="text-2xl font-bold tracking-tighter text-success">
                  {useMemo(() => {
                    const anoAtual = new Date().getFullYear();
                    return orcamentos.filter(o => {
                      const dataOrcamento = new Date(o.created_at || o.data_criacao);
                      return dataOrcamento.getFullYear() === anoAtual;
                    }).length;
                  }, [orcamentos])}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('orcamentos.quotesInYear')} {new Date().getFullYear()}
                </p>
              </div>
              <div className="h-12 w-28">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart 
                    data={useMemo(() => {
                      const hoje = new Date();
                      const dados = [];
                      for (let i = 5; i >= 0; i--) {
                        const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
                        const mes = data.toLocaleDateString('pt-BR', { month: 'short' });
                        const mesIndex = data.getMonth();
                        const ano = data.getFullYear();
                        
                        const count = orcamentos.filter(o => {
                          const dataOrc = new Date(o.created_at || o.data_criacao);
                          return dataOrc.getMonth() === mesIndex && 
                                 dataOrc.getFullYear() === ano;
                        }).length;
                        
                        dados.push({ mes, value: count });
                      }
                      return dados;
                    }, [orcamentos])}
                    margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient id="gradient-total" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--warning))" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="hsl(var(--warning))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Tooltip
                      content={<CustomTooltipCount />}
                      cursor={{
                        stroke: 'hsl(var(--border))',
                        strokeWidth: 1,
                        strokeDasharray: '3 3',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="hsl(var(--warning))"
                      strokeWidth={2}
                      dot={false}
                      fillOpacity={1}
                      fill="url(#gradient-total)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* Card de Filtros */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Filtro por Data Início */}
              <div className="space-y-2">
                <Label htmlFor="data-inicio">{t('common.startDate')}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="data-inicio"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dataInicio && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dataInicio ? format(dataInicio, "PPP", { locale: ptBR }) : t('orcamentos.select')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dataInicio}
                      onSelect={setDataInicio}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Filtro por Data Fim */}
              <div className="space-y-2">
                <Label htmlFor="data-fim">{t('common.endDate')}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="data-fim"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dataFim && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dataFim ? format(dataFim, "PPP", { locale: ptBR }) : t('orcamentos.select')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dataFim}
                      onSelect={setDataFim}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Filtro por Cliente */}
              <div className="space-y-2">
                <Label htmlFor="filtro-cliente">{t('common.client')}</Label>
                <Input
                  id="filtro-cliente"
                  placeholder={t('orcamentos.clientName')}
                  value={filtroCliente}
                  onChange={(e) => setFiltroCliente(e.target.value)}
                />
              </div>

              {/* Filtro por Número */}
              <div className="space-y-2">
                <Label htmlFor="filtro-numero">{t('orcamentos.quoteNumber')}</Label>
                <Input
                  id="filtro-numero"
                  placeholder={t('orcamentos.exampleNumber')}
                  value={filtroNumero}
                  onChange={(e) => setFiltroNumero(e.target.value)}
                />
              </div>
            </div>

            {/* Botão para Limpar Filtros */}
            {(dataInicio || dataFim || filtroCliente || filtroNumero) && (
              <div className="mt-4 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDataInicio(undefined);
                    setDataFim(undefined);
                    setFiltroCliente("");
                    setFiltroNumero("");
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  {t('common.clearFilters')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="pendente" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pendente">{t('orcamentos.awaitingApproval')}</TabsTrigger>
            <TabsTrigger value="aprovado">{t('orcamentos.approved')}</TabsTrigger>
            <TabsTrigger value="finalizado">{t('orcamentos.finalized')}</TabsTrigger>
            <TabsTrigger value="rejeitado">{t('orcamentos.rejected')}</TabsTrigger>
          </TabsList>

          <TabsContent value="pendente" className="space-y-4">
            {aplicarFiltros(orcamentos.filter(o => o.status === 'pendente')).length > 0 ? (
              aplicarFiltros(orcamentos.filter(o => o.status === 'pendente')).map((item) => (
                <Card key={item.id} className="hover:shadow-md transition-smooth">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <h3 className="text-lg font-semibold text-foreground">
                            {t('orcamentos.quote')} #{item.numero}
                          </h3>
                          <Badge className={getStatusColor(item.status)}>
                            {getStatusText(item.status)}
                          </Badge>
                          {item.ordens_vinculadas && item.ordens_vinculadas.length > 0 && (
                            item.ordens_vinculadas.map((ordem: any) => (
                              <Badge key={ordem.id} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
                                OS: {ordem.numero_ordem}
                              </Badge>
                            ))
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p><span className="font-medium">{t('orcamentos.client')}:</span> {item.cliente_nome}</p>
                          <p><span className="font-medium">{t('orcamentos.equipment')}:</span> {item.equipamento}</p>
                          <p><span className="font-medium">{t('orcamentos.value')}:</span> R$ {Number(item.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleVincularOrdens(item)}
                          title={t('orcamentos.linkOrders')}
                        >
                          <Link2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => abrirPrecificacao(item)}
                        >
                          <DollarSign className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => editarOrcamento(item)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => gerarPDFOrcamento(item, language)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleReprovarOrcamento(item.id)}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleAprovarOrcamento(item)}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    {t('orcamentos.noQuotesAwaitingApproval')}
                  </h3>
                  <p className="text-muted-foreground">
                    {t('orcamentos.noQuotesPending')}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="aprovado" className="space-y-4">
            {aplicarFiltros(orcamentos.filter(o => o.status === 'aprovado' || o.status === 'faturamento')).length > 0 ? (
              aplicarFiltros(orcamentos.filter(o => o.status === 'aprovado' || o.status === 'faturamento')).map((item) => (
                <Card key={item.id} className="hover:shadow-md transition-smooth">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <h3 className="text-lg font-semibold text-foreground">
                            {t('orcamentos.quote')} #{item.numero}
                          </h3>
                          <Badge className={getStatusColor(item.status)}>
                            {getStatusText(item.status)}
                          </Badge>
                          {item.ordens_vinculadas && item.ordens_vinculadas.length > 0 && (
                            item.ordens_vinculadas.map((ordem: any) => (
                              <Badge key={ordem.id} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
                                OS: {ordem.numero_ordem}
                              </Badge>
                            ))
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p><span className="font-medium">{t('orcamentos.client')}:</span> {item.cliente_nome}</p>
                          <p><span className="font-medium">{t('orcamentos.equipment')}:</span> {item.equipamento}</p>
                          <p><span className="font-medium">{t('orcamentos.value')}:</span> R$ {Number(item.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleVincularOrdens(item)}
                          title={t('orcamentos.linkOrders')}
                        >
                          <Link2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => abrirPrecificacao(item)}
                        >
                          <DollarSign className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => editarOrcamento(item)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => gerarPDFOrcamento(item, language)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    {t('orcamentos.noQuotesApproved')}
                  </h3>
                  <p className="text-muted-foreground">
                    {t('orcamentos.noQuotesApprovedNow')}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="finalizado" className="space-y-4">
            {aplicarFiltros(orcamentos.filter(o => o.status === 'finalizado')).length > 0 ? (
              aplicarFiltros(orcamentos.filter(o => o.status === 'finalizado')).map((item) => (
                <Card key={item.id} className="hover:shadow-md transition-smooth">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <h3 className="text-lg font-semibold text-foreground">
                            {t('orcamentos.quote')} #{item.numero}
                          </h3>
                          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            {t('orcamentos.finalized')}
                          </Badge>
                          {item.ordens_vinculadas && item.ordens_vinculadas.length > 0 && (
                            item.ordens_vinculadas.map((ordem: any) => (
                              <Badge key={ordem.id} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
                                OS: {ordem.numero_ordem}
                              </Badge>
                            ))
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p><span className="font-medium">{t('orcamentos.client')}:</span> {item.cliente_nome}</p>
                          <p><span className="font-medium">{t('orcamentos.equipment')}:</span> {item.equipamento}</p>
                          <p><span className="font-medium">{t('orcamentos.value')}:</span> R$ {Number(item.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                          {item.numero_nf && (
                            <p><span className="font-medium">{t('orcamentos.invoiceNumber')}:</span> {item.numero_nf}</p>
                          )}
                          {item.forma_pagamento && (
                            <p><span className="font-medium">{t('orcamentos.paymentMethod')}:</span> {item.forma_pagamento}</p>
                          )}
                          {item.data_aprovacao && (
                            <p><span className="font-medium">{t('orcamentos.approvalDate')}:</span> {new Date(item.data_aprovacao).toLocaleDateString(language === 'en' ? 'en-US' : 'pt-BR')}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => abrirPrecificacao(item)}
                        >
                          <DollarSign className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => gerarPDFOrcamento(item, language)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    {t('orcamentos.noQuotesFinalized')}
                  </h3>
                  <p className="text-muted-foreground">
                    {t('orcamentos.noQuotesFinalizedNow')}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="rejeitado" className="space-y-4">
            {aplicarFiltros(orcamentos.filter(o => o.status === 'rejeitado')).length > 0 ? (
              aplicarFiltros(orcamentos.filter(o => o.status === 'rejeitado')).map((item) => (
                <Card key={item.id} className="hover:shadow-md transition-smooth">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <h3 className="text-lg font-semibold text-foreground">
                            {t('orcamentos.quote')} #{item.numero}
                          </h3>
                          <Badge className={getStatusColor(item.status)}>
                            {getStatusText(item.status)}
                          </Badge>
                          {item.ordens_vinculadas && item.ordens_vinculadas.length > 0 && (
                            item.ordens_vinculadas.map((ordem: any) => (
                              <Badge key={ordem.id} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
                                OS: {ordem.numero_ordem}
                              </Badge>
                            ))
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p><span className="font-medium">{t('orcamentos.client')}:</span> {item.cliente_nome}</p>
                          <p><span className="font-medium">{t('orcamentos.equipment')}:</span> {item.equipamento}</p>
                          <p><span className="font-medium">{t('orcamentos.value')}:</span> R$ {Number(item.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => abrirPrecificacao(item)}
                        >
                          <DollarSign className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => editarOrcamento(item)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => gerarPDFOrcamento(item, language)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    {t('orcamentos.noQuotesRejected')}
                  </h3>
                  <p className="text-muted-foreground">
                    {t('orcamentos.noQuotesRejectedNow')}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
      
      <AprovarOrcamentoModal
        open={showAprovarModal}
        onOpenChange={setShowAprovarModal}
        orcamento={orcamentoParaAprovar}
        onConfirm={confirmarAprovacao}
      />

      <PrecificacaoModal
        open={showPrecificacaoModal}
        onClose={() => setShowPrecificacaoModal(false)}
        orcamento={orcamentoParaPrecificar}
        onSave={carregarOrcamentos}
      />

      <VincularOrdensModal
        open={showVincularModal}
        onOpenChange={setShowVincularModal}
        orcamento={orcamentoParaVincular}
        onSuccess={carregarOrcamentos}
      />
    </AppLayout>
  );
}