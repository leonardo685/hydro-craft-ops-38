import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";

interface CustoVariavel {
  descricao: string;
  valor: number;
}

interface NegociacaoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orcamento: any;
  onConfirm: () => void;
  isGestor?: boolean;
}

export function NegociacaoModal({ 
  open, 
  onOpenChange, 
  orcamento, 
  onConfirm,
  isGestor = false 
}: NegociacaoModalProps) {
  const [precoDesejado, setPrecoDesejado] = useState(0);
  const [impostosPercentual, setImpostosPercentual] = useState(16);
  const [comissaoPercentual, setComissaoPercentual] = useState(0);
  const [custosVariaveis, setCustosVariaveis] = useState<CustoVariavel[]>([
    { descricao: "Cromo", valor: 0 },
    { descricao: "Vedações", valor: 0 },
    { descricao: "Matéria Prima", valor: 0 },
    { descricao: "Mangueiras e Conexões", valor: 0 },
    { descricao: "Frete", valor: 0 },
    { descricao: "Pintura", valor: 0 },
    { descricao: "Usinagem", valor: 0 },
    { descricao: "Rótula", valor: 0 },
  ]);

  useEffect(() => {
    if (orcamento) {
      setPrecoDesejado(orcamento.preco_desejado || orcamento.valor || 0);
      setImpostosPercentual(orcamento.impostos_percentual || 16);
      setComissaoPercentual(orcamento.comissao_percentual || 0);
      
      if (orcamento.custos_variaveis && Array.isArray(orcamento.custos_variaveis)) {
        setCustosVariaveis(orcamento.custos_variaveis);
      }
    }
  }, [orcamento]);

  const calcularImpostos = () => {
    return (precoDesejado * impostosPercentual) / 100;
  };

  const calcularComissao = () => {
    return (precoDesejado * comissaoPercentual) / 100;
  };

  const calcularTotalCustosVariaveis = () => {
    return custosVariaveis.reduce((total, custo) => total + (custo.valor || 0), 0);
  };

  const calcularTotalCustosDespesas = () => {
    return calcularImpostos() + calcularComissao() + calcularTotalCustosVariaveis();
  };

  const calcularMargemContribuicao = () => {
    return precoDesejado - calcularTotalCustosDespesas();
  };

  const calcularPercentualMargem = () => {
    if (precoDesejado === 0) return 0;
    return (calcularMargemContribuicao() / precoDesejado) * 100;
  };

  const adicionarCustoVariavel = () => {
    setCustosVariaveis([...custosVariaveis, { descricao: "", valor: 0 }]);
  };

  const removerCustoVariavel = (index: number) => {
    setCustosVariaveis(custosVariaveis.filter((_, i) => i !== index));
  };

  const atualizarCustoVariavel = (index: number, field: keyof CustoVariavel, value: any) => {
    const novos = [...custosVariaveis];
    novos[index] = { ...novos[index], [field]: value };
    setCustosVariaveis(novos);
  };

  const handleSalvar = async () => {
    try {
      const { error } = await supabase
        .from("orcamentos")
        .update({
          preco_desejado: precoDesejado,
          margem_contribuicao: calcularMargemContribuicao(),
          percentual_margem: calcularPercentualMargem(),
          impostos_percentual: impostosPercentual,
          impostos_valor: calcularImpostos(),
          comissao_percentual: comissaoPercentual,
          comissao_valor: calcularComissao(),
          custos_variaveis: JSON.parse(JSON.stringify(custosVariaveis)),
          total_custos_variaveis: calcularTotalCustosVariaveis(),
          status_negociacao: 'aguardando_aprovacao',
          data_negociacao: new Date().toISOString(),
        })
        .eq("id", orcamento.id);

      if (error) throw error;

      toast.success("Precificação salva com sucesso!");
      onConfirm();
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao salvar precificação:", error);
      toast.error("Erro ao salvar precificação");
    }
  };

  const handleAprovar = async () => {
    try {
      const { error } = await supabase
        .from("orcamentos")
        .update({
          aprovado_por_gestor: true,
          data_aprovacao_gestor: new Date().toISOString(),
          status_negociacao: 'aprovado',
        })
        .eq("id", orcamento.id);

      if (error) throw error;

      toast.success("Orçamento aprovado com sucesso!");
      onConfirm();
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao aprovar orçamento:", error);
      toast.error("Erro ao aprovar orçamento");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isGestor ? "Aprovação de Precificação" : "Negociação - Precificação"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Cabeçalho - Preço Desejado e Margem */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-primary/5 rounded-lg border-2">
            <div>
              <Label className="text-lg font-semibold">Preço Desejado</Label>
              <Input
                type="number"
                value={precoDesejado}
                onChange={(e) => setPrecoDesejado(Number(e.target.value))}
                className="text-2xl font-bold mt-2"
                disabled={isGestor}
              />
            </div>
            <div>
              <Label className="text-lg font-semibold">Margem de Contribuição</Label>
              <div className="mt-2">
                <div className="text-2xl font-bold text-green-600">
                  {calcularMargemContribuicao().toLocaleString('pt-BR', { 
                    style: 'currency', 
                    currency: 'BRL' 
                  })}
                </div>
                <div className="text-lg text-muted-foreground">
                  {calcularPercentualMargem().toFixed(1)}%
                </div>
              </div>
            </div>
          </div>

          {/* Impostos e Comissões */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Impostos e Despesas de Venda</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <Label>1. Impostos (%)</Label>
                <Input
                  type="number"
                  value={impostosPercentual}
                  onChange={(e) => setImpostosPercentual(Number(e.target.value))}
                  disabled={isGestor}
                />
                <div className="text-sm text-muted-foreground mt-1">
                  Valor: {calcularImpostos().toLocaleString('pt-BR', { 
                    style: 'currency', 
                    currency: 'BRL' 
                  })}
                </div>
              </div>
              <div>
                <Label>2. Comissão (%)</Label>
                <Input
                  type="number"
                  value={comissaoPercentual}
                  onChange={(e) => setComissaoPercentual(Number(e.target.value))}
                  disabled={isGestor}
                />
                <div className="text-sm text-muted-foreground mt-1">
                  Valor: {calcularComissao().toLocaleString('pt-BR', { 
                    style: 'currency', 
                    currency: 'BRL' 
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Custos Variáveis */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Custos Variáveis</h3>
              {!isGestor && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={adicionarCustoVariavel}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Item
                </Button>
              )}
            </div>
            <div className="space-y-2">
              {custosVariaveis.map((custo, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <Input
                    placeholder="Descrição"
                    value={custo.descricao}
                    onChange={(e) => atualizarCustoVariavel(index, 'descricao', e.target.value)}
                    className="flex-1"
                    disabled={isGestor}
                  />
                  <Input
                    type="number"
                    placeholder="Valor"
                    value={custo.valor}
                    onChange={(e) => atualizarCustoVariavel(index, 'valor', Number(e.target.value))}
                    className="w-40"
                    disabled={isGestor}
                  />
                  {!isGestor && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removerCustoVariavel(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Resumo Final */}
          <div className="p-4 bg-muted rounded-lg space-y-2 border-2">
            <div className="flex justify-between">
              <span className="font-medium">Total Custos Variáveis:</span>
              <span className="font-bold">
                {calcularTotalCustosVariaveis().toLocaleString('pt-BR', { 
                  style: 'currency', 
                  currency: 'BRL' 
                })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Total Custos e Despesas:</span>
              <span className="font-bold text-destructive">
                {calcularTotalCustosDespesas().toLocaleString('pt-BR', { 
                  style: 'currency', 
                  currency: 'BRL' 
                })}
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t-2">
              <span className="text-lg font-semibold">Margem de Contribuição:</span>
              <span className="text-lg font-bold text-green-600">
                {calcularMargemContribuicao().toLocaleString('pt-BR', { 
                  style: 'currency', 
                  currency: 'BRL' 
                })} ({calcularPercentualMargem().toFixed(1)}%)
              </span>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            {isGestor ? (
              <Button onClick={handleAprovar} className="bg-green-600 hover:bg-green-700">
                Aprovar Orçamento
              </Button>
            ) : (
              <Button onClick={handleSalvar}>
                Salvar Precificação
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
