import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Users, Building, Tag } from "lucide-react";
import { CategoriasFinanceiras } from "@/components/CategoriasFinanceiras";

const Cadastros = () => {
  return (
    <AppLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Cadastros</h1>
          <p className="text-muted-foreground">Gerencie clientes, fornecedores e categorias financeiras</p>
        </div>

        <Tabs defaultValue="clientes" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="clientes" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Clientes
            </TabsTrigger>
            <TabsTrigger value="fornecedores" className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              Fornecedores
            </TabsTrigger>
            <TabsTrigger value="categorias" className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Categorias Financeiras
            </TabsTrigger>
          </TabsList>

          <TabsContent value="clientes" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Clientes
                    </CardTitle>
                    <CardDescription>
                      Gerencie os dados dos seus clientes
                    </CardDescription>
                  </div>
                  <Button className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Novo Cliente
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Lista de clientes será implementada aqui.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fornecedores" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Building className="h-5 w-5" />
                      Fornecedores
                    </CardTitle>
                    <CardDescription>
                      Gerencie os dados dos seus fornecedores
                    </CardDescription>
                  </div>
                  <Button className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Novo Fornecedor
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Lista de fornecedores será implementada aqui.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categorias" className="mt-6">
            <CategoriasFinanceiras />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Cadastros;