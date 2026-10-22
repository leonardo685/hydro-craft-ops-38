import { describe, expect, it } from "vitest";
import { nomeArquivoOrcamentoPDF } from "./quote-filename";

describe("nomeArquivoOrcamentoPDF", () => {
  it("orçamento aprovado ou finalizado com P.O. recebe o número do P.O. na frente", () => {
    for (const status of ["aprovado", "faturamento", "faturado", "finalizado", "finalizada", "concluido", "concluído"]) {
      expect(
        nomeArquivoOrcamentoPDF({ numero: "MH-0142-26", status, numero_pedido: "45210" })
      ).toBe("PO 45210 - Invoice 142-26.pdf");
    }
  });

  it("orçamento aprovado/finalizado sem pedido vira apenas Invoice", () => {
    for (const semPedido of [undefined, null, "", "none", "N/A", "n/a", "-"]) {
      expect(
        nomeArquivoOrcamentoPDF({ numero: "MH-0142-26", status: "finalizado", numero_pedido: semPedido as any })
      ).toBe("Invoice 142-26.pdf");
    }
  });

  it("orçamento pendente continua Quote (Orcamento em português)", () => {
    expect(nomeArquivoOrcamentoPDF({ numero: "MH-0142-26", status: "pendente", numero_pedido: "45210" })).toBe(
      "Quote 142-26.pdf"
    );
    expect(
      nomeArquivoOrcamentoPDF({ numero: "MH-0142-26", status: "pendente", numero_pedido: "45210" }, true)
    ).toBe("Orcamento 142-26.pdf");
  });

  it("revisão recebe o sufixo REV", () => {
    expect(
      nomeArquivoOrcamentoPDF({ numero: "MH-0142-26", status: "finalizado", numero_pedido: "45210", numero_revisao: 3 })
    ).toBe("PO 45210 - Invoice 142-26 REV3.pdf");
  });
});
