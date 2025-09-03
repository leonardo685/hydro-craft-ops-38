import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { ReactNode } from "react";
import mecHidroLogo from "@/assets/mec-hidro-logo.png";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <main className="flex-1 flex flex-col">
          <header className="border-b border-border bg-card shadow-soft">
            <div className="flex items-center gap-4 p-4">
              <SidebarTrigger className="hover:bg-secondary transition-fast" />
              <div className="flex items-center gap-4 flex-1">
                <img 
                  src={mecHidroLogo} 
                  alt="MEC-HIDRO Logo" 
                  className="h-12 w-auto"
                />
                <div>
                  <h1 className="text-xl font-semibold text-foreground">
                    Sistema de Gestão ERP
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Controle completo dos seus equipamentos hidráulicos
                  </p>
                </div>
              </div>
            </div>
          </header>
          <div className="flex-1 p-6 overflow-auto bg-muted/30">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}