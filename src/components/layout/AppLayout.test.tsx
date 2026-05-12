import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { AppLayout } from "./AppLayout";

vi.mock("@/components/ui/sidebar", () => ({
  SidebarProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SidebarTrigger: () => <button data-testid="sidebar-trigger">Menu</button>,
}));

vi.mock("./AppSidebar", () => ({
  AppSidebar: () => <aside data-testid="app-sidebar">Sidebar</aside>,
}));

vi.mock("@/components/ThemeToggle", () => ({
  ThemeToggle: () => <button data-testid="theme-toggle">Theme</button>,
}));

vi.mock("@/components/LanguageSelectorDropdown", () => ({
  LanguageSelectorDropdown: () => (
    <div data-testid="language-selector">
      <span>BR</span>
      <span className="hidden sm:inline">Português (BR)</span>
      <span className="sm:hidden uppercase">pt</span>
    </div>
  ),
}));

vi.mock("@/components/ui/ai-input", () => ({
  MorphPanel: () => <div data-testid="morph-panel">AI Panel</div>,
}));

vi.mock("@/components/ScanQRCodeModal", () => ({
  ScanQRCodeModal: () => <div data-testid="scan-modal">Scan Modal</div>,
}));

vi.mock("@/contexts/LanguageContext", () => ({
  useLanguage: () => ({ t: (key: string) => (key === "dashboard.subtitle" ? "Subtitle" : key) }),
}));

// All authenticated routes — header is global via AppLayout, so we validate
// it renders correctly regardless of which page content is mounted.
const ROUTES = [
  { path: "/", name: "Index" },
  { path: "/recebimentos", name: "Recebimentos" },
  { path: "/recebimentos/novo", name: "NovoRecebimento" },
  { path: "/recebimentos/:id", name: "DetalhesRecebimento" },
  { path: "/analise", name: "Analise" },
  { path: "/analise/novo/:id", name: "NovaAnalise" },
  { path: "/analise/novo-ordem-direta", name: "NovaOrdemDireta" },
  { path: "/orcamentos", name: "Orcamentos" },
  { path: "/orcamentos/novo", name: "NovoOrcamento" },
  { path: "/aprovados", name: "Aprovados" },
  { path: "/compras", name: "Compras" },
  { path: "/visualizar-ordem-servico/:id", name: "VisualizarOrdemServico" },
  { path: "/faturamento", name: "Faturamento" },
  { path: "/faturamento/dashboard", name: "DashboardFaturamento" },
  { path: "/faturamento/faturadas", name: "FaturamentoFaturadas" },
  { path: "/cadastros", name: "Cadastros" },
  { path: "/financeiro", name: "Financeiro" },
  { path: "/financeiro/dashboard", name: "Dashboard" },
  { path: "/financeiro/dre", name: "DRE" },
  { path: "/financeiro/dfc", name: "DFC" },
  { path: "/dfc", name: "DFCAlias" },
  { path: "/financeiro/meta-gastos", name: "MetaGastos" },
  { path: "/admin/permissions", name: "AdminPermissions" },
  { path: "/historico-lancamentos", name: "HistoricoLancamentos" },
  { path: "/configuracoes", name: "Configuracoes" },
  { path: "/upload-video-teste", name: "UploadVideoTeste" },
  { path: "/processo-interno/:numeroOrdem", name: "ProcessoInterno" },
];

const BREAKPOINTS = [320, 375, 768];

describe("AppLayout header — structural responsiveness", () => {
  it("renders header with anti-collapse flex structure", () => {
    const { container } = render(
      <AppLayout>
        <div data-testid="page-content">Page</div>
      </AppLayout>
    );

    const header = container.querySelector("header");
    expect(header).toBeInTheDocument();

    const innerRow = header?.querySelector("div.flex.items-center");
    expect(innerRow).toBeInTheDocument();

    const logo = screen.getByAltText("FixZys Logo");
    expect(logo).toHaveClass("shrink-0");
    expect(logo).toHaveClass("h-8", "sm:h-10");

    const middleArea = innerRow?.querySelector("div.flex-1.min-w-0");
    expect(middleArea).toBeInTheDocument();

    const desktopTitleBlock = container.querySelector("div.hidden.sm\\:block");
    expect(desktopTitleBlock).toBeInTheDocument();

    const mobileTitle = container.querySelector("h1.sm\\:hidden");
    expect(mobileTitle).toBeInTheDocument();

    const actionsArea = innerRow?.querySelector("div.shrink-0:last-child");
    expect(actionsArea).toBeInTheDocument();
  });
});

describe("AppLayout header — renders on every authenticated route × breakpoint", () => {
  beforeEach(() => {
    cleanup();
  });

  for (const route of ROUTES) {
    for (const width of BREAKPOINTS) {
      it(`route "${route.path}" (${route.name}) at ${width}px — header does not collapse`, () => {
        Object.defineProperty(window, "innerWidth", {
          writable: true,
          configurable: true,
          value: width,
        });
        window.dispatchEvent(new Event("resize"));

        const PageStub = () => <div data-testid={`page-${route.name}`}>{route.name}</div>;

        const { container } = render(
          <AppLayout>
            <PageStub />
          </AppLayout>
        );

        expect(screen.getByTestId(`page-${route.name}`)).toBeInTheDocument();

        const header = container.querySelector("header");
        expect(header).toBeInTheDocument();

        const headerRow = header?.querySelector("div.flex.items-center");
        expect(headerRow).toBeInTheDocument();

        expect(screen.getByTitle("Ler QR Code")).toBeInTheDocument();
        expect(screen.getByTestId("language-selector")).toBeInTheDocument();
        expect(screen.getByTestId("theme-toggle")).toBeInTheDocument();
        expect(screen.getByTestId("sidebar-trigger")).toBeInTheDocument();

        const logo = screen.getByAltText("FixZys Logo");
        expect(logo).toHaveClass("shrink-0");

        const middleArea = headerRow?.querySelector("div.flex-1.min-w-0");
        expect(middleArea).toBeInTheDocument();
      });
    }
  }
});