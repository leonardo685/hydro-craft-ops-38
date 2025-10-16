import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Plus, Minus, FileDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  calcularImpostos,
  calcularComissao,
  calcularTotalCustosVariaveis,
  calcularMargemContribuicao,
  calcularPercentualMargem,
  formatarMoeda,
  formatarPercentual,
  gerarPDFPrecificacao,
  type CustoVariavel,
} from "@/lib/precificacao-utils";

interface PrecificacaoModalProps {
  open: boolean;
  onClose: () => void;
  orcamento: any;
  onSave?: () => void;
}

export function PrecificacaoModal({ open, onClose, orcamento, onSave }: PrecificacaoModalProps) {
  const [precoDesejado, setPrecoDesejado] = useState(0);
  const [descontoPercentual, setDescontoPercentual] = useState(0);
  const [impostosPercentual, setImpostosPercentual] = useState(16);
  const [comissaoPercentual, setComissaoPercentual] = useState(0);
  const [percentuaisCustomizados, setPercentuaisCustomizados] = useState<CustoVariavel[]>([]);
  const [custosVariaveis, setCustosVariaveis] = useState<CustoVariavel[]>([]);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (orcamento) {
      setPrecoDesejado(orcamento.preco_desejado || 0);
      setDescontoPercentual(orcamento.desconto_percentual || 0);
      setImpostosPercentual(orcamento.impostos_percentual || 16);
      setComissaoPercentual(orcamento.comissao_percentual || 0);
      setPercentuaisCustomizados(orcamento.percentuais_customizados || []);
      setCustosVariaveis(orcamento.custos_variaveis || []);
    }
  }, [orcamento]);

  const precoBase = precoDesejado / (1 - descontoPercentual / 100);
  const impostosValor = calcularImpostos(precoDesejado, impostosPercentual);
  const comissaoValor = calcularComissao(precoDesejado, comissaoPercentual);
  const totalPercentuaisCustomizados = calcularTotalCustosVariaveis(percentuaisCustomizados);
  const valoresPercentuaisCustomizados = (precoDesejado * totalPercentuaisCustomizados) / 100;
  const totalCustosVariaveis = calcularTotalCustosVariaveis(custosVariaveis);
  const totalCustos = impostosValor + comissaoValor + valoresPercentuaisCustomizados + totalCustosVariaveis;
  const margemContribuicao = calcularMargemContribuicao(precoDesejado, totalCustos);
  const percentualMargem = calcularPercentualMargem(margemContribuicao, precoDesejado);

  const aplicarDesconto = (incremento: number) => {
    const novoDesconto = Math.max(0, Math.min(100, descontoPercentual + incremento));
    setDescontoPercentual(novoDesconto);
    if (novoDesconto > 0) {
      setPrecoDesejado(precoBase * (1 - novoDesconto / 100));
    }
  };

  const adicionarPercentualCustomizado = () => {
    setPercentuaisCustomizados([...percentuaisCustomizados, { descricao: "", valor: 0 }]);
  };

  const removerPercentualCustomizado = (index: number) => {
    setPercentuaisCustomizados(percentuaisCustomizados.filter((_, i) => i !== index));
  };

  const atualizarPercentualCustomizado = (index: number, campo: keyof CustoVariavel, valor: any) => {
    const novos = [...percentuaisCustomizados];
    novos[index] = { ...novos[index], [campo]: valor };
    setPercentuaisCustomizados(novos);
  };

  const adicionarCustoVariavel = () => {
    setCustosVariaveis([...custosVariaveis, { descricao: "", valor: 0 }]);
  };

  const removerCustoVariavel = (index: number) => {
    setCustosVariaveis(custosVariaveis.filter((_, i) => i !== index));
  };

  const atualizarCustoVariavel = (index: number, campo: keyof CustoVariavel, valor: any) => {
    const novos = [...custosVariaveis];
    novos[index] = { ...novos[index], [campo]: valor };
    setCustosVariaveis(novos);
  };

  const handleSalvar = async () => {
    if (precoDesejado <= 0) {
      toast.error("Preço desejado deve ser maior que zero");
      return;
    }

    setSalvando(true);
    try {
      const { error } = await supabase
        .from("orcamentos")
        .update({
          preco_desejado: precoDesejado,
          desconto_percentual: descontoPercentual,
          impostos_percentual: impostosPercentual,
          impostos_valor: impostosValor,
          comissao_percentual: comissaoPercentual,
          comissao_valor: comissaoValor,
          percentuais_customizados: percentuaisCustomizados,
          custos_variaveis: custosVariaveis,
          total_custos_variaveis: totalCustosVariaveis,
          margem_contribuicao: margemContribuicao,
          percentual_margem: percentualMargem,
        } as any)
        .eq("id", orcamento.id);

      if (error) throw error;

      toast.success("Precificação salva com sucesso!");
      onSave?.();
      onClose();
    } catch (error) {
      console.error("Erro ao salvar precificação:", error);
      toast.error("Erro ao salvar precificação");
    } finally {
      setSalvando(false);
    }
  };

  const handleExportarPDF = async () => {
    const dadosAtualizados = {
      ...orcamento,
      preco_desejado: precoDesejado,
      desconto_percentual: descontoPercentual,
      impostos_percentual: impostosPercentual,
      impostos_valor: impostosValor,
      comissao_percentual: comissaoPercentual,
      comissao_valor: comissaoValor,
      percentuais_customizados: percentuaisCustomizados,
      custos_variaveis: custosVariaveis,
      total_custos_variaveis: totalCustosVariaveis,
      margem_contribuicao: margemContribuicao,
      percentual_margem: percentualMargem,
    };

    const sucesso = await gerarPDFPrecificacao(dadosAtualizados);
    if (sucesso) {
      toast.success("PDF gerado com sucesso!");
    } else {
      toast.error("Erro ao gerar PDF");
    }
  };

  const getCorMargem = () => {
    if (percentualMargem >= 45) return "bg-accent/10 text-accent border-accent";
    if (percentualMargem >= 40) return "bg-warning/10 text-warning border-warning";
    return "bg-destructive/10 text-destructive border-destructive";
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Precificação do Orçamento</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Orçamento #{orcamento?.numero} - {orcamento?.cliente_nome}
          </p>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Preço Desejado e Margem */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-primary/5 border-primary">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">💰 Preço Desejado</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold">R$</span>
                  <Input
                    type="number"
                    value={precoDesejado}
                    onChange={(e) => setPrecoDesejado(Number(e.target.value))}
                    onBlur={(e) => setPrecoDesejado(Number(Number(e.target.value).toFixed(2)))}
                    className="text-2xl font-bold h-14"
                    placeholder="0,00"
                    step="0.01"
                    min="0"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className={`border-2 ${getCorMargem()}`}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">✨ Margem de Contribuição</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center gap-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-1">Valor</p>
                    <p className="text-2xl font-bold">{formatarMoeda(margemContribuicao)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-1">Percentual</p>
                    <p className="text-2xl font-bold">{formatarPercentual(percentualMargem)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Controle de Desconto */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">🏷️ Desconto</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => aplicarDesconto(-0.5)}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <div className="flex-1 text-center">
                  <p className="text-2xl font-bold">{formatarPercentual(descontoPercentual)}</p>
                  {descontoPercentual > 0 && (
                    <p className="text-sm text-muted-foreground">
                      Preço original: {formatarMoeda(precoBase)}
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => aplicarDesconto(0.5)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Impostos e Comissão */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">📊 Impostos e Comissão</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Impostos (%)</Label>
                  <Input
                    type="number"
                    value={impostosPercentual}
                    onChange={(e) => setImpostosPercentual(Number(e.target.value))}
                    min="0"
                    max="100"
                    step="0.01"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valor Impostos</Label>
                  <Input value={formatarMoeda(impostosValor)} disabled className="bg-muted" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Comissão (%)</Label>
                  <Input
                    type="number"
                    value={comissaoPercentual}
                    onChange={(e) => setComissaoPercentual(Number(e.target.value))}
                    min="0"
                    max="100"
                    step="0.01"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valor Comissão</Label>
                  <Input value={formatarMoeda(comissaoValor)} disabled className="bg-muted" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Percentuais Customizados */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">📈 Outros Percentuais</CardTitle>
                <Button size="sm" variant="outline" onClick={adicionarPercentualCustomizado}>
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {percentuaisCustomizados.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum percentual adicional
                </p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {percentuaisCustomizados.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        placeholder="Descrição"
                        value={item.descricao}
                        onChange={(e) => atualizarPercentualCustomizado(index, "descricao", e.target.value)}
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        placeholder="%"
                        value={item.valor}
                        onChange={(e) => atualizarPercentualCustomizado(index, "valor", Number(e.target.value))}
                        className="w-24"
                        step="0.01"
                        min="0"
                        max="100"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removerPercentualCustomizado(index)}
                        className="text-destructive hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              {percentuaisCustomizados.length > 0 && (
                <div className="pt-3 border-t">
                  <div className="flex justify-between items-center font-semibold">
                    <span>Total (%):</span>
                    <span>{formatarPercentual(totalPercentuaisCustomizados)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm text-muted-foreground mt-1">
                    <span>Valor equivalente:</span>
                    <span>{formatarMoeda(valoresPercentuaisCustomizados)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Custos Variáveis */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">📦 Custos Variáveis</CardTitle>
                <Button size="sm" variant="outline" onClick={adicionarCustoVariavel}>
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {custosVariaveis.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum custo variável adicionado
                </p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {custosVariaveis.map((custo, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        placeholder="Descrição"
                        value={custo.descricao}
                        onChange={(e) => atualizarCustoVariavel(index, "descricao", e.target.value)}
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        placeholder="Valor"
                        value={custo.valor}
                        onChange={(e) => atualizarCustoVariavel(index, "valor", Number(e.target.value))}
                        className="w-32"
                        step="0.01"
                        min="0"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removerCustoVariavel(index)}
                        className="text-destructive hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <div className="pt-3 border-t">
                <div className="flex justify-between items-center font-semibold">
                  <span>Total Custos Variáveis:</span>
                  <span>{formatarMoeda(totalCustosVariaveis)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="outline" onClick={handleExportarPDF}>
            <FileDown className="h-4 w-4 mr-2" />
            Exportar PDF
          </Button>
          <Button onClick={handleSalvar} disabled={salvando}>
            {salvando ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
