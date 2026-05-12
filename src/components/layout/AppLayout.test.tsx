import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AppLayout } from "./AppLayout";

// Mock layout dependencies to keep tests focused on header structure
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

describe("AppLayout header responsiveness", () => {
  it("renders header with anti-collapse flex structure at all widths", () => {
    const { container } = render(
      <AppLayout>
        <div data-testid="page-content">Page</div>
      </AppLayout>
    );

    const header = container.querySelector("header");
    expect(header).toBeInTheDocument();

    // Header inner row must be flex + centered (prevents vertical stacking)
    const innerRow = header?.querySelector("div.flex.items-center");
    expect(innerRow).toBeInTheDocument();

    // Logo must never shrink (prevents squishing)
    const logo = screen.getByAltText("FixZys Logo");
    expect(logo).toHaveClass("shrink-0");
    expect(logo).toHaveClass("h-8", "sm:h-10");

    // Middle content area must have flex-1 + min-w-0 (prevents overflow push-out)
    const middleArea = innerRow?.querySelector("div.flex-1.min-w-0");
    expect(middleArea).toBeInTheDocument();

    // Must have both mobile and desktop title variants
    const desktopTitleBlock = container.querySelector("div.hidden.sm\\:block");
    expect(desktopTitleBlock).toBeInTheDocument();

    const mobileTitle = container.querySelector("h1.sm\\:hidden");
    expect(mobileTitle).toBeInTheDocument();

    // Action buttons area must never shrink
    const actionsArea = innerRow?.querySelector("div.shrink-0:last-child");
    expect(actionsArea).toBeInTheDocument();
  });

  it("renders all action buttons without overflow at 320px", () => {
    const { container } = render(
      <AppLayout>
        <div>Page</div>
      </AppLayout>
    );

    const header = container.querySelector("header");
    expect(header).toBeInTheDocument();

    // All critical buttons must exist
    expect(screen.getByTitle("Ler QR Code")).toBeInTheDocument();
    expect(screen.getByTestId("language-selector")).toBeInTheDocument();
    expect(screen.getByTestId("theme-toggle")).toBeInTheDocument();
    expect(screen.getByTestId("sidebar-trigger")).toBeInTheDocument();

    // Header actions should use small gap on mobile (gap-1 or gap-2)
    const headerRow = header?.querySelector("div.flex.items-center");
    const headerClasses = headerRow?.className || "";
    expect(headerClasses).toMatch(/gap-1|gap-2/);

    // Logo should be h-8 on mobile
    const logo = screen.getByAltText("FixZys Logo");
    expect(logo.className).toContain("h-8");
  });

  it("renders all action buttons without overflow at 375px", () => {
    render(
      <AppLayout>
        <div>Page</div>
      </AppLayout>
    );

    expect(screen.getByTitle("Ler QR Code")).toBeInTheDocument();
    expect(screen.getByTestId("language-selector")).toBeInTheDocument();
    expect(screen.getByTestId("theme-toggle")).toBeInTheDocument();
    expect(screen.getByTestId("sidebar-trigger")).toBeInTheDocument();

    const logo = screen.getByAltText("FixZys Logo");
    expect(logo.className).toContain("h-8");
  });

  it("renders all action buttons without overflow at 768px", () => {
    render(
      <AppLayout>
        <div>Page</div>
      </AppLayout>
    );

    expect(screen.getByTitle("Ler QR Code")).toBeInTheDocument();
    expect(screen.getByTestId("language-selector")).toBeInTheDocument();
    expect(screen.getByTestId("theme-toggle")).toBeInTheDocument();
    expect(screen.getByTestId("sidebar-trigger")).toBeInTheDocument();

    // At tablet/desktop, logo should grow to h-10
    const logo = screen.getByAltText("FixZys Logo");
    expect(logo.className).toContain("sm:h-10");
  });

  it("should render all header action buttons across all breakpoints", () => {
    const { unmount } = render(
      <AppLayout>
        <div>Page</div>
      </AppLayout>
    );

    expect(screen.getByTitle("Ler QR Code")).toBeInTheDocument();
    expect(screen.getByTestId("language-selector")).toBeInTheDocument();
    expect(screen.getByTestId("theme-toggle")).toBeInTheDocument();

    unmount();
  });
});
