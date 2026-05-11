import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageSelectorDropdown } from "@/components/LanguageSelectorDropdown";
import { ReactNode, useState } from "react";
import fixzysLogo from "@/assets/fixzys-logo.png";
import { MorphPanel } from "@/components/ui/ai-input";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { QrCode } from "lucide-react";
import { ScanQRCodeModal } from "@/components/ScanQRCodeModal";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { t } = useLanguage();
  const [scanOpen, setScanOpen] = useState(false);

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <main className="flex-1 flex flex-col">
          <header className="border-b border-border bg-card shadow-soft">
            <div className="flex items-center gap-4 p-4">
              <SidebarTrigger className="hover:bg-secondary transition-fast" />
              <div className="flex items-center gap-4 flex-1">
                <img 
                  src={fixzysLogo} 
                  alt="FixZys Logo" 
                  className="h-10 w-auto"
                />
                <div>
                  <h1 className="text-xl font-semibold text-foreground">
                    FixZys
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {t('dashboard.subtitle')}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setScanOpen(true)}
                title="Ler QR Code"
                className="rounded-full"
              >
                <QrCode className="w-4 h-4" />
              </Button>
              <LanguageSelectorDropdown />
              <ThemeToggle />
            </div>
          </header>
          <div className="flex-1 p-6 overflow-auto bg-muted/30">
            {children}
          </div>
        </main>
        <MorphPanel />
      </div>
      <ScanQRCodeModal open={scanOpen} onOpenChange={setScanOpen} />
    </SidebarProvider>
  );
}