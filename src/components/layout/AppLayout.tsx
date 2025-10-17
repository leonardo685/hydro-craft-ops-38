import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ReactNode } from "react";
import hydrofixLogo from "@/assets/hydrofix-logo.png";

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
                  src={hydrofixLogo} 
                  alt="FIXZYS Logo" 
                  className="h-10 w-auto"
                />
                <div>
                  <h1 className="text-xl font-semibold text-foreground">
                    FIXZYS
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Sistema de Gestão
                  </p>
                </div>
              </div>
              <ThemeToggle />
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