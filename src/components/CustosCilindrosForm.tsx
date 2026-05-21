import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, ChevronDown, Cylinder } from "lucide-react";
import {
  ItemCilindro,
  TipoItemCilindro,
  TIPOS_CILINDRO,
  recalcularItemCilindro,
  calcularTotalCilindros,
  formatarMoeda,
  VALORES_PADRAO_CILINDRO,
} from "@/lib/precificacao-utils";
import { useState } from "react";

interface Props {
  itens: ItemCilindro[];
  onChange: (itens: ItemCilindro[]) => void;
}

const novoItem = (tipo: TipoItemCilindro = "sae1045"): ItemCilindro => ({
  tipo,
  ...VALORES_PADRAO_CILINDRO[tipo],
  valorTotal: 0,
});

export function CustosCilindrosForm({ itens, onChange }: Props) {
  const [aberto, setAberto] = useState(false);
  const total = calcularTotalCilindros(itens);

  const atualizarItem = (index: number, campo: keyof ItemCilindro, valor: any) => {
    const novos = [...itens];
    const atualizado = { ...novos[index], [campo]: valor };
    novos[index] = recalcularItemCilindro(atualizado);
    onChange(novos);
  };

  const adicionar = () => {
    onChange([...itens, novoItem()]);
    setAberto(true);
  };

  const remover = (index: number) => {
    onChange(itens.filter((_, i) => i !== index));
  };

  const renderCamposItem = (item: ItemCilindro, index: number) => {
    const numInput = (label: string, campo: keyof ItemCilindro, placeholder = "0") => (
      <div className="space-y-1">
        <Label className="text-xs">{label}</Label>
        <Input
          type="number"
          value={(item[campo] as number) ?? ""}
          onChange={(e) => atualizarItem(index, campo, e.target.value === "" ? undefined : Number(e.target.value))}
          step="0.01"
          min="0"
          placeholder={placeholder}
          className="h-9"
        />
      </div>
    );

    switch (item.tipo) {
      case "sae1045":
      case "sae1045_cromado":
      case "bronze_tm23":
      case "ferro_fundido":
        return (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {numInput("Ø Externo (mm)", "diametroExterno")}
            {numInput("Comprimento (mm)", "comprimento")}
            {numInput("Valor/KG (R$)", "valorKg")}
          </div>
        );
      case "tubo_brunido":
      case "oxicorte_redondo":
        return (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {numInput("Ø Externo (mm)", "diametroExterno")}
            {numInput("Ø Interno (mm)", "diametroInterno")}
            {numInput("Comprimento (mm)", "comprimento")}
            {numInput("Valor/KG (R$)", "valorKg")}
          </div>
        );
      case "sae1020_chapa":
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {numInput("Espessura (mm)", "espessura")}
            {numInput("Largura (mm)", "largura")}
            {numInput("Comprimento (mm)", "comprimento")}
            {numInput("Valor/KG (R$)", "valorKg")}
          </div>
        );
      case "servico_cromo":
        return (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {numInput("Ø Haste (mm)", "diametroExterno")}
            {numInput("Comprimento (mm)", "comprimento")}
            {numInput("Valor/Decímetro (R$)", "valorDecimetro")}
          </div>
        );
      case "servico_brunimento":
        return (
          <div className="grid grid-cols-2 gap-2">
            {numInput("Horas", "horas")}
            {numInput("Valor/Hora (R$)", "valorHora")}
          </div>
        );
    }
  };

  return (
    <Card>
      <Collapsible open={aberto} onOpenChange={setAberto}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CollapsibleTrigger asChild>
              <button className="flex items-center gap-2 flex-1 text-left">
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${aberto ? "rotate-180" : ""}`}
                />
                <Cylinder className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Custos Cilindros Hidráulicos</CardTitle>
              </button>
            </CollapsibleTrigger>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold">{formatarMoeda(total)}</span>
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  adicionar();
                }}
              >
                <Plus className="h-4 w-4 mr-1" />
                Adicionar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-3">
            {itens.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum item adicionado. Clique em "Adicionar" para incluir matérias-primas ou serviços.
              </p>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {itens.map((item, index) => (
                  <div key={index} className="border rounded-lg p-3 bg-muted/30 space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        value={item.nome ?? ""}
                        onChange={(e) => atualizarItem(index, "nome", e.target.value)}
                        placeholder="Nome da peça (ex: Haste, Camisa...)"
                        className="flex-1 h-9"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => remover(index)}
                        className="text-destructive hover:text-destructive h-9 w-9"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={item.tipo}
                        onValueChange={(v) => {
                          const novo = recalcularItemCilindro({ ...novoItem(v as TipoItemCilindro), nome: item.nome });
                          const novos = [...itens];
                          novos[index] = novo;
                          onChange(novos);
                        }}
                      >
                        <SelectTrigger className="flex-1 h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIPOS_CILINDRO.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {renderCamposItem(item, index)}
                    <div className="flex justify-between items-center text-sm pt-2 border-t">
                      {item.peso !== undefined ? (
                        <span className="text-muted-foreground">
                          Peso: <strong>{item.peso.toFixed(2)} kg</strong>
                        </span>
                      ) : (
                        <span />
                      )}
                      <span className="font-semibold">
                        Total: {formatarMoeda(item.valorTotal || 0)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="pt-3 border-t flex justify-between items-center font-semibold">
              <span>Total Cilindros Hidráulicos:</span>
              <span className="text-lg">{formatarMoeda(total)}</span>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}