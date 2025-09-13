import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Financeiro() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Financeiro</h1>
          <p className="text-muted-foreground">Gestão financeira e relatórios</p>
        </div>

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="dre">DRE</TabsTrigger>
            <TabsTrigger value="dfc">DFC</TabsTrigger>
            <TabsTrigger value="extrato">Extrato</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Dashboard Financeiro</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Dashboard será implementado com integração ao Supabase.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dre" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Demonstração do Resultado do Exercício (DRE)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">DRE será implementado com integração ao Supabase.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dfc" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Demonstração do Fluxo de Caixa (DFC)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">DFC será implementado com integração ao Supabase.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="extrato" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Extrato Bancário</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Extrato será implementado com integração ao Supabase.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}