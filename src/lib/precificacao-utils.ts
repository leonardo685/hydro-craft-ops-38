import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";

export interface CustoVariavel {
  descricao: string;
  valor: number;
}

// ============ Custos Cilindros Hidráulicos ============

export type TipoItemCilindro =
  | "sae1045"
  | "sae1045_cromado"
  | "tubo_brunido"
  | "bronze_tm23"
  | "sae1020_chapa"
  | "oxicorte_redondo"
  | "ferro_fundido"
  | "servico_cromo"
  | "servico_brunimento";

export interface ItemCilindro {
  tipo: TipoItemCilindro;
  nome?: string;
  quantidade?: number;
  // Dimensões (mm)
  diametroExterno?: number;
  diametroInterno?: number;
  parede?: number;
  comprimento?: number;
  espessura?: number;
  largura?: number;
  // Comerciais
  valorKg?: number;
  valorDecimetro?: number;
  horas?: number;
  valorHora?: number;
  // Resultados calculados (persistidos para histórico/PDF)
  peso?: number;
  valorTotal: number;
}

export const DENSIDADES: Record<string, number> = {
  aco: 7.85,
  bronze: 8.8,
  ferro_fundido: 7.2,
};

// Valores padrão extraídos da planilha "Preço MP Cilindros Hidráulicos"
export const VALORES_PADRAO_CILINDRO: Record<TipoItemCilindro, Partial<ItemCilindro>> = {
  sae1045: { valorKg: 6.5 },
  sae1045_cromado: { valorKg: 22.0 },
  tubo_brunido: { valorKg: 43.93 },
  bronze_tm23: { valorKg: 23.0 },
  sae1020_chapa: { valorKg: 24.0 },
  oxicorte_redondo: { valorKg: 28.0 },
  ferro_fundido: { valorKg: 45.0 },
  servico_cromo: { valorDecimetro: 24.0 },
  servico_brunimento: { valorHora: 50.0 },
};

export const TIPOS_CILINDRO: { value: TipoItemCilindro; label: string; categoria: "materia_prima" | "servico" }[] = [
  { value: "sae1045", label: "SAE 1045 (Êmbolo, Amortecedor, Tampa, Varão, Tirante)", categoria: "materia_prima" },
  { value: "sae1045_cromado", label: "SAE 1045 Cromado (Haste)", categoria: "materia_prima" },
  { value: "tubo_brunido", label: "Tubo Brunido (Camisa)", categoria: "materia_prima" },
  { value: "bronze_tm23", label: "Bronze TM 23", categoria: "materia_prima" },
  { value: "sae1020_chapa", label: "SAE 1020 Oxicorte (Cabeçote)", categoria: "materia_prima" },
  { value: "oxicorte_redondo", label: "Oxicorte Redondo", categoria: "materia_prima" },
  { value: "ferro_fundido", label: "Ferro Fundido", categoria: "materia_prima" },
  { value: "servico_cromo", label: "Serviço de Cromo", categoria: "servico" },
  { value: "servico_brunimento", label: "Serviço de Brunimento", categoria: "servico" },
];

// Peso de cilindro maciço (kg). D e L em mm; densidade em g/cm³.
// V (cm³) = π × (D/2)² × L / 1000, depois × densidade / 1000 → kg
export const calcularPesoCilindroMacico = (diametroMm: number, comprimentoMm: number, densidade: number): number => {
  if (!diametroMm || !comprimentoMm) return 0;
  const raio = diametroMm / 2;
  const volumeCm3 = (Math.PI * raio * raio * comprimentoMm) / 1000;
  return (volumeCm3 * densidade) / 1000;
};

// Peso de tubo (kg). Calcula área anular (De² - Di²) × π/4 × L.
export const calcularPesoTubo = (deMm: number, diMm: number, comprimentoMm: number, densidade: number): number => {
  if (!deMm || !comprimentoMm) return 0;
  const areaMm2 = (Math.PI * (deMm * deMm - diMm * diMm)) / 4;
  const volumeCm3 = (areaMm2 * comprimentoMm) / 1000;
  return (volumeCm3 * densidade) / 1000;
};

// Peso de chapa retangular (kg). E×L×C em mm.
export const calcularPesoChapa = (espMm: number, largMm: number, compMm: number, densidade: number): number => {
  if (!espMm || !largMm || !compMm) return 0;
  const volumeCm3 = (espMm * largMm * compMm) / 1000;
  return (volumeCm3 * densidade) / 1000;
};

