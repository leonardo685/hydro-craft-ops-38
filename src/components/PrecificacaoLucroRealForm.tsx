import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import {
  calcularLucroReal,
  formatarMoeda,
  formatarPercentual,
  type LinhaQtdValor,
  type LinhaPercentual,
  type PrecificacaoLucroReal,
} from "@/lib/precificacao-utils";

interface Props {
  dados: PrecificacaoLucroReal;
  onChange: (dados: PrecificacaoLucroReal) => void;
}

type ChaveLinhas = "horas" | "outrosCustos" | "composicao";

export function PrecificacaoLucroRealForm({ dados, onChange }: Props) {
  const r = calcularLucroReal(dados);

  const set = (patch: Partial<PrecificacaoLucroReal>) => onChange({ ...dados, ...patch });

  const atualizarLinha = (chave: ChaveLinhas, index: number, campo: keyof LinhaQtdValor, valor: any) => {
    const linhas = [...(dados[chave] || [])];
    linhas[index] = { ...linhas[index], [campo]: campo === "descricao" ? valor : Number(valor) };
    set({ [chave]: linhas } as any);
  };

  const adicionarLinha = (chave: ChaveLinhas) =>
    set({ [chave]: [...(dados[chave] || []), { descricao: "", quantidade: 0, valorUnitario: 0 }] } as any);

  const removerLinha = (chave: ChaveLinhas, index: number) =>
    set({ [chave]: (dados[chave] || []).filter((_, i) => i !== index) } as any);

  const atualizarPercentual = (index: number, campo: keyof LinhaPercentual, valor: any) => {
    const linhas = [...(dados.percentuais || [])];
    linhas[index] = { ...linhas[index], [campo]: campo === "descricao" ? valor : Number(valor) };
    set({ percentuais: linhas });
  };

  const renderLinhas = (chave: ChaveLinhas, titulo: string, rotuloValor: string, total: number) => (
    <Card>
      <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">{titulo}</CardTitle>
        <Button variant="outline" size="sm" onClick={() => adicionarLinha(chave)}>
          <Plus className="h-4 w-4 mr-1" /> Adicionar
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {(dados[chave] || []).map((linha, index) => (
          <div key={index} className="grid grid-cols-12 gap-2 items-center">
            <Input
              className="col-span-5"
              placeholder="Descrição"
              value={linha.descricao}
              onChange={(e) => atualizarLinha(chave, index, "descricao", e.target.value)}
            />
            <Input
              className="col-span-2"
              type="number"
              step="0.01"
              placeholder="Qtd"
              value={linha.quantidade}
              onChange={(e) => atualizarLinha(chave, index, "quantidade", e.target.value)}
            />
            <Input
              className="col-span-2"
              type="number"
              step="0.01"
              placeholder={rotuloValor}
              value={linha.valorUnitario}
              onChange={(e) => atualizarLinha(chave, index, "valorUnitario", e.target.value)}
            />
            <span className="col-span-2 text-sm font-medium text-right">
              {formatarMoeda((Number(linha.quantidade) || 0) * (Number(linha.valorUnitario) || 0))}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="col-span-1"
              onClick={() => removerLinha(chave, index)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
        <div className="flex justify-between border-t pt-2 text-sm font-semibold">
          <span>Total</span>
          <span>{formatarMoeda(total)}</span>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-primary/5 border-primary">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">💰 Preço base (a cobrar)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold">$</span>
              <Input
                type="number"
                step="0.01"
                min="0"
                className="text-2xl font-bold h-14"
                value={dados.precoBase}
                onChange={(e) => set({ precoBase: Number(e.target.value) })}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-accent bg-accent/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">✨ Lucro Real</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center gap-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Valor</p>
                <p className="text-2xl font-bold">{formatarMoeda(r.lucroReal)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Percentual</p>
                <p className="text-2xl font-bold">{formatarPercentual(r.percentualLucroReal)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {renderLinhas("horas", "⏱️ Custos por hora", "$/hora", r.totalHoras)}

      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">📊 Custos percentuais (sobre o preço base)</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => set({ percentuais: [...(dados.percentuais || []), { descricao: "", percentual: 0 }] })}
          >
            <Plus className="h-4 w-4 mr-1" /> Adicionar
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {(dados.percentuais || []).map((linha, index) => (
            <div key={index} className="grid grid-cols-12 gap-2 items-center">
              <Input
                className="col-span-6"
                placeholder="Descrição"
                value={linha.descricao}
                onChange={(e) => atualizarPercentual(index, "descricao", e.target.value)}
              />
              <div className="col-span-3 flex items-center gap-1">
                <Input
                  type="number"
                  step="0.01"
                  value={linha.percentual}
                  onChange={(e) => atualizarPercentual(index, "percentual", e.target.value)}
                />
                <span className="text-sm">%</span>
              </div>
              <span className="col-span-2 text-sm font-medium text-right">
                {formatarMoeda(((Number(dados.precoBase) || 0) * (Number(linha.percentual) || 0)) / 100)}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="col-span-1"
                onClick={() => set({ percentuais: (dados.percentuais || []).filter((_, i) => i !== index) })}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
          <div className="flex justify-between border-t pt-2 text-sm font-semibold">
            <span>Total</span>
            <span>{formatarMoeda(r.totalPercentuais)}</span>
          </div>
        </CardContent>
      </Card>

      {renderLinhas("outrosCustos", "🔧 Outros custos", "$ unit.", r.totalOutros)}
      {renderLinhas("composicao", "🧾 Composição de preço", "$ venda", r.precoAtual)}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Resumo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Preço base</span>
                <span className="font-medium">{formatarMoeda(dados.precoBase || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Custo Total</span>
                <span className="font-medium">{formatarMoeda(r.custoTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Preço atual (composição)</span>
                <span className="font-medium">{formatarMoeda(r.precoAtual)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Lucro</span>
                <span className="font-medium">{formatarMoeda(r.lucro)}</span>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div>
                <Label className="text-muted-foreground">Imposto sobre o lucro (%)</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    type="number"
                    step="0.01"
                    value={dados.impostoLucroPercentual}
                    onChange={(e) => set({ impostoLucroPercentual: Number(e.target.value) })}
                  />
                  <span className="whitespace-nowrap font-medium">{formatarMoeda(r.imposto)}</span>
                </div>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="font-semibold">Lucro Real</span>
                <span className="font-bold">
                  {formatarMoeda(r.lucroReal)} ({formatarPercentual(r.percentualLucroReal)})
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
