import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Calculator } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useEmpresa } from "@/contexts/EmpresaContext";
import { PrecificacaoModal } from "@/components/PrecificacaoModal";

export default function NovaPrecificacao() {
  const navigate = useNavigate();
  const { empresaAtual } = useEmpresa();
  const [clientes, setClientes] = useState<{ id: string; nome: string }[]>([]);
  const [clienteNome, setClienteNome] = useState("");
  const [produto, setProduto] = useState("");
  const [descricao, setDescricao] = useState("");
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    if (!empresaAtual?.id) return;
    supabase
      .from("clientes")
      .select("id, nome")
      .eq("empresa_id", empresaAtual.id)
      .order("nome")
      .then(({ data }) => setClientes(data || []));
  }, [empresaAtual?.id]);

  const dados = useMemo(
    () => ({
      numero: "Estimativa",
      cliente_nome: clienteNome.trim(),
      equipamento: produto.trim(),
      descricao: descricao.trim(),
    }),
    [clienteNome, produto, descricao]
  );

  const iniciar = () => {
    if (!clienteNome.trim() || !produto.trim()) {
      toast.error("Informe o cliente e o produto");
      return;
    }
    setAberto(true);
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => navigate("/orcamentos")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" /> Precificação
            </CardTitle>
            <CardDescription>
              Estimativa de preço sem criar orçamento. Nada é salvo; exporte o PDF se quiser guardar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cliente">Cliente</Label>
              <Input
                id="cliente"
                list="lista-clientes"
                value={clienteNome}
                onChange={(e) => setClienteNome(e.target.value)}
                placeholder="Selecione ou digite o cliente"
              />
              <datalist id="lista-clientes">
                {clientes.map((c) => (
                  <option key={c.id} value={c.nome} />
                ))}
              </datalist>
            </div>
            <div className="space-y-2">
              <Label htmlFor="produto">Produto / Equipamento</Label>
              <Input id="produto" value={produto} onChange={(e) => setProduto(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea id="descricao" rows={4} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
            </div>
            <Button className="w-full" onClick={iniciar}>
              <Calculator className="h-4 w-4 mr-2" /> Fazer precificação
            </Button>
          </CardContent>
        </Card>
      </div>
      <PrecificacaoModal open={aberto} onClose={() => setAberto(false)} orcamento={dados} standalone />
    </AppLayout>
  );
}
