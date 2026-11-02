import { describe, expect, it } from "vitest";
import { commercialEmailType } from "./commercial-email";

describe("Commercial email document rules", () => {
  it("Awaiting Approval sends Quote", () => {
    expect(commercialEmailType("pendente")).toBe("quote");
  });
  it("Approved sends Invoice, including the billing status in that tab", () => {
    expect(commercialEmailType("aprovado")).toBe("invoice");
    expect(commercialEmailType("faturamento")).toBe("invoice");
  });
  it("Finalized sends Invoice", () => {
    expect(commercialEmailType("finalizado")).toBe("invoice");
  });
  it("Reproved does not allow email", () => {
    expect(commercialEmailType("rejeitado")).toBeNull();
  });
});