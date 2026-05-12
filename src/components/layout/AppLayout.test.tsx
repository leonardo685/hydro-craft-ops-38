import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { AppLayout } from "./AppLayout";

// Mock all layout dependencies to keep tests focused on the header
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
      <span>🇧🇷</span>
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

function setViewportWidth(width: number) {
  Object.defineProperty(window, "innerWidth", {
    writable: true,
    configurable: true,
    value: width,
  });
  window.dispatchEvent(new Event("resize"));
}

describe("AppLayout header responsiveness", () => {
  beforeEach(() => {
    // Reset to desktop default before each test
    setViewportWidth(1024);
  });

  it("should show compact layout at 320px without header overflow", () => {
    setViewportWidth(320);
    const { container } = render(
      <AppLayout>
        <div data-testid="page-content">Page</div>
      </AppLayout>
    );

    const header = container.querySelector("header");
    expect(header).toBeInTheDocument();

    // Logo should be smaller on mobile (h-8)
    const logo = screen.getByAltText("FixZys Logo");
    expect(logo).toHaveClass("h-8");

    // Desktop title block should be hidden
    const desktopTitle = container.querySelector("div.hidden.sm\\:block");
    expect(desktopTitle).not.toBeVisible();

    // Mobile title should be visible
    const mobileTitle = container.querySelector("h1.sm\\:hidden");
    expect(mobileTitle).toBeVisible();

    // Actions area (QR + Lang + Theme) must be present
    expect(screen.getByTitle("Ler QR Code")).toBeInTheDocument();
    expect(screen.getByTestId("language-selector")).toBeInTheDocument();
    expect(screen.getByTestId("theme-toggle")).toBeInTheDocument();
  });

  it("should show compact layout at 375px without header overflow", () => {
    setViewportWidth(375);
    const { container } = render(
      <AppLayout>
        <div data-testid="page-content">Page</div>
      </AppLayout>
    );

    const header = container.querySelector("header");
    expect(header).toBeInTheDocument();

    const logo = screen.getByAltText("FixZys Logo");
    expect(logo).toHaveClass("h-8");

    const desktopTitle = container.querySelector("div.hidden.sm\\:block");
    expect(desktopTitle).not.toBeVisible();

    const mobileTitle = container.querySelector("h1.sm\\:hidden");
    expect(mobileTitle).toBeVisible();

    expect(screen.getByTitle("Ler QR Code")).toBeInTheDocument();
    expect(screen.getByTestId("language-selector")).toBeInTheDocument();
    expect(screen.getByTestId("theme-toggle")).toBeInTheDocument();
  });

  it("should switch to full layout at 768px (tablet)", () => {
    setViewportWidth(768);
    const { container } = render(
      <AppLayout>
        <div data-testid="page-content">Page</div>
      </AppLayout>
    );

    const header = container.querySelector("header");
    expect(header).toBeInTheDocument();

    // At 768px, sm: breakpoint (640px) is active, so logo should be h-10
    const logo = screen.getByAltText("FixZys Logo");
    expect(logo).toHaveClass("sm:h-10");

    // Desktop title block should be visible at sm breakpoint
    const desktopTitle = container.querySelector("div.hidden.sm\\:block");
    expect(desktopTitle).toBeVisible();

    // Mobile title should be hidden
    const mobileTitle = container.querySelector("h1.sm\\:hidden");
    expect(mobileTitle).not.toBeVisible();

    expect(screen.getByTitle("Ler QR Code")).toBeInTheDocument();
    expect(screen.getByTestId("language-selector")).toBeInTheDocument();
    expect(screen.getByTestId("theme-toggle")).toBeInTheDocument();
  });

  it("should render all header action buttons across all breakpoints", () => {
    const breakpoints = [320, 375, 768];

    for (const width of breakpoints) {
      setViewportWidth(width);
      const { unmount } = render(
        <AppLayout>
          <div>Page</div>
        </AppLayout>
      );

      expect(screen.getByTitle("Ler QR Code")).toBeInTheDocument();
      expect(screen.getByTestId("language-selector")).toBeInTheDocument();
      expect(screen.getByTestId("theme-toggle")).toBeInTheDocument();

      unmount();
    }
  });
});
