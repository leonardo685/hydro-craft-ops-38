// Utilitários para geração de PDF do DANFE usando jsPDF
import jsPDF from "jspdf";
import type { DadosNFe, ItemNFe } from "./nfe-utils";

/**
 * Formatar valor monetário
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

/**
 * Formatar data para exibição
 */
function formatDate(dateString: string): string {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  } catch {
    return dateString;
  }
}

/**
 * Formatar chave de acesso com espaços para melhor legibilidade
 */
function formatChaveAcesso(chave: string): string {
  const limpa = chave.replace(/\D/g, '');
  return limpa.replace(/(\d{4})/g, '$1 ').trim();
}

/**
 * Gerar PDF do DANFE (Documento Auxiliar da Nota Fiscal Eletrônica)
 */
export function gerarPdfDanfe(dados: DadosNFe): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 15;

  // ===== CABEÇALHO =====
  doc.setFillColor(20, 80, 140);
  doc.rect(margin, y - 5, pageWidth - margin * 2, 18, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('DANFE', pageWidth / 2, y + 3, { align: 'center' });
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Documento Auxiliar da Nota Fiscal Eletrônica', pageWidth / 2, y + 9, { align: 'center' });
  
  y += 20;
  doc.setTextColor(0, 0, 0);

  // ===== CHAVE DE ACESSO =====
  doc.setFillColor(245, 245, 245);
  doc.rect(margin, y, pageWidth - margin * 2, 16, 'F');
  doc.setDrawColor(200, 200, 200);
  doc.rect(margin, y, pageWidth - margin * 2, 16, 'S');
  
  y += 5;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('CHAVE DE ACESSO', margin + 3, y);
  
  y += 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const chaveFormatada = formatChaveAcesso(dados.chaveAcesso);
  doc.text(chaveFormatada, pageWidth / 2, y, { align: 'center' });
  
  y += 12;

  // ===== DADOS DA NOTA =====
  doc.setDrawColor(200, 200, 200);
  doc.rect(margin, y, pageWidth - margin * 2, 20, 'S');
  
  const col1 = margin + 3;
  const col2 = margin + 50;
  const col3 = margin + 100;
  const col4 = margin + 145;
  
  y += 5;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('Nº DA NF-e', col1, y);
  doc.text('SÉRIE', col2, y);
  doc.text('DATA EMISSÃO', col3, y);
  doc.text('MODELO', col4, y);
  
  y += 6;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(dados.numero || '-', col1, y);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(dados.serie || '-', col2, y);
  doc.text(formatDate(dados.dataEmissao), col3, y);
  doc.text(dados.modelo || 'NFe', col4, y);
  
  y += 14;

  // ===== EMITENTE =====
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, y, pageWidth - margin * 2, 8, 'F');
  doc.setDrawColor(200, 200, 200);
  doc.rect(margin, y, pageWidth - margin * 2, 8, 'S');
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('EMITENTE / REMETENTE', margin + 3, y + 5.5);
  
  y += 10;
  doc.rect(margin, y, pageWidth - margin * 2, 18, 'S');
  
  y += 5;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Razão Social:', margin + 3, y);
  doc.setFont('helvetica', 'normal');
  doc.text(dados.nomeEmitente || '-', margin + 30, y);
  
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('CNPJ:', margin + 3, y);
  doc.setFont('helvetica', 'normal');
  doc.text(dados.cnpjEmitente || '-', margin + 20, y);
  
  y += 14;

  // ===== DESTINATÁRIO =====
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, y, pageWidth - margin * 2, 8, 'F');
  doc.setDrawColor(200, 200, 200);
  doc.rect(margin, y, pageWidth - margin * 2, 8, 'S');
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('DESTINATÁRIO', margin + 3, y + 5.5);
  
  y += 10;
  doc.rect(margin, y, pageWidth - margin * 2, 18, 'S');
  
  y += 5;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Nome/Razão Social:', margin + 3, y);
  doc.setFont('helvetica', 'normal');
  doc.text(dados.clienteNome || '-', margin + 40, y);
  
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('CNPJ/CPF:', margin + 3, y);
  doc.setFont('helvetica', 'normal');
  doc.text(dados.clienteCnpj || '-', margin + 25, y);
  
  y += 14;

  // ===== PRODUTOS / SERVIÇOS =====
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, y, pageWidth - margin * 2, 8, 'F');
  doc.setDrawColor(200, 200, 200);
  doc.rect(margin, y, pageWidth - margin * 2, 8, 'S');
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('PRODUTOS / SERVIÇOS', margin + 3, y + 5.5);
  
  y += 10;

  // Cabeçalho da tabela de produtos
  const tableX = margin;
  const colWidths = [20, 85, 20, 30, 30]; // Código, Descrição, Qtd, Vl.Unit, Vl.Total
  
  doc.setFillColor(230, 230, 230);
  doc.rect(tableX, y, pageWidth - margin * 2, 8, 'F');
  doc.rect(tableX, y, pageWidth - margin * 2, 8, 'S');
  
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  let colX = tableX + 2;
  doc.text('CÓDIGO', colX, y + 5);
  colX += colWidths[0];
  doc.text('DESCRIÇÃO DO PRODUTO / SERVIÇO', colX, y + 5);
  colX += colWidths[1];
  doc.text('QTD', colX, y + 5);
  colX += colWidths[2];
  doc.text('VL. UNIT.', colX, y + 5);
  colX += colWidths[3];
  doc.text('VL. TOTAL', colX, y + 5);
  
  y += 8;

  // Linhas de produtos
  const itens = dados.itens || [];
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  
  itens.forEach((item: ItemNFe, index: number) => {
    // Verificar se precisa de nova página
    if (y > 260) {
      doc.addPage();
      y = 20;
    }
    
    const rowHeight = 7;
    
    // Alternar cor de fundo das linhas
    if (index % 2 === 0) {
      doc.setFillColor(252, 252, 252);
      doc.rect(tableX, y, pageWidth - margin * 2, rowHeight, 'F');
    }
    doc.rect(tableX, y, pageWidth - margin * 2, rowHeight, 'S');
    
    colX = tableX + 2;
    doc.text(item.codigo?.substring(0, 12) || '-', colX, y + 5);
    colX += colWidths[0];
    
    // Truncar descrição se muito longa
    const descricaoTruncada = item.descricao?.length > 55 
      ? item.descricao.substring(0, 52) + '...' 
      : (item.descricao || '-');
    doc.text(descricaoTruncada, colX, y + 5);
    colX += colWidths[1];
    
    doc.text(item.quantidade?.toString() || '1', colX, y + 5);
    colX += colWidths[2];
    doc.text(formatCurrency(item.valorUnitario || 0), colX, y + 5);
    colX += colWidths[3];
    doc.text(formatCurrency(item.valorTotal || 0), colX, y + 5);
    
    y += rowHeight;
  });

  // Se não houver itens, mostrar mensagem
  if (itens.length === 0) {
    doc.rect(tableX, y, pageWidth - margin * 2, 10, 'S');
    doc.setFont('helvetica', 'italic');
    doc.text('Nenhum item encontrado', pageWidth / 2, y + 6, { align: 'center' });
    y += 10;
  }

  y += 5;

  // ===== TOTAIS =====
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, y, pageWidth - margin * 2, 8, 'F');
  doc.setDrawColor(200, 200, 200);
  doc.rect(margin, y, pageWidth - margin * 2, 8, 'S');
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAIS', margin + 3, y + 5.5);
  
  y += 10;
  doc.rect(margin, y, pageWidth - margin * 2, 12, 'S');
  
  // Calcular valor total
  const valorTotal = dados.valorTotal || itens.reduce((sum, item) => sum + (item.valorTotal || 0), 0);
  
  y += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('VALOR TOTAL DA NOTA:', pageWidth - margin - 80, y);
  doc.setFontSize(12);
  doc.text(formatCurrency(valorTotal), pageWidth - margin - 3, y, { align: 'right' });

  // ===== RODAPÉ =====
  y = doc.internal.pageSize.getHeight() - 20;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(128, 128, 128);
  doc.text('Documento gerado automaticamente pelo sistema - Não é documento fiscal válido', pageWidth / 2, y, { align: 'center' });
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, pageWidth / 2, y + 4, { align: 'center' });

  return doc;
}

/**
 * Baixar PDF do DANFE
 */
export function baixarPdfDanfe(dados: DadosNFe): void {
  const doc = gerarPdfDanfe(dados);
  const nomeArquivo = `DANFE-${dados.numero || 'sem-numero'}-${dados.serie || '1'}.pdf`;
  doc.save(nomeArquivo);
}
