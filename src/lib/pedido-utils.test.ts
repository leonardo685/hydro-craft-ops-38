import { describe, expect, it } from "vitest";
import { normalizarNumeroPedido } from "./pedido-utils";

describe("normalizarNumeroPedido", () => {
  it("trata valores de preenchimento como sem pedido", () => {
    for (const valor of ["none", "None", "NONE", "n/a", "N/A", "na", "null", "undefined", "-", "sem", "nenhum", ""]) {
      expect(normalizarNumeroPedido(valor)).toBe("");
    }
  });

  it("preserva números reais de pedido", () => {
    expect(normalizarNumeroPedido("205731")).toBe("205731");
    expect(normalizarNumeroPedido(" PO: 205731 ")).toBe("205731");
    expect(normalizarNumeroPedido("contrato 1270")).toBe("contrato 1270");
    expect(normalizarNumeroPedido("verbal")).toBe("verbal");
    expect(normalizarNumeroPedido(null)).toBe("");
    expect(normalizarNumeroPedido(undefined)).toBe("");
  });
});
