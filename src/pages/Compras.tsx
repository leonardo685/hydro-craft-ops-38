import { AppLayout } from "@/components/layout/AppLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { ComprasDashboard } from "@/components/compras/ComprasDashboard";
import { ComprasKanban } from "@/components/compras/ComprasKanban";
import { CotacoesTab } from "@/components/compras/CotacoesTab";
import { BarChart3, Kanban, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

type ComprasView = "dashboard" | "kanban" | "cotacoes";

const comprasTabs: { value: ComprasView; label: string; icon: typeof BarChart3 }[] = [
  { value: "dashboard", label: "Dashboard", icon: BarChart3 },
  { value: "kanban", label: "Kanban", icon: Kanban },
  { value: "cotacoes", label: "Cotações", icon: FileText },
];

export default function Compras() {
  const { t } = useLanguage();
  const [activeView, setActiveView] = useState<ComprasView>("kanban");

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
