import { useState, useEffect } from "react";
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
import { Plus, FileText, Edit, Check, X, Copy, Search, Download, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { AprovarOrcamentoModal } from "@/components/AprovarOrcamentoModal";
import { PrecificacaoModal } from "@/components/PrecificacaoModal";
import jsPDF from "jspdf";
import mecHidroLogo from "@/assets/mec-hidro-logo.jpg";

export default function Orcamentos() {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [ordensServico, setOrdensServico] = useState<any[]>([]);
  const [ordensFiltered, setOrdensFiltered] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrdemServico, setSelectedOrdemServico] = useState<any>(null);
  const [orcamentos, setOrcamentos] = useState<any[]>([]);
  const navigate = useNavigate();

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
        toast.error('Erro ao carregar ordens de serviço');
        return;
      }

      console.log('Ordens de serviço carregadas:', data);
      setOrdensServico(data || []);
      setOrdensFiltered(data || []);
    } catch (error) {
      console.error('Erro ao carregar ordens de serviço:', error);
      toast.error('Erro ao carregar ordens de serviço');
    }
  };

  const carregarOrcamentos = async () => {
    try {
      const { data, error } = await supabase
        .from('orcamentos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao carregar orçamentos:', error);
        toast.error('Erro ao carregar orçamentos');
        return;
      }

      console.log('Orçamentos carregados:', data);
      setOrcamentos(data || []);
    } catch (error) {
      console.error('Erro ao carregar orçamentos:', error);
      toast.error('Erro ao carregar orçamentos');
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
      toast.error("Selecione uma ordem de serviço primeiro");
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
      toast("Orçamento reprovado", {
        description: "O orçamento foi marcado como rejeitado.",
      });
    } catch (error) {
      console.error('Erro ao reprovar orçamento:', error);
      toast.error('Erro ao reprovar orçamento');
    }
  };

  const editarOrcamento = (orcamento: any) => {
    navigate('/orcamentos/novo', { state: { orcamento } });
  };

  const abrirPrecificacao = (orcamento: any) => {
    setOrcamentoParaPrecificar(orcamento);
    setShowPrecificacaoModal(true);
  };

  const gerarPDFOrcamento = async (orcamento: any) => {
    try {
      const EMPRESA_INFO = {
        nome: "MEC-HIDRO MECANICA E HIDRAULICA LTDA",
        cnpj: "03.328.334/0001-87",
        telefone: "(19) 3026-6227",
        email: "contato@mechidro.com.br"
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
        doc.text(`Página ${numeroPagina}`, pageWidth / 2, rodapeY, { align: "center" });
        doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 20, rodapeY);
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
        const rowHeight = 8;
        const headerHeight = 10;
        const cellPadding = 2;

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

          // Desenhar células
          xPos = 20;
          row.forEach((cell, cellIndex) => {
            const align = cellIndex >= row.length - 2 ? 'right' : 'left';
            const text = String(cell);
            const maxWidth = columnWidths[cellIndex] - cellPadding * 2;
            
            if (align === 'right') {
              doc.text(text, xPos + columnWidths[cellIndex] - cellPadding, y + 6, { align: 'right' });
            } else {
              doc.text(text, xPos + cellPadding, y + 6, { maxWidth });
            }
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
      doc.text("PROPOSTA COMERCIAL", pageWidth / 2, yPosition, { align: "center" });
      doc.setTextColor(0, 0, 0);

      // === INFORMAÇÕES DO CLIENTE ===
      yPosition = 55;
      
      // Buscar CNPJ do cliente
      let cnpjCliente = '';
      if (orcamento.ordem_servico_id) {
        const { data: osData } = await supabase
          .from('ordens_servico')
          .select('recebimento_id')
          .eq('id', orcamento.ordem_servico_id)
          .maybeSingle();
        
        if (osData?.recebimento_id) {
          const { data: recData } = await supabase
            .from('recebimentos')
            .select('cliente_cnpj')
            .eq('id', osData.recebimento_id)
            .maybeSingle();
          cnpjCliente = recData?.cliente_cnpj || '';
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
      doc.text("Informações do Cliente", pageWidth / 2, yPosition + 7, { align: "center" });
      yPosition += 10;
      
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      
      // Primeira linha: Nº Orçamento + Data
      const colWidth = (pageWidth - 40) / 2;
      
      doc.setDrawColor(200, 200, 200);
      doc.rect(20, yPosition, colWidth, 8);
      doc.rect(20 + colWidth, yPosition, colWidth, 8);
      doc.text(`Nº Orçamento: ${orcamento.numero || 'N/A'}`, 22, yPosition + 5.5);
      doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 22 + colWidth, yPosition + 5.5);
      yPosition += 8;
      
      // Segunda linha: Nome do Cliente (linha inteira)
      doc.rect(20, yPosition, pageWidth - 40, 8);
      doc.text(`Nome do Cliente: ${orcamento.cliente_nome || 'N/A'}`, 22, yPosition + 5.5);
      yPosition += 8;
      
      // Terceira linha: CNPJ (linha inteira)
      doc.rect(20, yPosition, pageWidth - 40, 8);
      doc.text(`CNPJ: ${cnpjCliente || 'N/A'}`, 22, yPosition + 5.5);
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
      doc.text("Condições Comerciais", pageWidth / 2, yPosition + 7, { align: "center" });
      yPosition += 10;
      
      const valorTotal = Number(orcamento.valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      const prazo = orcamento.condicao_pagamento || (orcamento.prazo_pagamento ? `${orcamento.prazo_pagamento} DDL` : 'A combinar');
      const dataGeracao = new Date().toLocaleDateString('pt-BR');
      const validade = orcamento.data_vencimento 
        ? new Date(orcamento.data_vencimento).toLocaleDateString('pt-BR') 
        : '12 meses';
      
      const assunto = orcamento.assunto_proposta || orcamento.equipamento || 'REFORMA/MANUTENÇÃO';
      const prazoEntrega = orcamento.prazo_entrega || '5 dias úteis';
      const garantia = '6 Meses';
      const frete = orcamento.frete || 'CIF';
      
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
      doc.text(`Valor Total: ${valorTotal}`, 22, yPosition + 5.5);
      doc.text(`Condição Pagamento: ${prazo}`, 22 + col3Width, yPosition + 5.5);
      doc.text(`Prazo Entrega: ${prazoEntrega}`, 22 + col3Width * 2, yPosition + 5.5);
      yPosition += 8;
      
      // Terceira linha: Garantia + Frete + Validade Proposta
      doc.rect(20, yPosition, col3Width, 8);
      doc.rect(20 + col3Width, yPosition, col3Width, 8);
      doc.rect(20 + col3Width * 2, yPosition, col3Width, 8);
      doc.text(`Garantia: ${garantia}`, 22, yPosition + 5.5);
      doc.text(`Frete: ${frete}`, 22 + col3Width, yPosition + 5.5);
      doc.text(`Validade Proposta: ${validade}`, 22 + col3Width * 2, yPosition + 5.5);
      yPosition += 8;

      // === PEÇAS NECESSÁRIAS ===
      if (pecas.length > 0) {
        yPosition += 10;
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(220, 38, 38);
        doc.text("PEÇAS NECESSÁRIAS", 20, yPosition);
        doc.setTextColor(0, 0, 0);
        yPosition += 5;

        const pecasRows = pecas.map(item => {
          return [
            item.descricao || '-',
            Number(item.quantidade || 0).toFixed(0),
            Number(item.valor_unitario || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
            Number(item.valor_total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
          ];
        });

        yPosition = criarTabela(
          ['Descrição', 'Qtd', 'Valor Unit.', 'Total'],
          pecasRows,
          yPosition,
          [90, 20, 35, 35]
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
        const boxX = pageWidth - 25 - boxWidth - 35;
        
        doc.setDrawColor(200, 200, 200);
        doc.rect(boxX, yPosition, boxWidth, boxHeight);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text('Total de Peças', boxX + 2, yPosition + 5.5);
        
        const valorBoxX = boxX + boxWidth;
        doc.rect(valorBoxX, yPosition, 35, boxHeight);
        doc.text(totalPecas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), valorBoxX + 33, yPosition + 5.5, { align: 'right' });
        
        yPosition += 10;
      }

      // === SERVIÇOS A EXECUTAR ===
      if (servicos.length > 0) {
        yPosition += 10;
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(220, 38, 38);
        doc.text("SERVIÇOS A EXECUTAR", 20, yPosition);
        doc.setTextColor(0, 0, 0);
        yPosition += 5;

        const servicosRows = servicos.map(item => {
          return [
            item.descricao || '-',
            Number(item.quantidade || 0).toFixed(0),
            Number(item.valor_unitario || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
            Number(item.valor_total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
          ];
        });

        yPosition = criarTabela(
          ['Descrição', 'Qtd', 'Valor Unit.', 'Total'],
          servicosRows,
          yPosition,
          [90, 20, 35, 35]
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
        const boxX = pageWidth - 25 - boxWidth - 35;
        
        doc.setDrawColor(200, 200, 200);
        doc.rect(boxX, yPosition, boxWidth, boxHeight);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text('Total de Serviços', boxX + 2, yPosition + 5.5);
        
        const valorBoxX = boxX + boxWidth;
        doc.rect(valorBoxX, yPosition, 35, boxHeight);
        doc.text(totalServicos.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), valorBoxX + 33, yPosition + 5.5, { align: 'right' });
        
        yPosition += 10;
      }

      // === USINAGEM NECESSÁRIA ===
      if (usinagem.length > 0) {
        yPosition += 10;
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(220, 38, 38);
        doc.text("USINAGEM NECESSÁRIA", 20, yPosition);
        doc.setTextColor(0, 0, 0);
        yPosition += 5;

        const usinagemRows = usinagem.map(item => {
          return [
            item.descricao || '-',
            Number(item.quantidade || 0).toFixed(0),
            Number(item.valor_unitario || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
            Number(item.valor_total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
          ];
        });

        yPosition = criarTabela(
          ['Descrição', 'Qtd', 'Valor Unit.', 'Total'],
          usinagemRows,
          yPosition,
          [90, 20, 35, 35]
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
        const boxX = pageWidth - 25 - boxWidth - 35;
        
        doc.setDrawColor(200, 200, 200);
        doc.rect(boxX, yPosition, boxWidth, boxHeight);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text('Total de Usinagem', boxX + 2, yPosition + 5.5);
        
        const valorBoxX = boxX + boxWidth;
        doc.rect(valorBoxX, yPosition, 35, boxHeight);
        doc.text(totalUsinagem.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), valorBoxX + 33, yPosition + 5.5, { align: 'right' });
        
        yPosition += 10;
      }

      // === FOTOS (se houver) ===
      if (fotosData.length > 0) {
        adicionarRodape(currentPage);
        doc.addPage();
        currentPage++;
        yPosition = 20;

        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(220, 38, 38);
        doc.text("EQUIPAMENTO - FOTOS", pageWidth / 2, yPosition, { align: "center" });
        doc.setTextColor(0, 0, 0);
        yPosition += 15;

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
            const xPos = 20 + col * 90;
            const yPos = yPosition + row * 70;

            try {
              const img = new Image();
              img.crossOrigin = "anonymous";
              img.src = fotosPagina[j].arquivo_url;
              await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
              });
              doc.addImage(img, 'JPEG', xPos, yPos, 80, 60);
            } catch (error) {
              console.error('Erro ao carregar imagem:', error);
            }
          }
        }
      }

      // Rodapé da última página
      adicionarRodape(currentPage);

      // Salvar PDF
      doc.save(`Orcamento_${orcamento.numero}.pdf`);
      toast.success('PDF gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF');
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
        return "Pendente";
      case "aprovado":
        return "Aprovado";
      case "rejeitado":
        return "Rejeitado";
      default:
        return status;
    }
  };

  return (
    <AppLayout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Orçamentos</h1>
            <p className="text-muted-foreground">
              Gerencie e aprove orçamentos pendentes
            </p>
          </div>
          
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Novo Orçamento
              </Button>
            </SheetTrigger>
            <SheetContent className="sm:max-w-2xl">
              <SheetHeader>
                <SheetTitle>Criar Novo Orçamento</SheetTitle>
              </SheetHeader>
              
              <div className="py-6 space-y-6">
                <Card className="cursor-pointer hover:shadow-md transition-smooth border-2 hover:border-primary/20" onClick={handleCreateNewOrcamento}>
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Plus className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Orçamento em Branco</CardTitle>
                        <CardDescription>
                          Criar um novo orçamento do zero
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
                        <CardTitle className="text-lg">Baseado em Ordem de Serviço</CardTitle>
                        <CardDescription>
                          Criar orçamento com base em uma ordem de serviço existente
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="search-ordem">Buscar Ordem de Serviço</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="search-ordem"
                          placeholder="Busque por cliente, equipamento ou número..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Selecionar Ordem de Serviço</Label>
                      <Select onValueChange={(value) => setSelectedOrdemServico(ordensFiltered.find(o => o.id === value))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma ordem de serviço..." />
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
                                <p>Nenhuma ordem de serviço encontrada</p>
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
                      Criar Orçamento da Ordem de Serviço
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <Tabs defaultValue="pendente" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pendente">Aguardando Aprovação</TabsTrigger>
            <TabsTrigger value="aprovado">Aprovados</TabsTrigger>
            <TabsTrigger value="rejeitado">Reprovados</TabsTrigger>
          </TabsList>

          <TabsContent value="pendente" className="space-y-4">
            {orcamentos.filter(o => o.status === 'pendente').length > 0 ? (
              orcamentos.filter(o => o.status === 'pendente').map((item) => (
                <Card key={item.id} className="hover:shadow-md transition-smooth">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-foreground">
                            Orçamento #{item.numero}
                          </h3>
                          <Badge className={getStatusColor(item.status)}>
                            {getStatusText(item.status)}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p><span className="font-medium">Cliente:</span> {item.cliente_nome}</p>
                          <p><span className="font-medium">Equipamento:</span> {item.equipamento}</p>
                          <p><span className="font-medium">Valor:</span> R$ {Number(item.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
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
                          onClick={() => gerarPDFOrcamento(item)}
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
                    Nenhum orçamento aguardando aprovação
                  </h3>
                  <p className="text-muted-foreground">
                    Não há orçamentos pendentes no momento
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="aprovado" className="space-y-4">
            {orcamentos.filter(o => o.status === 'aprovado' || o.status === 'faturamento').length > 0 ? (
              orcamentos.filter(o => o.status === 'aprovado' || o.status === 'faturamento').map((item) => (
                <Card key={item.id} className="hover:shadow-md transition-smooth">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-foreground">
                            Orçamento #{item.numero}
                          </h3>
                          <Badge className={getStatusColor(item.status)}>
                            {getStatusText(item.status)}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p><span className="font-medium">Cliente:</span> {item.cliente_nome}</p>
                          <p><span className="font-medium">Equipamento:</span> {item.equipamento}</p>
                          <p><span className="font-medium">Valor:</span> R$ {Number(item.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
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
                          onClick={() => gerarPDFOrcamento(item)}
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
                    Nenhum orçamento aprovado
                  </h3>
                  <p className="text-muted-foreground">
                    Não há orçamentos aprovados no momento
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="rejeitado" className="space-y-4">
            {orcamentos.filter(o => o.status === 'rejeitado').length > 0 ? (
              orcamentos.filter(o => o.status === 'rejeitado').map((item) => (
                <Card key={item.id} className="hover:shadow-md transition-smooth">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-foreground">
                            Orçamento #{item.numero}
                          </h3>
                          <Badge className={getStatusColor(item.status)}>
                            {getStatusText(item.status)}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p><span className="font-medium">Cliente:</span> {item.cliente_nome}</p>
                          <p><span className="font-medium">Equipamento:</span> {item.equipamento}</p>
                          <p><span className="font-medium">Valor:</span> R$ {Number(item.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
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
                          onClick={() => gerarPDFOrcamento(item)}
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
                    Nenhum orçamento reprovado
                  </h3>
                  <p className="text-muted-foreground">
                    Não há orçamentos reprovados no momento
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
    </AppLayout>
  );
}