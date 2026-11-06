import { describe, expect, it } from "vitest";
import { pecasMostramValores } from "./orcamento-modern-pdf";

describe("pecasMostramValores", () => {
  it("mostra a somatória quando o toggle Valores no PDF está ligado", () => {
    const itens = [{ tipo: "peca", descricao: "Piston", quantidade: 2, valorUnitario: 0 }];
    expect(pecasMostramValores(itens, true)).toBe(true);
  });

  it("oculta preços quando o toggle está desligado, mesmo com peça precificada", () => {
    const itens = [{ tipo: "peca", quantidade: 2, valorUnitario: 120 }];
    expect(pecasMostramValores(itens, false)).toBe(false);
  });

  it("mostra a somatória quando o flag não foi informado e há peça com preço", () => {
    const itens = [
      { tipo: "peca", descricao: "Piston", quantidade: 2, valorUnitario: 120 },
      { tipo: "servico", descricao: "Repair", quantidade: 1, valorUnitario: 500 },
    ];
    expect(pecasMostramValores(itens, undefined)).toBe(true);
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
