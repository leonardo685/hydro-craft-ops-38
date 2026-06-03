import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/contexts/LanguageContext";
import { ComprasDashboard } from "@/components/compras/ComprasDashboard";
import { ComprasKanban } from "@/components/compras/ComprasKanban";
import { CotacoesTab } from "@/components/compras/CotacoesTab";
import { BarChart3, Kanban, FileText } from "lucide-react";

export default function Compras() {
  const { t } = useLanguage();

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{t("compras.title")}</h1>
          <p className="text-muted-foreground">{t("compras.subtitle")}</p>
        </div>

        <Tabs defaultValue="kanban" className="w-full">
          <TabsList className="grid w-full max-w-xl grid-cols-3">
            <TabsTrigger value="dashboard" className="gap-2">
              <BarChart3 className="h-4 w-4" /> Dashboard
            </TabsTrigger>
            <TabsTrigger value="kanban" className="gap-2">
              <Kanban className="h-4 w-4" /> Kanban
            </TabsTrigger>
            <TabsTrigger value="cotacoes" className="gap-2">
              <FileText className="h-4 w-4" /> Cotações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-6">
            <ComprasDashboard />
          </TabsContent>
          <TabsContent value="kanban" className="mt-6">
            <ComprasKanban />
          </TabsContent>
          <TabsContent value="cotacoes" className="mt-6">
            <CotacoesTab />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
