import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search, Plus, ThumbsUp, ThumbsDown, Edit, FileText, Download, Tag, Settings } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EquipmentLabel } from "@/components/EquipmentLabel";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function OrdensServico() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [ordensServico, setOrdensServico] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);
  const [selectedOrdemForLabel, setSelectedOrdemForLabel] = useState<any>(null);

  useEffect(() => {
    loadOrdensServico();
  }, []);

  const loadOrdensServico = async () => {
    try {
      const { data, error } = await supabase
        .from('ordens_servico')
        .select(`
          *,
          recebimentos (
            numero_ordem,
            cliente_nome,
            tipo_equipamento
          ),
          orcamentos!orcamentos_ordem_servico_id_fkey (
            id,
            status
          )
        `)
        .neq('status', 'aprovada')
        .neq('status', 'reprovada')
        .neq('status', 'faturado')
        .neq('status', 'em_producao')
        .neq('status', 'em_teste')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrdensServico(data || []);
    } catch (error) {
      console.error('Erro ao carregar ordens de serviço:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar ordens de serviço",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusDinamico = (ordem: any) => {
    // Se já foi aprovada/reprovada/faturado, mantém o status atual
    if (ordem.status === 'aprovada' || ordem.status === 'reprovada' || ordem.status === 'faturado') {
      return ordem.status;
    }
    
    // Verifica se tem orçamentos vinculados
    const temOrcamentos = ordem.orcamentos && ordem.orcamentos.length > 0;
    
    if (!temOrcamentos) {
      return 'aguardando_orcamento';
    } else {
      return 'aguardando_aprovacao';
    }
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    
    setSortConfig({ key, direction });
  };

  const getSortedOrdens = (ordens: any[]) => {
    if (!sortConfig) return ordens;
    
    return [...ordens].sort((a, b) => {
      let aValue, bValue;
      
      switch (sortConfig.key) {
        case 'numero_ordem':
          aValue = a.recebimentos?.numero_ordem || a.numero_ordem || '';
          bValue = b.recebimentos?.numero_ordem || b.numero_ordem || '';
          break;
        case 'cliente':
          aValue = a.recebimentos?.cliente_nome || a.cliente_nome || '';
          bValue = b.recebimentos?.cliente_nome || b.cliente_nome || '';
          break;
        case 'equipamento':
          aValue = a.recebimentos?.tipo_equipamento || a.equipamento || '';
          bValue = b.recebimentos?.tipo_equipamento || b.equipamento || '';
          break;
        case 'status':
          aValue = getStatusDinamico(a);
          bValue = getStatusDinamico(b);
          break;
        case 'data_entrada':
          aValue = new Date(a.data_entrada).getTime();
          bValue = new Date(b.data_entrada).getTime();
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  const handleApprove = async (ordemId: string) => {
    try {
      const ordem = ordensServico.find(o => o.id === ordemId);
      
      const { error } = await supabase
        .from('ordens_servico')
        .update({ status: 'aprovada' })
        .eq('id', ordemId);

      if (error) throw error;
      
      // Enviar notificação para o n8n/Telegram
      try {
        if (ordem) {
          // Buscar o número correto da ordem no formato MH-XXX-YY
          const { data: recebimento } = await supabase
            .from('recebimentos')
            .select('numero_ordem')
            .eq('id', ordem.recebimento_id)
            .single();

          await fetch('https://primary-production-dc42.up.railway.app/webhook/01607294-b2b4-4482-931f-c3723b128d7d', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              tipo: 'ordem_aprovada',
              numero_ordem: recebimento?.numero_ordem || ordem.numero_ordem,
              cliente: ordem.cliente_nome,
              equipamento: ordem.equipamento,
              data_aprovacao: format(new Date(), 'dd-MM-yyyy')
            })
          });
        }
      } catch (webhookError) {
        console.error('Erro ao enviar webhook:', webhookError);
      }
      
      toast({
        title: "Sucesso",
        description: "Ordem de serviço aprovada com sucesso!",
      });
      
      loadOrdensServico();
    } catch (error) {
      console.error('Erro ao aprovar ordem:', error);
      toast({
        title: "Erro",
        description: "Erro ao aprovar ordem de serviço",
        variant: "destructive",
      });
    }
  };

  const handleReject = async (ordemId: string) => {
    try {
      console.log('Reprovando ordem:', ordemId);
      
      const ordem = ordensServico.find(o => o.id === ordemId);
      
      // Verificar se a ordem está vinculada a uma nota fiscal de entrada
      const temNotaEntrada = ordem?.recebimento_id !== null;
      
      // Se vinculada à NF de entrada: vai para faturamento (nota de retorno)
      // Se NÃO vinculada: vai direto para finalizadas
      const novoStatus = temNotaEntrada ? 'reprovada' : 'finalizado';
      
      const { data, error } = await supabase
        .from('ordens_servico')
        .update({ 
          status: novoStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', ordemId)
        .select();

      if (error) {
        console.error('Erro na atualização:', error);
        throw error;
      }
      
      console.log('Ordem reprovada com sucesso:', data);
      
      toast({
        title: "Ordem reprovada",
        description: temNotaEntrada 
          ? "A ordem foi movida para faturamento para emissão de nota de retorno."
          : "A ordem foi movida para finalizadas.",
      });
      
      loadOrdensServico();
    } catch (error: any) {
      console.error('Erro ao reprovar ordem:', error);
      toast({
        title: "Erro",
        description: error?.message || "Erro ao reprovar ordem de serviço",
        variant: "destructive",
      });
    }
  };

  const handleOpenLabel = (ordem: any) => {
    setSelectedOrdemForLabel(ordem);
  };

  const handleExportPDF = async (ordem: any) => {
    try {
      const { default: jsPDF } = await import('jspdf');
      
      // Buscar dados completos da ordem e recebimento
      const { data: recebimentoData } = await supabase
        .from('recebimentos')
        .select('*')
        .eq('id', ordem.recebimento_id)
        .single();

      // Buscar fotos do equipamento
      const { data: fotosData } = await supabase
        .from('fotos_equipamentos')
        .select('*')
        .eq('recebimento_id', ordem.recebimento_id)
        .order('created_at', { ascending: true });

      const EMPRESA_INFO = {
        nome: "MEC-HIDRO MECANICA E HIDRAULICA LTDA",
        cnpj: "03.328.334/0001-87",
        telefone: "(19) 3026-6227",
        email: "contato@mechidro.com.br"
      };
      
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      let yPosition = 10;
      
      // Cabeçalho
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(EMPRESA_INFO.nome, 20, yPosition + 5);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`CNPJ: ${EMPRESA_INFO.cnpj}`, 20, yPosition + 12);
      doc.text(`Tel: ${EMPRESA_INFO.telefone}`, 20, yPosition + 17);
      doc.text(`Email: ${EMPRESA_INFO.email}`, 20, yPosition + 22);
      
      // Linha separadora
      doc.setDrawColor(220, 38, 38);
      doc.setLineWidth(1);
      doc.line(20, yPosition + 28, pageWidth - 20, yPosition + 28);
      
      yPosition = 48;
      
      // Título
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(220, 38, 38);
      doc.text("ORDEM DE SERVIÇO", pageWidth / 2, yPosition, { align: "center" });
      doc.setTextColor(0, 0, 0);
      
      yPosition = 65;
      
      // Função para criar tabela
      const criarTabela = (titulo: string, dados: Array<{label: string, value: string}>) => {
        if (dados.length === 0) return;
        
        if (yPosition > 210) {
          doc.addPage();
          yPosition = 20;
        }
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(255, 255, 255);
        doc.setFillColor(128, 128, 128);
        doc.rect(20, yPosition, pageWidth - 40, 10, 'F');
        doc.text(titulo.toUpperCase(), pageWidth / 2, yPosition + 7, { align: 'center' });
        yPosition += 10;
        
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        
        dados.forEach((item, index) => {
          if (index % 2 === 0) {
            doc.setFillColor(245, 245, 245);
          } else {
            doc.setFillColor(255, 255, 255);
          }
          doc.rect(20, yPosition, pageWidth - 40, 10, 'F');
          doc.setDrawColor(200, 200, 200);
          doc.rect(20, yPosition, pageWidth - 40, 10);
          
          doc.setFont('helvetica', 'bold');
          doc.text(item.label, 25, yPosition + 7);
          doc.setFont('helvetica', 'normal');
          const valorLines = doc.splitTextToSize(item.value, pageWidth - 110);
          doc.text(valorLines, 95, yPosition + 7);
          yPosition += 10;
        });
        
        yPosition += 10;
      };

      // Função para criar tabela com colunas
      const criarTabelaColunas = (titulo: string, colunas: string[], dados: string[][]) => {
        if (dados.length === 0) return;
        
        if (yPosition > 210) {
          doc.addPage();
          yPosition = 20;
        }
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(255, 255, 255);
        doc.setFillColor(128, 128, 128);
        doc.rect(20, yPosition, pageWidth - 40, 10, 'F');
        doc.text(titulo.toUpperCase(), pageWidth / 2, yPosition + 7, { align: 'center' });
        yPosition += 10;
        
        const colWidths = colunas.length === 2 ? [20, pageWidth - 80] : [20, 60, 40, 45];
        
        // Cabeçalho das colunas
        doc.setFillColor(200, 200, 200);
        doc.rect(20, yPosition, pageWidth - 40, 8, 'F');
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        
        let xPos = 25;
        colunas.forEach((col, i) => {
          doc.text(col, xPos, yPosition + 5);
          xPos += colWidths[i];
        });
        yPosition += 8;
        
        // Dados
        doc.setFont('helvetica', 'normal');
        dados.forEach((linha, index) => {
          if (index % 2 === 0) {
            doc.setFillColor(245, 245, 245);
          } else {
            doc.setFillColor(255, 255, 255);
          }
          doc.rect(20, yPosition, pageWidth - 40, 7, 'F');
          doc.setDrawColor(200, 200, 200);
          doc.rect(20, yPosition, pageWidth - 40, 7);
          
          xPos = 25;
          linha.forEach((valor, i) => {
            const textoQuebrado = doc.splitTextToSize(valor, colWidths[i] - 5);
            doc.text(textoQuebrado[0], xPos, yPosition + 5);
            xPos += colWidths[i];
          });
          yPosition += 7;
        });
        
        yPosition += 10;
      };

      // Função para adicionar fotos em grade 2x2
      const adicionarFotosGrade = async (fotos: string[], titulo: string) => {
        if (fotos.length === 0) return;
        
        if (yPosition > 210) {
          doc.addPage();
          yPosition = 20;
        }
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(220, 38, 38);
        doc.text(titulo, 20, yPosition);
        doc.setTextColor(0, 0, 0);
        yPosition += 10;
        
        const fotosPorPagina = 4;
        const maxFotoWidth = 80;
        const maxFotoHeight = 55;
        const espacoHorizontal = 12;
        const espacoVertical = 12;
        
        for (let i = 0; i < fotos.length; i += fotosPorPagina) {
          if (i > 0) {
            doc.addPage();
            yPosition = 20;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            doc.setTextColor(220, 38, 38);
            doc.text(titulo + ' (continuação)', 20, yPosition);
            doc.setTextColor(0, 0, 0);
            yPosition += 10;
          }
          
          const fotosPagina = fotos.slice(i, i + fotosPorPagina);
          
          for (let j = 0; j < fotosPagina.length; j++) {
            const col = j % 2;
            const row = Math.floor(j / 2);
            const xPos = 20 + col * (maxFotoWidth + espacoHorizontal);
            const yPos = yPosition + row * (maxFotoHeight + espacoVertical);
            
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
                img.src = fotosPagina[j];
              });
            } catch (error) {
              console.error('Erro ao adicionar foto:', error);
            }
          }
          
          if (i + fotosPorPagina < fotos.length) {
            yPosition = 280;
          } else {
            yPosition += Math.ceil(fotosPagina.length / 2) * (maxFotoHeight + espacoVertical) + 10;
          }
        }
      };
      
      // Informações Básicas
      const dadosBasicos = [
        { label: 'Cliente:', value: ordem.recebimentos?.cliente_nome || ordem.cliente_nome },
        { label: 'Equipamento:', value: ordem.recebimentos?.tipo_equipamento || ordem.equipamento },
        { label: 'Data de Entrada:', value: new Date(ordem.data_entrada).toLocaleDateString('pt-BR') },
        { label: 'Técnico:', value: ordem.tecnico || '' },
        { label: 'Prioridade:', value: ordem.prioridade || '' }
      ];
      criarTabela('Informações Básicas', dadosBasicos);
      
      // Peritagem (dados técnicos do recebimento)
      if (recebimentoData) {
        const dadosPeritagem = [];
        if (recebimentoData.camisa) dadosPeritagem.push({ label: 'Ø Camisa:', value: recebimentoData.camisa });
        if (recebimentoData.haste_comprimento) dadosPeritagem.push({ label: 'Ø Haste x Comprimento:', value: recebimentoData.haste_comprimento });
        if (recebimentoData.curso) dadosPeritagem.push({ label: 'Curso:', value: recebimentoData.curso });
        if (recebimentoData.conexao_a) dadosPeritagem.push({ label: 'Conexão A:', value: recebimentoData.conexao_a });
        if (recebimentoData.conexao_b) dadosPeritagem.push({ label: 'Conexão B:', value: recebimentoData.conexao_b });
        if (recebimentoData.pressao_trabalho) dadosPeritagem.push({ label: 'Pressão de Trabalho:', value: recebimentoData.pressao_trabalho });
        
        if (dadosPeritagem.length > 0) {
          criarTabela('Peritagem', dadosPeritagem);
        }
      }
      
      // Problemas Identificados
      if (ordem.descricao_problema) {
        criarTabela('Problemas Identificados', [
          { label: 'Descrição:', value: ordem.descricao_problema }
        ]);
      }
      
      // Serviços Realizados
      if (ordem.servicos_necessarios && Array.isArray(ordem.servicos_necessarios) && ordem.servicos_necessarios.length > 0) {
        const servicosData = ordem.servicos_necessarios.map((s: any) => [
          s.quantidade?.toString() || '1',
          s.nome || s.servico || ''
        ]);
        criarTabelaColunas('Serviços Realizados', ['Qtd.', 'Descrição'], servicosData);
      }
      
      // Usinagem
      if (ordem.usinagem_necessaria && Array.isArray(ordem.usinagem_necessaria) && ordem.usinagem_necessaria.length > 0) {
        const usinagemData = ordem.usinagem_necessaria.map((u: any) => [
          u.quantidade?.toString() || '1',
          u.nome || u.descricao || ''
        ]);
        criarTabelaColunas('Usinagem', ['Qtd.', 'Descrição'], usinagemData);
      }
      
      // Peças Utilizadas
      if (ordem.pecas_necessarias && Array.isArray(ordem.pecas_necessarias) && ordem.pecas_necessarias.length > 0) {
        const pecasData = ordem.pecas_necessarias.map((p: any) => [
          p.quantidade?.toString() || '1',
          p.peca || p.nome || ''
        ]);
        criarTabelaColunas('Peças Utilizadas', ['Qtd.', 'Descrição'], pecasData);
      }

      // Adicionar fotos do equipamento
      if (fotosData && fotosData.length > 0) {
        const fotosUrls = fotosData.map(foto => foto.arquivo_url);
        await adicionarFotosGrade(fotosUrls, 'Fotos da Análise');
      }

      // Rodapé
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(`Página ${i} de ${totalPages}`, 20, 287);
        doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy, HH:mm:ss')}`, pageWidth - 20, 287, { align: 'right' });
      }
      
      doc.save(`analise-tecnica-${ordem.recebimentos?.cliente_nome || ordem.cliente_nome}_${ordem.numero_ordem}.pdf`);
      
      toast({
        title: "PDF exportado",
        description: "A análise técnica foi gerada com sucesso",
      });
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast({
        title: "Erro",
        description: "Erro ao exportar PDF",
        variant: "destructive",
      });
    }
  };

  const filteredOrdensServico = getSortedOrdens(
    ordensServico.filter(ordem => {
      const clienteNome = ordem.recebimentos?.cliente_nome || ordem.cliente_nome || '';
      const numeroOrdem = ordem.recebimentos?.numero_ordem || ordem.numero_ordem || '';
      const equipamento = ordem.recebimentos?.tipo_equipamento || ordem.equipamento || '';
      
      return clienteNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
             numeroOrdem.toLowerCase().includes(searchTerm.toLowerCase()) ||
             equipamento.toLowerCase().includes(searchTerm.toLowerCase());
    })
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "aguardando_orcamento":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "aguardando_aprovacao":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "em_andamento":
        return "bg-warning text-warning-foreground";
      case "concluida":
        return "bg-accent text-accent-foreground";
      case "aguardando_pecas":
        return "bg-destructive text-destructive-foreground";
      case "aprovada":
        return "bg-green-100 text-green-800 border-green-300";
      case "reprovada":
        return "bg-red-100 text-red-800 border-red-300";
      case "faturado":
        return "bg-purple-100 text-purple-800 border-purple-300";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  const getStatusTexto = (status: string) => {
    const statusMap: Record<string, string> = {
      'aguardando_orcamento': 'Aguardando Orçamento',
      'aguardando_aprovacao': 'Aguardando Aprovação',
      'em_andamento': 'Em Andamento',
      'concluida': 'Concluída',
      'aguardando_pecas': 'Aguardando Peças',
      'aprovada': 'Aprovada',
      'reprovada': 'Reprovada',
      'faturado': 'Faturado'
    };
    
    return statusMap[status] || status;
  };

  const getPrioridadeColor = (prioridade: string) => {
    switch (prioridade) {
      case "alta":
        return "bg-destructive/10 text-destructive border-destructive/20";
      case "media":
        return "bg-warning/10 text-warning-foreground border-warning/20";
      case "baixa":
        return "bg-accent/10 text-accent-foreground border-accent/20";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  const exportToPDF = async () => {
    const jsPDF = (await import('jspdf')).default;
    const html2canvas = (await import('html2canvas')).default;
    
    const doc = new jsPDF();
    
    // Cabeçalho da empresa
    doc.setFillColor(220, 53, 69); // Vermelho da empresa
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('MEC-HIDRO MECÂNICA E HIDRÁULICA LTDA', 15, 20);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('CNPJ: 93.338.138/0001-97', 15, 28);
    doc.text('Fone/Fax: (19) 3945-4527', 15, 34);
    
    // Título do relatório
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório de Análises Técnicas', 15, 55);
    
    // Data do relatório
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 150, 55);
    
    // Tabela de análises
    let yPosition = 70;
    const lineHeight = 8;
    
    // Cabeçalho da tabela
    doc.setFillColor(240, 240, 240);
    doc.rect(15, yPosition, 180, 10, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Nº Ordem', 20, yPosition + 7);
    doc.text('Cliente', 50, yPosition + 7);
    doc.text('Equipamento', 100, yPosition + 7);
    doc.text('Status', 150, yPosition + 7);
    
    yPosition += 15;
    
    // Dados das ordens de serviço
    doc.setFont('helvetica', 'normal');
    filteredOrdensServico.forEach((ordem, index) => {
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }
      
      doc.text(ordem.numero_ordem, 20, yPosition);
      doc.text(ordem.cliente_nome.substring(0, 25) + (ordem.cliente_nome.length > 25 ? '...' : ''), 50, yPosition);
      doc.text(ordem.equipamento.substring(0, 20) + (ordem.equipamento.length > 20 ? '...' : ''), 100, yPosition);
      doc.text(ordem.status, 150, yPosition);
      
      yPosition += lineHeight;
    });
    
    // Rodapé
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFillColor(220, 53, 69);
      doc.triangle(180, 280, 210, 280, 210, 297, 'F');
      doc.setTextColor(128, 128, 128);
      doc.setFontSize(8);
      doc.text(`Página ${i} de ${totalPages}`, 15, 290);
    }
    
    doc.save('relatorio-ordens-servico.pdf');
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Ordens de Serviço</h2>
            <p className="text-muted-foreground">
              Gerencie todas as ordens de serviço de equipamentos
            </p>
          </div>
          <Button 
            className="bg-gradient-primary hover:bg-primary-hover transition-smooth shadow-medium"
            onClick={() => navigate('/analise/novo-ordem-direta')}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Ordem de Serviço
          </Button>
        </div>

        <Card className="shadow-soft">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Lista de Ordens de Serviço</CardTitle>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente, ordem ou equipamento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              onClick={exportToPDF}
              variant="outline"
              className="gap-2"
            >
              <FileText className="h-4 w-4" />
              Exportar PDF
            </Button>
          </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Carregando...</div>
            ) : (
              <div className="rounded-md border">
                <Table>
                   <TableHeader>
                     <TableRow className="bg-muted/50">
                       <TableHead 
                         className="font-semibold text-foreground cursor-pointer hover:bg-muted transition-colors"
                         onClick={() => handleSort('numero_ordem')}
                       >
                         <div className="flex items-center gap-2">
                           Nº da Ordem
                           {sortConfig?.key === 'numero_ordem' && (
                             sortConfig.direction === 'asc' ? '↑' : '↓'
                           )}
                         </div>
                       </TableHead>
                       <TableHead 
                         className="font-semibold text-foreground cursor-pointer hover:bg-muted transition-colors"
                         onClick={() => handleSort('cliente')}
                       >
                         <div className="flex items-center gap-2">
                           Cliente
                           {sortConfig?.key === 'cliente' && (
                             sortConfig.direction === 'asc' ? '↑' : '↓'
                           )}
                         </div>
                       </TableHead>
                       <TableHead 
                         className="font-semibold text-foreground cursor-pointer hover:bg-muted transition-colors"
                         onClick={() => handleSort('equipamento')}
                       >
                         <div className="flex items-center gap-2">
                           Equipamento
                           {sortConfig?.key === 'equipamento' && (
                             sortConfig.direction === 'asc' ? '↑' : '↓'
                           )}
                         </div>
                       </TableHead>
                       <TableHead 
                         className="font-semibold text-foreground cursor-pointer hover:bg-muted transition-colors"
                         onClick={() => handleSort('status')}
                       >
                         <div className="flex items-center gap-2">
                           Status
                           {sortConfig?.key === 'status' && (
                             sortConfig.direction === 'asc' ? '↑' : '↓'
                           )}
                         </div>
                       </TableHead>
                       <TableHead 
                         className="font-semibold text-foreground cursor-pointer hover:bg-muted transition-colors"
                         onClick={() => handleSort('data_entrada')}
                       >
                         <div className="flex items-center gap-2">
                           Data de Entrada
                           {sortConfig?.key === 'data_entrada' && (
                             sortConfig.direction === 'asc' ? '↑' : '↓'
                           )}
                         </div>
                       </TableHead>
                       <TableHead className="font-semibold text-foreground text-right">Ações</TableHead>
                     </TableRow>
                   </TableHeader>
                  <TableBody>
                     {filteredOrdensServico.length === 0 ? (
                       <TableRow>
                         <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                           Nenhuma ordem de serviço encontrada
                         </TableCell>
                       </TableRow>
                     ) : (
                       filteredOrdensServico.map((ordem) => (
                         <TableRow key={ordem.id} className="hover:bg-muted/30 transition-fast">
                             <TableCell className="font-medium text-primary">
                               {ordem.recebimentos?.numero_ordem || ordem.numero_ordem}
                             </TableCell>
                           <TableCell className="text-primary font-medium">
                             {ordem.recebimentos?.cliente_nome || ordem.cliente_nome}
                           </TableCell>
                           <TableCell className="text-foreground">
                             {ordem.recebimentos?.tipo_equipamento || ordem.equipamento}
                           </TableCell>
                           <TableCell>
                             <Badge className={getStatusColor(getStatusDinamico(ordem))}>
                               {getStatusTexto(getStatusDinamico(ordem))}
                             </Badge>
                           </TableCell>
                           <TableCell className="text-muted-foreground">
                             {new Date(ordem.data_entrada).toLocaleDateString('pt-BR')}
                           </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-8 w-8 p-0"
                                        title="Ações"
                                      >
                                        <Settings className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48 bg-popover z-50">
                                      <DropdownMenuItem onClick={() => handleOpenLabel(ordem)}>
                                        <Tag className="h-4 w-4 mr-2" />
                                        Imprimir Etiqueta
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => navigate(`/analise/novo/${encodeURIComponent(ordem.numero_ordem)}`)}>
                                        <Edit className="h-4 w-4 mr-2" />
                                        Editar
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleExportPDF(ordem)}>
                                        <Download className="h-4 w-4 mr-2" />
                                        Baixar PDF
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                                    onClick={() => handleApprove(ordem.id)}
                                    title="Aprovar"
                                  >
                                    <ThumbsUp className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => handleReject(ordem.id)}
                                    title="Rejeitar"
                                  >
                                    <ThumbsDown className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                         </TableRow>
                       ))
                     )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {selectedOrdemForLabel && (
        <EquipmentLabel
          equipment={{
            numeroOrdem: selectedOrdemForLabel.recebimentos?.numero_ordem || selectedOrdemForLabel.numero_ordem,
            cliente: selectedOrdemForLabel.recebimentos?.cliente_nome || selectedOrdemForLabel.cliente_nome,
            dataEntrada: new Date(selectedOrdemForLabel.data_entrada).toLocaleDateString('pt-BR')
          }}
          onClose={() => setSelectedOrdemForLabel(null)}
        />
      )}
    </AppLayout>
  );
}