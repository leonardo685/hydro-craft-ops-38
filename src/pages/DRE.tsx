import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useMemo } from "react";
import { useLancamentosFinanceiros } from "@/hooks/use-lancamentos-financeiros";
import { useCategoriasFinanceiras } from "@/hooks/use-categorias-financeiras";
import { cn } from "@/lib/utils";

interface DREItem {
  codigo?: string;
  conta: string;
  valor: number;
  percentual: number;
  tipo: 'categoria_mae' | 'categoria_filha' | 'calculo';
  nivel: number;
}

export default function DRE() {
  const { lancamentos, loading } = useLancamentosFinanceiros();
  const { categorias } = useCategoriasFinanceiras();
  
  const [filtrosDRE, setFiltrosDRE] = useState({
    ano: new Date().getFullYear().toString(),
    mes: (new Date().getMonth() + 1).toString().padStart(2, '0')
  });

  // Calcular DRE hierárquico baseado nas categorias cadastradas
  const dreData = useMemo(() => {
    const resultado: DREItem[] = [];

    console.log('🔍 DRE Debug - Total de lançamentos:', lancamentos.length);
    console.log('🔍 DRE Debug - Filtros:', filtrosDRE);
    console.log('🔍 DRE Debug - Categorias disponíveis:', categorias);

    // Filtrar lançamentos por data de emissão (independente se foi pago)
    const lancamentosFiltrados = lancamentos.filter(l => {
      const data = new Date(l.dataEmissao);
      const ano = data.getFullYear().toString();
      const mes = (data.getMonth() + 1).toString().padStart(2, '0');
      console.log(`📅 Lançamento: ${l.descricao} - Data: ${l.dataEmissao} - Ano: ${ano} - Mês: ${mes} - Categoria ID: ${l.categoriaId}`);
      return ano === filtrosDRE.ano && mes === filtrosDRE.mes;
    });

    console.log('✅ DRE Debug - Lançamentos filtrados:', lancamentosFiltrados.length);
    console.log('✅ DRE Debug - Lançamentos filtrados detalhes:', lancamentosFiltrados);

    // Calcular total de receitas (para base do percentual)
    const totalReceitas = lancamentosFiltrados
      .filter(l => l.tipo === 'entrada')
      .reduce((acc, l) => acc + l.valor, 0);

    // Função para obter categoria por ID
    const getCategoriaById = (id: string) => categorias.find(c => c.id === id);

    // Função para calcular valor de uma categoria
    const calcularValorCategoria = (categoriaId: string): number => {
      return lancamentosFiltrados
        .filter(l => l.categoriaId === categoriaId)
        .reduce((acc, l) => acc + l.valor, 0);
    };

    // Função para adicionar categoria mãe e suas filhas
    const adicionarCategoriaMae = (codigo: string, tipo: 'entrada' | 'saida'): number => {
      const categoriaMae = categorias.find(c => c.tipo === 'mae' && c.codigo === codigo && c.classificacao === tipo);
      if (!categoriaMae) return 0;

      const categoriasFilhas = categorias.filter(c => c.tipo === 'filha' && c.categoriaMaeId === categoriaMae.id);
      
      let totalCategoriaMae = 0;

      // Adicionar categorias filhas
      categoriasFilhas.forEach(filha => {
        const valorFilha = calcularValorCategoria(filha.id);
        totalCategoriaMae += valorFilha;
        
        if (valorFilha !== 0) {
          resultado.push({
            codigo: filha.codigo,
            conta: filha.nome,
            valor: valorFilha,
            percentual: totalReceitas > 0 ? (valorFilha / totalReceitas) * 100 : 0,
            tipo: 'categoria_filha',
            nivel: 2
          });
        }
      });

      // Adicionar categoria mãe (total)
      if (totalCategoriaMae !== 0) {
        resultado.unshift({
          codigo: categoriaMae.codigo,
          conta: categoriaMae.nome,
          valor: totalCategoriaMae,
          percentual: totalReceitas > 0 ? (totalCategoriaMae / totalReceitas) * 100 : 0,
          tipo: 'categoria_mae',
          nivel: 1
        });
      }

      return totalCategoriaMae;
    };

    // 1. RECEITAS OPERACIONAIS (todas categorias mãe de entrada)
    const categoriasMaeEntrada = categorias.filter(c => c.tipo === 'mae' && c.classificacao === 'entrada');
    let totalReceitasOperacionais = 0;

    categoriasMaeEntrada.forEach(mae => {
      const categoriasFilhas = categorias.filter(c => c.tipo === 'filha' && c.categoriaMaeId === mae.id);
      let totalMae = 0;

      // Adicionar filhas
      categoriasFilhas.forEach(filha => {
        const valorFilha = calcularValorCategoria(filha.id);
        totalMae += valorFilha;
        
        if (valorFilha !== 0) {
          resultado.push({
            codigo: filha.codigo,
            conta: filha.nome,
            valor: valorFilha,
            percentual: totalReceitas > 0 ? (valorFilha / totalReceitas) * 100 : 0,
            tipo: 'categoria_filha',
            nivel: 2
          });
        }
      });

      // Adicionar mãe
      if (totalMae !== 0) {
        const indexInsert = resultado.length - categoriasFilhas.filter(f => calcularValorCategoria(f.id) !== 0).length;
        resultado.splice(indexInsert, 0, {
          codigo: mae.codigo,
          conta: mae.nome,
          valor: totalMae,
          percentual: totalReceitas > 0 ? (totalMae / totalReceitas) * 100 : 0,
          tipo: 'categoria_mae',
          nivel: 1
        });
      }

      totalReceitasOperacionais += totalMae;
    });

    // 2. DESPESAS OPERACIONAIS (categorias mãe de saída)
    const categoriasMaeSaida = categorias.filter(c => c.tipo === 'mae' && c.classificacao === 'saida');
    let totalDespesasOperacionais = 0;

    categoriasMaeSaida.forEach(mae => {
      const categoriasFilhas = categorias.filter(c => c.tipo === 'filha' && c.categoriaMaeId === mae.id);
      let totalMae = 0;

      // Adicionar filhas
      categoriasFilhas.forEach(filha => {
        const valorFilha = calcularValorCategoria(filha.id);
        totalMae += valorFilha;
        
        if (valorFilha !== 0) {
          resultado.push({
            codigo: filha.codigo,
            conta: filha.nome,
            valor: valorFilha,
            percentual: totalReceitas > 0 ? (valorFilha / totalReceitas) * 100 : 0,
            tipo: 'categoria_filha',
            nivel: 2
          });
        }
      });

      // Adicionar mãe
      if (totalMae !== 0) {
        const indexInsert = resultado.length - categoriasFilhas.filter(f => calcularValorCategoria(f.id) !== 0).length;
        resultado.splice(indexInsert, 0, {
          codigo: mae.codigo,
          conta: mae.nome,
          valor: totalMae,
          percentual: totalReceitas > 0 ? (totalMae / totalReceitas) * 100 : 0,
          tipo: 'categoria_mae',
          nivel: 1
        });
      }

      totalDespesasOperacionais += totalMae;
    });

    // 3. CÁLCULOS
    const margemContribuicao = totalReceitasOperacionais - totalDespesasOperacionais;
    
    resultado.push({
      conta: 'Margem de Contribuição',
      valor: margemContribuicao,
      percentual: totalReceitas > 0 ? (margemContribuicao / totalReceitas) * 100 : 0,
      tipo: 'calculo',
      nivel: 0
    });

    const lucroLiquido = margemContribuicao;

    resultado.push({
      conta: 'Lucro Líquido',
      valor: lucroLiquido,
      percentual: totalReceitas > 0 ? (lucroLiquido / totalReceitas) * 100 : 0,
      tipo: 'calculo',
      nivel: 0
    });

    return resultado;
  }, [lancamentos, filtrosDRE, categorias]);

  const totalReceitas = useMemo(() => {
    const lancamentosFiltrados = lancamentos.filter(l => {
      const data = new Date(l.dataEmissao);
      const ano = data.getFullYear().toString();
      const mes = (data.getMonth() + 1).toString().padStart(2, '0');
      return ano === filtrosDRE.ano && mes === filtrosDRE.mes && l.tipo === 'entrada';
    });
    return lancamentosFiltrados.reduce((acc, l) => acc + l.valor, 0);
  }, [lancamentos, filtrosDRE]);

  const margemContribuicao = dreData.find(d => d.conta === "Margem de Contribuição")?.valor || 0;
  const lucroLiquido = dreData.find(d => d.conta === "Lucro Líquido")?.valor || 0;

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    });
  };

  const getDreRowStyle = (tipo: string) => {
    switch (tipo) {
      case 'categoria_mae':
        return "font-semibold bg-muted/50";
      case 'calculo':
        return "font-bold bg-primary/10 text-primary";
      case 'categoria_filha':
        return "";
      default:
        return "";
    }
  };

  const getDreValueStyle = (value: number, tipo: string) => {
    if (tipo === 'calculo') return "text-primary font-bold";
    if (tipo === 'categoria_mae') return "font-semibold";
    return "";
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">DRE</h1>
          <p className="text-muted-foreground">Demonstração do Resultado do Exercício</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Ano</label>
                <Select value={filtrosDRE.ano} onValueChange={(value) => setFiltrosDRE({ ...filtrosDRE, ano: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2023">2023</SelectItem>
                    <SelectItem value="2024">2024</SelectItem>
                    <SelectItem value="2025">2025</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Mês</label>
                <Select value={filtrosDRE.mes} onValueChange={(value) => setFiltrosDRE({ ...filtrosDRE, mes: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="01">Janeiro</SelectItem>
                    <SelectItem value="02">Fevereiro</SelectItem>
                    <SelectItem value="03">Março</SelectItem>
                    <SelectItem value="04">Abril</SelectItem>
                    <SelectItem value="05">Maio</SelectItem>
                    <SelectItem value="06">Junho</SelectItem>
                    <SelectItem value="07">Julho</SelectItem>
                    <SelectItem value="08">Agosto</SelectItem>
                    <SelectItem value="09">Setembro</SelectItem>
                    <SelectItem value="10">Outubro</SelectItem>
                    <SelectItem value="11">Novembro</SelectItem>
                    <SelectItem value="12">Dezembro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Receitas</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-sm text-muted-foreground">Carregando...</div>
              ) : (
                <>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(totalReceitas)}
                  </div>
                  <Badge variant="outline" className="text-xs mt-1">
                    {filtrosDRE.mes}/{filtrosDRE.ano}
                  </Badge>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Margem de Contribuição</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-sm text-muted-foreground">Carregando...</div>
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {formatCurrency(margemContribuicao)}
                  </div>
                  <Badge variant="outline" className="text-xs mt-1">
                    Margem: {totalReceitas > 0 ? ((margemContribuicao / totalReceitas) * 100).toFixed(1) : 0}%
                  </Badge>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Lucro Líquido</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-sm text-muted-foreground">Carregando...</div>
              ) : (
                <>
                  <div className="text-2xl font-bold text-primary">
                    {formatCurrency(lucroLiquido)}
                  </div>
                  <Badge variant="outline" className="text-xs mt-1">
                    Margem: {totalReceitas > 0 ? ((lucroLiquido / totalReceitas) * 100).toFixed(1) : 0}%
                  </Badge>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Demonstração Detalhada do Resultado do Exercício</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Conta</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      Carregando dados...
                    </TableCell>
                  </TableRow>
                ) : dreData.length === 0 || totalReceitas === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      Nenhum dado financeiro para o período selecionado. Comece adicionando lançamentos financeiros.
                    </TableCell>
                  </TableRow>
                ) : (
                  dreData.map((item, index) => (
                    <TableRow key={index} className={getDreRowStyle(item.tipo)}>
                      <TableCell className="font-mono text-sm">
                        {item.codigo || ''}
                      </TableCell>
                      <TableCell 
                        className={cn(
                          item.nivel === 0 && "font-bold",
                          item.nivel === 1 && "pl-6 font-semibold",
                          item.nivel === 2 && "pl-12"
                        )}
                      >
                        {item.conta}
                      </TableCell>
                      <TableCell 
                        className={`text-right ${getDreValueStyle(item.valor, item.tipo)}`}
                      >
                        {formatCurrency(item.valor)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {item.percentual.toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
