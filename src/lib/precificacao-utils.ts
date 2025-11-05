import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";

export interface CustoVariavel {
  descricao: string;
  valor: number;
}

// Cálculos
export const calcularImpostos = (precoDesejado: number, percentual: number): number => {
  return (precoDesejado * percentual) / 100;
};

export const calcularComissao = (precoDesejado: number, percentual: number): number => {
  return (precoDesejado * percentual) / 100;
};

export const calcularTotalCustosVariaveis = (custos: CustoVariavel[]): number => {
  return custos.reduce((total, custo) => total + Number(custo.valor), 0);
};

export const calcularMargemContribuicao = (precoDesejado: number, totalCustos: number): number => {
  return precoDesejado - totalCustos;
};

export const calcularPercentualMargem = (margem: number, precoDesejado: number): number => {
  if (precoDesejado === 0) return 0;
  return (margem / precoDesejado) * 100;
};

// Formatação
export const formatarMoeda = (valor: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor);
};

export const formatarPercentual = (valor: number): string => {
  return `${valor.toFixed(2)}%`;
};

// PDF
export const gerarPDFPrecificacao = async (orcamento: any, fotos?: any[]) => {
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    let yPosition = 20;

    // Cabeçalho
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("ANÁLISE DE PRECIFICAÇÃO", pageWidth / 2, yPosition, { align: "center" });
    yPosition += 15;

    // Informações básicas
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Orçamento: ${orcamento.numero}`, 20, yPosition);
    doc.text(`Data: ${new Date().toLocaleDateString("pt-BR")}`, pageWidth - 60, yPosition);
    yPosition += 8;
    doc.text(`Cliente: ${orcamento.cliente_nome}`, 20, yPosition);
    yPosition += 8;
    doc.text(`Equipamento: ${orcamento.equipamento}`, 20, yPosition);
    yPosition += 8;
    
    // Indicação de revisão
    if (orcamento.numero_revisao) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(220, 38, 38); // vermelho
      doc.text(`REVISÃO ${orcamento.numero_revisao}`, 20, yPosition);
      doc.setTextColor(0, 0, 0);
      yPosition += 8;
    }
    yPosition += 7;

    // Fotos da Precificação
    if (fotos && fotos.length > 0) {
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("FOTOS DA PRECIFICAÇÃO", 20, yPosition);
      yPosition += 10;
      
      for (const foto of fotos) {
        try {
          const { data } = supabase.storage
            .from('documentos')
            .getPublicUrl(foto.arquivo_url);
          
          if (data?.publicUrl) {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = data.publicUrl;
            
            await new Promise((resolve, reject) => {
              img.onload = resolve;
              img.onerror = reject;
            });
            
            const maxWidth = 170;
            const imgWidth = img.width;
            const imgHeight = img.height;
            const ratio = maxWidth / imgWidth;
            const width = maxWidth;
            const height = imgHeight * ratio;
            
            if (yPosition + height > 270) {
              doc.addPage();
              yPosition = 20;
            }
            
            doc.addImage(img, 'JPEG', 20, yPosition, width, height);
            yPosition += height + 10;
          }
        } catch (error) {
          console.error('Erro ao adicionar foto ao PDF:', error);
        }
      }
      
      yPosition += 5;
    }

    // Preço Desejado
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setFillColor(59, 130, 246); // blue
    doc.rect(15, yPosition - 5, pageWidth - 30, 15, "F");
    doc.setTextColor(255, 255, 255);
    doc.text(`PREÇO DESEJADO: ${formatarMoeda(orcamento.preco_desejado || 0)}`, pageWidth / 2, yPosition + 5, { align: "center" });
    doc.setTextColor(0, 0, 0);
    yPosition += 25;

    // Custos e Despesas
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("CUSTOS E DESPESAS VARIÁVEIS", 20, yPosition);
    yPosition += 10;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);

    // Impostos
    const impostosPerc = orcamento.impostos_percentual || 0;
    const impostosValor = orcamento.impostos_valor || 0;
    doc.text(`Impostos:`, 25, yPosition);
    doc.text(`${formatarPercentual(impostosPerc)}`, 100, yPosition);
    doc.text(`${formatarMoeda(impostosValor)}`, pageWidth - 50, yPosition, { align: "right" });
    yPosition += 8;

    // Comissão
    const comissaoPerc = orcamento.comissao_percentual || 0;
    const comissaoValor = orcamento.comissao_valor || 0;
    doc.text(`Comissão:`, 25, yPosition);
    doc.text(`${formatarPercentual(comissaoPerc)}`, 100, yPosition);
    doc.text(`${formatarMoeda(comissaoValor)}`, pageWidth - 50, yPosition, { align: "right" });
    yPosition += 12;

    // Custos Variáveis
    const custosVariaveis: CustoVariavel[] = orcamento.custos_variaveis || [];
    if (custosVariaveis.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.text("Custos Variáveis:", 25, yPosition);
      yPosition += 8;
      doc.setFont("helvetica", "normal");

      custosVariaveis.forEach((custo) => {
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }
        doc.text(`• ${custo.descricao}`, 30, yPosition);
        doc.text(`${formatarMoeda(custo.valor)}`, pageWidth - 50, yPosition, { align: "right" });
        yPosition += 7;
      });
      yPosition += 5;
    }

    // Total Custos
    const totalCustos = impostosValor + comissaoValor + (orcamento.total_custos_variaveis || 0);
    doc.setFont("helvetica", "bold");
    doc.line(25, yPosition, pageWidth - 25, yPosition);
    yPosition += 8;
    doc.text("TOTAL CUSTOS:", 25, yPosition);
    doc.text(`${formatarMoeda(totalCustos)}`, pageWidth - 50, yPosition, { align: "right" });
    yPosition += 15;

    // Margem de Contribuição
    const margem = orcamento.margem_contribuicao || 0;
    const percentualMargem = orcamento.percentual_margem || 0;
    const corMargem = percentualMargem >= 50 ? [34, 197, 94] : percentualMargem >= 30 ? [234, 179, 8] : [239, 68, 68];
    
    doc.setFillColor(corMargem[0], corMargem[1], corMargem[2]);
    doc.rect(15, yPosition - 5, pageWidth - 30, 20, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.text("MARGEM DE CONTRIBUIÇÃO", pageWidth / 2, yPosition + 3, { align: "center" });
    doc.setFontSize(16);
    doc.text(`${formatarMoeda(margem)}`, pageWidth / 2 - 30, yPosition + 12, { align: "center" });
    doc.text(`${formatarPercentual(percentualMargem)}`, pageWidth / 2 + 30, yPosition + 12, { align: "center" });
    doc.setTextColor(0, 0, 0);
    yPosition += 30;

    // Rodapé
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, 20, yPosition);

    const sufixoRevisao = orcamento.numero_revisao ? `_REV${orcamento.numero_revisao}` : '';
    doc.save(`Precificacao_Orcamento_${orcamento.numero}${sufixoRevisao}.pdf`);
    return true;
  } catch (error) {
    console.error("Erro ao gerar PDF de precificação:", error);
    return false;
  }
};
