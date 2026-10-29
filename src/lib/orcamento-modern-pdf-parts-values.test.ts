import { describe, expect, it } from "vitest";
import { pecasMostramValores } from "./orcamento-modern-pdf";

describe("pecasMostramValores", () => {
  it("mostra a somatória quando o toggle Valores no PDF está ligado", () => {
    const itens = [{ tipo: "peca", descricao: "Piston", quantidade: 2, valorUnitario: 0 }];
    expect(pecasMostramValores(itens, true)).toBe(true);
  });

  it("mostra a somatória quando qualquer peça tem preço unitário, mesmo sem o toggle", () => {
    const itens = [
      { tipo: "peca", descricao: "Piston", quantidade: 2, valorUnitario: 120 },
      { tipo: "servico", descricao: "Repair", quantidade: 1, valorUnitario: 500 },
    ];
    expect(pecasMostramValores(itens, false)).toBe(true);
  });

  it("aceita itens em snake_case vindos do banco", () => {
    const itens = [{ tipo: "peca", quantidade: 1, valor_unitario: 45.5 }];
    expect(pecasMostramValores(itens, undefined)).toBe(true);
  });

  it("não mostra a somatória quando não há toggle e nenhuma peça tem preço", () => {
    const itens = [
      { tipo: "peca", quantidade: 1, valorUnitario: 0 },
      { tipo: "servico", quantidade: 1, valorUnitario: 900 },
    ];
    expect(pecasMostramValores(itens, false)).toBe(false);
    expect(pecasMostramValores([], undefined)).toBe(false);
  });
});
