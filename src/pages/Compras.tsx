import { AppLayout } from "@/components/layout/AppLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { ComprasDashboard } from "@/components/compras/ComprasDashboard";
import { ComprasKanban } from "@/components/compras/ComprasKanban";
import { CotacoesTab } from "@/components/compras/CotacoesTab";
import { BarChart3, Kanban, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

type ComprasView = "dashboard" | "kanban" | "cotacoes";

const comprasTabs: { value: ComprasView; label: string; icon: typeof BarChart3 }[] = [
  { value: "dashboard", label: "Dashboard", icon: BarChart3 },
  { value: "kanban", label: "Kanban", icon: Kanban },
  { value: "cotacoes", label: "Cotações", icon: FileText },
];

export default function Compras() {
  const { t } = useLanguage();
  const [activeView, setActiveView] = useState<ComprasView>("kanban");

  // Limpeza automática de cache/SW ao abrir Compras, evitando versão antiga sem abas.
  useEffect(() => {
    const FLAG = "compras-cache-cleaned-v1";
    if (sessionStorage.getItem(FLAG)) return;

    (async () => {
      try {
        if ("serviceWorker" in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map((r) => r.unregister()));
        }
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
      } catch (e) {
        console.warn("[Compras] cache cleanup falhou", e);
      } finally {
        sessionStorage.setItem(FLAG, "1");
        // Força um reload limpo apenas uma vez por sessão
        window.location.reload();
      }
    })();
  }, []);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{t("compras.title")}</h1>
          <p className="text-muted-foreground">{t("compras.subtitle")}</p>
        </div>

        <div className="flex w-full flex-wrap gap-2 rounded-md bg-muted p-1 md:w-fit">
          {comprasTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeView === tab.value;

            return (
              <Button
                key={tab.value}
                type="button"
                variant={isActive ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setActiveView(tab.value)}
                className="gap-2"
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </Button>
            );
          })}
        </div>

        <div>
          {activeView === "dashboard" && <ComprasDashboard />}
          {activeView === "kanban" && <ComprasKanban />}
          {activeView === "cotacoes" && <CotacoesTab />}
        </div>
      </div>
    </AppLayout>
  );
}
