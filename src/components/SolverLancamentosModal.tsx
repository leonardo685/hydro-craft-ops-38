import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calculator, Search, Check, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import type { LancamentoFinanceiro } from "@/hooks/use-lancamentos-financeiros";

interface SolverLancamentosModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lancamentos: LancamentoFinanceiro[];
  onMarcarComoPago: (ids: string[], dataRealizada: Date) => Promise<void>;
}

interface CombinacaoEncontrada {
  lancamentos: LancamentoFinanceiro[];
  total: number;
}

export function SolverLancamentosModal({
  open,
  onOpenChange,
  lancamentos,
  onMarcarComoPago,
}: SolverLancamentosModalProps) {
  const [tipo, setTipo] = useState<"entrada" | "saida">("entrada");
  const [valorAlvo, setValorAlvo] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [combinacoes, setCombinacoes] = useState<CombinacaoEncontrada[]>([]);
  const [combinacaoSelecionada, setCombinacaoSelecionada] = useState<number | null>(null);
  const [itensSelecionados, setItensSelecionados] = useState<Set<string>>(new Set());
  const [salvando, setSalvando] = useState(false);

  // Filtrar lançamentos não pagos do tipo selecionado
  const lancamentosPendentes = useMemo(() => {
    return lancamentos.filter((l) => {
      // Não pagos
      if (l.pago) return false;
      // Não incluir transferências
      if (l.tipo === "transferencia") return false;
      // Do tipo selecionado
      if (l.tipo !== tipo) return false;
      return true;
    });
  }, [lancamentos, tipo]);

  // Algoritmo de busca de combinações (subset sum) - usando centavos para precisão
  const buscarCombinacoes = () => {
    // Converter para centavos (inteiros) para evitar erros de ponto flutuante
    const valorNumerico = Math.round(parseFloat(valorAlvo.replace(",", ".")) * 100);
    if (isNaN(valorNumerico) || valorNumerico <= 0) {
      toast.error("Digite um valor válido maior que zero");
      return;
    }

    setBuscando(true);
    setCombinacoes([]);
    setCombinacaoSelecionada(null);
    setItensSelecionados(new Set());

    // Timeout para não travar a UI
    setTimeout(() => {
      const resultados: CombinacaoEncontrada[] = [];
      const tolerancia = 1; // 1 centavo de tolerância
      const maxCombinacoes = 5;
      const maxLancamentos = 100;

      // Limitar para performance e adicionar valorCentavos
      const lancamentosParaBusca = lancamentosPendentes
        .slice(0, maxLancamentos)
        .map((l) => ({ ...l, valorCentavos: Math.round(l.valor * 100) }))
        .sort((a, b) => b.valorCentavos - a.valorCentavos); // Ordenar por valor descendente

      type LancamentoComCentavos = LancamentoFinanceiro & { valorCentavos: number };

      // Função recursiva de busca usando centavos
      const buscar = (
        indiceAtual: number,
        somaAtual: number,
        combinacaoAtual: LancamentoComCentavos[]
      ): boolean => {
        // Encontrou uma combinação válida (comparação em centavos)
        if (Math.abs(somaAtual - valorNumerico) <= tolerancia) {
          resultados.push({
            lancamentos: [...combinacaoAtual],
            total: somaAtual / 100, // Reconverter para reais
          });
          return resultados.length >= maxCombinacoes;
        }

        // Soma excedeu o valor alvo ou chegou ao fim
        if (somaAtual > valorNumerico + tolerancia || indiceAtual >= lancamentosParaBusca.length) {
          return false;
        }

        // Tentar incluir o lançamento atual (usando valorCentavos)
        combinacaoAtual.push(lancamentosParaBusca[indiceAtual]);
        if (buscar(indiceAtual + 1, somaAtual + lancamentosParaBusca[indiceAtual].valorCentavos, combinacaoAtual)) {
          return true;
        }
        combinacaoAtual.pop();

        // Tentar não incluir o lançamento atual
        if (buscar(indiceAtual + 1, somaAtual, combinacaoAtual)) {
          return true;
        }

        return false;
      };

      // Iniciar busca com timeout de 3 segundos
      const startTime = Date.now();
      const buscarComTimeout = (
        indiceAtual: number,
        somaAtual: number,
        combinacaoAtual: LancamentoComCentavos[]
      ): boolean => {
        if (Date.now() - startTime > 3000) {
          return true; // Timeout
        }
        return buscar(indiceAtual, somaAtual, combinacaoAtual);
      };

      buscarComTimeout(0, 0, [] as LancamentoComCentavos[]);

      // Ordenar por quantidade de lançamentos (menos é melhor)
      resultados.sort((a, b) => a.lancamentos.length - b.lancamentos.length);

      setCombinacoes(resultados);
      setBuscando(false);

      if (resultados.length === 0) {
        toast.info("Nenhuma combinação encontrada para este valor");
      } else {
        toast.success(`${resultados.length} combinação(ões) encontrada(s)`);
        // Selecionar automaticamente a primeira combinação
        setCombinacaoSelecionada(0);
        setItensSelecionados(new Set(resultados[0].lancamentos.map((l) => l.id)));
      }
    }, 100);
  };

  const handleSelecionarCombinacao = (index: number) => {
    setCombinacaoSelecionada(index);
    setItensSelecionados(new Set(combinacoes[index].lancamentos.map((l) => l.id)));
  };

  const toggleItemSelecionado = (id: string) => {
    setItensSelecionados((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const totalSelecionado = useMemo(() => {
    // Calcular em centavos para evitar erros de ponto flutuante
    const totalCentavos = lancamentos
      .filter((l) => itensSelecionados.has(l.id))
      .reduce((acc, l) => acc + Math.round(l.valor * 100), 0);
    return totalCentavos / 100;
  }, [lancamentos, itensSelecionados]);

  const handleMarcarComoPago = async () => {
    if (itensSelecionados.size === 0) {
      toast.error("Selecione pelo menos um lançamento");
      return;
    }

    setSalvando(true);
    try {
      await onMarcarComoPago(Array.from(itensSelecionados), new Date());
      toast.success(`${itensSelecionados.size} lançamento(s) marcado(s) como pago(s)`);
      onOpenChange(false);
      // Reset
      setValorAlvo("");
      setCombinacoes([]);
      setCombinacaoSelecionada(null);
      setItensSelecionados(new Set());
    } catch (error) {
      console.error("Erro ao marcar como pago:", error);
      toast.error("Erro ao marcar lançamentos como pagos");
    } finally {
      setSalvando(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getStatusLancamento = (lancamento: LancamentoFinanceiro) => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataEsperada = new Date(lancamento.dataEsperada);
    dataEsperada.setHours(0, 0, 0, 0);

    if (dataEsperada < hoje) {
      return { label: "Atrasado", variant: "destructive" as const };
    }
    return { label: "No Prazo", variant: "default" as const };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Solver - Identificar Lançamentos
          </DialogTitle>
          <DialogDescription>
            Encontre a combinação de lançamentos que totaliza um valor específico
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-y-auto">
          {/* Filtros de busca */}
          <div className="flex gap-4 items-end">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as "entrada" | "saida")}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="saida">Saída</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 flex-1">
              <Label>Valor Alvo</Label>
              <Input
                placeholder="Ex: 15000,00"
                value={valorAlvo}
                onChange={(e) => setValorAlvo(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && buscarCombinacoes()}
              />
            </div>

            <Button onClick={buscarCombinacoes} disabled={buscando}>
              {buscando ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              Buscar
            </Button>
          </div>

          {/* Info de lançamentos disponíveis */}
          <div className="text-sm text-muted-foreground">
            {lancamentosPendentes.length} lançamento(s) pendente(s) de{" "}
            {tipo === "entrada" ? "entrada" : "saída"} disponíveis para busca
          </div>

          {/* Seletor de combinações */}
          {combinacoes.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              <Label className="w-full">Combinações encontradas:</Label>
              {combinacoes.map((combo, index) => (
                <Button
                  key={index}
                  variant={combinacaoSelecionada === index ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleSelecionarCombinacao(index)}
                >
                  {combo.lancamentos.length} lançamento(s) = {formatCurrency(combo.total)}
                </Button>
              ))}
            </div>
          )}

          {/* Tabela de resultados */}
          {combinacaoSelecionada !== null && combinacoes[combinacaoSelecionada] && (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={
                          combinacoes[combinacaoSelecionada].lancamentos.length > 0 &&
                          combinacoes[combinacaoSelecionada].lancamentos.every((l) =>
                            itensSelecionados.has(l.id)
                          )
                        }
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setItensSelecionados(
                              new Set(combinacoes[combinacaoSelecionada].lancamentos.map((l) => l.id))
                            );
                          } else {
                            setItensSelecionados(new Set());
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Fornecedor/Cliente</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Data Esperada</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {combinacoes[combinacaoSelecionada].lancamentos.map((lancamento) => {
                    const status = getStatusLancamento(lancamento);
                    return (
                      <TableRow key={lancamento.id}>
                        <TableCell>
                          <Checkbox
                            checked={itensSelecionados.has(lancamento.id)}
                            onCheckedChange={() => toggleItemSelecionado(lancamento.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{lancamento.descricao}</TableCell>
                        <TableCell>{lancamento.fornecedorCliente || "-"}</TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(lancamento.valor)}
                        </TableCell>
                        <TableCell>
                          {format(new Date(lancamento.dataEsperada), "dd/MM/yyyy")}
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Total selecionado */}
          {itensSelecionados.size > 0 && (
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <span className="text-sm text-muted-foreground">Total Selecionado:</span>
                <span className="ml-2 text-lg font-bold">{formatCurrency(totalSelecionado)}</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {itensSelecionados.size} lançamento(s) selecionado(s)
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleMarcarComoPago}
            disabled={itensSelecionados.size === 0 || salvando}
          >
            {salvando ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Check className="h-4 w-4 mr-2" />
            )}
            Marcar Selecionados como Pagos
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
