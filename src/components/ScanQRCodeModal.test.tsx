import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ScanQRCodeModal } from "./ScanQRCodeModal";

const mocks = vi.hoisted(() => ({
  scanFile: vi.fn(),
  captureQRPhoto: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  clear: vi.fn(),
  from: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("html5-qrcode", () => ({
  Html5Qrcode: class {
    start = mocks.start;
    stop = mocks.stop;
    clear = mocks.clear;
    scanFile = mocks.scanFile;
  },
}));

vi.mock("@/lib/qr-photo-capture", () => ({ captureQRPhoto: mocks.captureQRPhoto }));
vi.mock("@/contexts/EmpresaContext", () => ({
  useEmpresa: () => ({ empresaAtual: { id: "empresa-us", nome: "MEC HYDRO" } }),
}));
vi.mock("react-router-dom", () => ({ useNavigate: () => vi.fn() }));
vi.mock("sonner", () => ({ toast: { error: mocks.toastError, success: vi.fn() } }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: mocks.from,
    storage: { from: vi.fn() },
    functions: { invoke: vi.fn() },
  },
}));

function queryResult(data: unknown[]) {
  return {
    select: () => ({
      eq: () => ({
        eq: () => ({ limit: () => Promise.resolve({ data }) }),
      }),
    }),
  };
}

describe("ScanQRCodeModal photo capture", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.start.mockResolvedValue(undefined);
    mocks.stop.mockResolvedValue(undefined);
    mocks.captureQRPhoto.mockResolvedValue(new File(["photo"], "etiqueta.jpg", { type: "image/jpeg" }));
    mocks.scanFile.mockResolvedValue("https://fixzys.lovable.app/ordem/MH-010-26?e=empresa-us");
    mocks.from.mockImplementation((table: string) => queryResult(table === "ordens_servico" ? [{
      id: "ordem-10",
      cliente_nome: "Cliente Teste",
      equipamento: "Cilindro",
      orcamento_id: "quote-10",
      documento_entrega_url: null,
      assinatura_entrega_path: null,
      data_assinatura_entrega: null,
    }] : []));
  });

  it("reads the captured photo and opens the identified order", async () => {
    render(<ScanQRCodeModal open onOpenChange={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Tirar foto e ler QR Code" }));

    await waitFor(() => expect(mocks.scanFile).toHaveBeenCalledTimes(1));
    expect(mocks.scanFile.mock.calls[0][0]).toBeInstanceOf(File);
    expect(mocks.scanFile.mock.calls[0][1]).toBe(false);
    expect(await screen.findByText("Ordem MH-010-26")).toBeInTheDocument();
    expect(screen.getByText("Cliente Teste • Cilindro")).toBeInTheDocument();
  });

  it("keeps the scanner open and asks for a clearer photo when no QR is found", async () => {
    mocks.scanFile.mockRejectedValue(new Error("No QR code found"));
    render(<ScanQRCodeModal open onOpenChange={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Tirar foto e ler QR Code" }));

    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith(
      "Não foi possível identificar o QR Code na foto. Aproxime a câmera, evite reflexos e tente novamente.",
    ));
    expect(screen.getByRole("button", { name: "Tirar foto e ler QR Code" })).toBeEnabled();
  });
});
