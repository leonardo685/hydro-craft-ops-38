import { AppSidebar } from "./AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col md:flex-row w-full bg-background">
      <AppSidebar />
      <main className="flex-1 flex flex-col">
        <header className="border-b border-border bg-card shadow-soft">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold text-foreground">
                Sistema de Gestão ERP
              </h1>
              <p className="text-sm text-muted-foreground hidden lg:block">
                Controle completo dos seus equipamentos hidráulicos
              </p>
            </div>
            <ThemeToggle />
          </div>
        </header>
        <div className="flex-1 p-6 overflow-auto bg-muted/30">
          {children}
        </div>
      </main>
    </div>
  );
}