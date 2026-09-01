import type jsPDF from "jspdf";

/**
 * Aplica um estilo minimalista/moderno em PDFs gerados com jsPDF:
 * - Remove as "grades" (retângulos apenas com borda) e as substitui por
 *   uma linha divisória sutil na base da célula/linha.
 * - Suaviza os tons de cinza: faixas claras ficam quase brancas e faixas
 *   escuras ficam em carvão (mantendo legibilidade do texto branco).
 *
 * Uso: chamar logo após `const doc = new jsPDF()`.
 */
export function applyMinimalPdfStyle(doc: jsPDF) {
  const anyDoc = doc as any;
  if (anyDoc.__minimalStyled) return doc;
  anyDoc.__minimalStyled = true;

  const originalRect = doc.rect.bind(doc);
  const originalSetFillColor = doc.setFillColor.bind(doc) as any;

  let lastFill: [number, number, number] | null = null;

  anyDoc.setFillColor = (...args: any[]) => {
    if (args.length === 3 && args.every((v) => typeof v === "number")) {
      let [r, g, b] = args as [number, number, number];
      if (r === g && g === b) {
        // Tons neutros: suavizar
        if (r >= 200 && r < 255) {
          r = g = b = 247; // faixas de título claras
        } else if (r >= 100 && r < 200) {
          r = g = b = 38; // faixas de cabeçalho escuras (texto branco)
        }
      }
      lastFill = [r, g, b];
      return originalSetFillColor(r, g, b);
    }
    return originalSetFillColor(...args);
  };

  anyDoc.rect = (x: number, y: number, w: number, h: number, style?: string) => {
    if (!style) {
      // Sem preenchimento = era só grade: desenha apenas divisória inferior
      doc.setDrawColor(228, 228, 228);
      doc.setLineWidth(0.2);
      doc.line(x, y + h, x + w, y + h);
      return doc;
    }
    if (style === "F" && lastFill && lastFill.every((v) => v === 247)) {
      // Faixa de título clara: fundo suave + régua inferior
      originalRect(x, y, w, h, "F");
      doc.setDrawColor(210, 210, 210);
      doc.setLineWidth(0.3);
      doc.line(x, y + h, x + w, y + h);
      return doc;
    }
    return originalRect(x, y, w, h, style);
  };

  return doc;
}