// Valor do serviço de cromo: área lateral (π×D×L) em dm² × valor/dm².
export const calcularValorCromo = (diametroMm: number, comprimentoMm: number, valorDecimetro: number): number => {
  if (!diametroMm || !comprimentoMm || !valorDecimetro) return 0;
  const areaMm2 = Math.PI * diametroMm * comprimentoMm;
  const areaDm2 = areaMm2 / 10000;
  return areaDm2 * valorDecimetro;
};

export const calcularValorBrunimento = (horas: number, valorHora: number): number => {
  return (horas || 0) * (valorHora || 0);
};

// Recalcula peso e valorTotal de um item conforme seu tipo.
export const recalcularItemCilindro = (item: ItemCilindro): ItemCilindro => {
  const novo = { ...item };
  const qtd = item.quantidade && item.quantidade > 0 ? item.quantidade : 1;
  switch (item.tipo) {
    case "sae1045":
    case "sae1045_cromado":
      novo.peso = calcularPesoCilindroMacico(item.diametroExterno || 0, item.comprimento || 0, DENSIDADES.aco);
      novo.valorTotal = (novo.peso || 0) * (item.valorKg || 0) * qtd;
      break;
    case "bronze_tm23":
      novo.peso = calcularPesoCilindroMacico(item.diametroExterno || 0, item.comprimento || 0, DENSIDADES.bronze);
      novo.valorTotal = (novo.peso || 0) * (item.valorKg || 0) * qtd;
      break;
    case "ferro_fundido":
      novo.peso = calcularPesoCilindroMacico(item.diametroExterno || 0, item.comprimento || 0, DENSIDADES.ferro_fundido);
      novo.valorTotal = (novo.peso || 0) * (item.valorKg || 0) * qtd;
      break;
    case "tubo_brunido":
    case "oxicorte_redondo":
      novo.peso = calcularPesoTubo(item.diametroExterno || 0, item.diametroInterno || 0, item.comprimento || 0, DENSIDADES.aco);
      novo.valorTotal = (novo.peso || 0) * (item.valorKg || 0) * qtd;
      break;
    case "sae1020_chapa":
      novo.peso = calcularPesoChapa(item.espessura || 0, item.largura || 0, item.comprimento || 0, DENSIDADES.aco);
      novo.valorTotal = (novo.peso || 0) * (item.valorKg || 0) * qtd;
      break;
    case "servico_cromo":
      novo.peso = undefined;
      novo.valorTotal = calcularValorCromo(item.diametroExterno || 0, item.comprimento || 0, item.valorDecimetro || 0) * qtd;
      break;
    case "servico_brunimento":
      novo.peso = undefined;
      novo.valorTotal = calcularValorBrunimento(item.horas || 0, item.valorHora || 0) * qtd;
      break;
  }
  return novo;
};

export const calcularTotalCilindros = (itens: ItemCilindro[]): number => {
  return (itens || []).reduce((acc, it) => acc + (Number(it.valorTotal) || 0), 0);
};

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
export const gerarPDFPrecificacao = async (orcamento: any) => {
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

    // Percentuais Customizados
    const precoDesejado = orcamento.preco_desejado || 0;
    const percentuaisCustomizados: CustoVariavel[] = orcamento.percentuais_customizados || [];
    if (percentuaisCustomizados.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.text("Outros Percentuais:", 25, yPosition);
      yPosition += 8;
      doc.setFont("helvetica", "normal");

      percentuaisCustomizados.forEach((item) => {
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }
        const valorCalculado = (precoDesejado * Number(item.valor)) / 100;
        doc.text(`• ${item.descricao}`, 30, yPosition);
        doc.text(`${formatarPercentual(Number(item.valor))}`, 100, yPosition);
        doc.text(`${formatarMoeda(valorCalculado)}`, pageWidth - 50, yPosition, { align: "right" });
        yPosition += 7;
      });
      yPosition += 5;
    }

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
    const totalPercentuaisCustomizados = percentuaisCustomizados.reduce(
      (acc, item) => acc + (precoDesejado * Number(item.valor)) / 100, 0
    );
    const totalCustos = impostosValor + comissaoValor + totalPercentuaisCustomizados + (orcamento.total_custos_variaveis || 0);
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
