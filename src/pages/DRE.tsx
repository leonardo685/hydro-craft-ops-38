import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useMemo, useCallback } from "react";
import { useLancamentosFinanceiros } from "@/hooks/use-lancamentos-financeiros";
import { useCategoriasFinanceiras } from "@/hooks/use-categorias-financeiras";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight } from "lucide-react";
import { DetalhesCategoriaDREModal } from "@/components/DetalhesCategoriaDREModal";

interface DREItem {
  codigo?: string;
  conta: string;
  valor: number;
  percentual: number;
  tipo: 'categoria_mae' | 'categoria_filha' | 'calculo';
  nivel: number;
  codigoMae?: string;
  categoriaId?: string;
}

export default function DRE() {
  const { lancamentos, loading } = useLancamentosFinanceiros();
  const { categorias } = useCategoriasFinanceiras();
  
  const [filtrosDRE, setFiltrosDRE] = useState({
    ano: new Date().getFullYear().toString(),
    mes: (new Date().getMonth() + 1).toString().padStart(2, '0')
  });

  const [categoriasExpandidas, setCategoriasExpandidas] = useState<Set<string>>(new Set());
  const [modalDetalhes, setModalDetalhes] = useState<{
    open: boolean;
    categoria: { codigo?: string; nome: string; valor: number } | null;
    categoriaIds: string[];
  }>({ open: false, categoria: null, categoriaIds: [] });

  const toggleCategoria = (codigo: string) => {
    setCategoriasExpandidas(prev => {
      const newSet = new Set(prev);
      if (newSet.has(codigo)) {
        newSet.delete(codigo);
      } else {
        newSet.add(codigo);
      }
      return newSet;
    });
  };

  // Calcular DRE hierárquico baseado nas categorias cadastradas
  const dreData = useMemo(() => {
    const resultado: DREItem[] = [];

    console.log('🔍 DRE Debug - Total de lançamentos:', lancamentos.length);
    console.log('🔍 DRE Debug - Filtros:', filtrosDRE);
    console.log('🔍 DRE Debug - Categorias disponíveis:', categorias);

    // Filtrar lançamentos usando lógica híbrida de competência:
    // - Recorrências: usa data_esperada (quando a despesa/receita deve ser reconhecida)
    // - Lançamentos simples: usa data_emissao (quando foi efetivamente registrada)
    const lancamentosFiltrados = lancamentos.filter(l => {
      // Excluir transferências entre contas do DRE
      if (l.tipo === 'transferencia') return false;
      
      // Excluir parcelas (lançamentos com lancamentoPaiId preenchido)
      if (l.lancamentoPaiId) return false;
      
      // Determinar qual data usar baseado se é recorrência
      const ehRecorrencia = !!l.frequenciaRepeticao;
      const dataReferencia = ehRecorrencia ? l.dataEsperada : l.dataEmissao;
      
      // Validar se a data de referência existe
      if (!dataReferencia) return false;
      
      const data = new Date(dataReferencia);
      const ano = data.getFullYear().toString();
      const mes = (data.getMonth() + 1).toString().padStart(2, '0');
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

    // Função auxiliar para adicionar categoria mãe por código (SEMPRE adiciona, mesmo com valor zero)
    const adicionarCategoriaPorCodigo = (codigo: string): number => {
      const categoriaMae = categorias.find(c => c.tipo === 'mae' && c.codigo === codigo);
      if (!categoriaMae) return 0;

      const categoriasFilhas = categorias.filter(c => c.tipo === 'filha' && c.categoriaMaeId === categoriaMae.id);
      let totalMae = 0;

      // Calcular valor dos lançamentos diretos na categoria mãe
      const valorDiretoMae = calcularValorCategoria(categoriaMae.id);
      totalMae += valorDiretoMae;

      // Sempre adicionar a categoria mãe primeiro
      const indexMae = resultado.length;
      resultado.push({
        codigo: categoriaMae.codigo,
        conta: categoriaMae.nome,
        valor: 0, // Será atualizado depois
        percentual: 0,
        tipo: 'categoria_mae',
        nivel: 1,
        categoriaId: categoriaMae.id
      });

      // Adicionar todas as filhas (mesmo com valor zero)
      categoriasFilhas.forEach(filha => {
        const valorFilha = calcularValorCategoria(filha.id);
        totalMae += valorFilha;
        
        resultado.push({
          codigo: filha.codigo,
          conta: filha.nome,
          valor: valorFilha,
          percentual: totalReceitas > 0 ? (valorFilha / totalReceitas) * 100 : 0,
          tipo: 'categoria_filha',
          nivel: 2,
          codigoMae: categoriaMae.codigo,
          categoriaId: filha.id
        });
      });

      // Se houver lançamentos diretos na categoria mãe (sem subcategoria), adicionar linha
      if (valorDiretoMae !== 0) {
        resultado.push({
          codigo: `${categoriaMae.codigo}.0`,
          conta: `Outros - ${categoriaMae.nome}`,
          valor: valorDiretoMae,
          percentual: totalReceitas > 0 ? (valorDiretoMae / totalReceitas) * 100 : 0,
          tipo: 'categoria_filha',
          nivel: 2,
          codigoMae: categoriaMae.codigo,
          categoriaId: categoriaMae.id
        });
      }

      // Atualizar valor da categoria mãe
      resultado[indexMae].valor = totalMae;
      resultado[indexMae].percentual = totalReceitas > 0 ? (totalMae / totalReceitas) * 100 : 0;

      return totalMae;
    };

    // 1. RECEITAS OPERACIONAIS (Código 1)
    const receitasOperacionais = adicionarCategoriaPorCodigo('1');

    // 2. CUSTOS VARIÁVEIS (Código 2)
    const custosVariaveis = adicionarCategoriaPorCodigo('2');

    // 3. MARGEM DE CONTRIBUIÇÃO
    const margemContribuicao = receitasOperacionais - custosVariaveis;
    resultado.push({
      conta: '(=) MARGEM DE CONTRIBUIÇÃO',
      valor: margemContribuicao,
      percentual: totalReceitas > 0 ? (margemContribuicao / totalReceitas) * 100 : 0,
      tipo: 'calculo',
      nivel: 0
    });

    // 4. DESPESAS FIXAS (Código 3)
    const despesasFixas = adicionarCategoriaPorCodigo('3');

    // 5. LUCRO ANTES DOS INVESTIMENTOS
    const lucroAntesInvestimentos = margemContribuicao - despesasFixas;
    resultado.push({
      conta: '(=) LUCRO ANTES DOS INVESTIMENTOS',
      valor: lucroAntesInvestimentos,
      percentual: totalReceitas > 0 ? (lucroAntesInvestimentos / totalReceitas) * 100 : 0,
      tipo: 'calculo',
      nivel: 0
    });

    // 6. INVESTIMENTOS (Código 4)
    const investimentos = adicionarCategoriaPorCodigo('4');

    // 7. LUCRO OPERACIONAL
    const lucroOperacional = lucroAntesInvestimentos - investimentos;
    resultado.push({
      conta: '(=) LUCRO OPERACIONAL',
      valor: lucroOperacional,
      percentual: totalReceitas > 0 ? (lucroOperacional / totalReceitas) * 100 : 0,
      tipo: 'calculo',
      nivel: 0
    });

    // 8. RECEITAS NÃO OPERACIONAIS (Código 5)
    const receitasNaoOperacionais = adicionarCategoriaPorCodigo('5');

    // 9. SAÍDAS NÃO OPERACIONAIS (Código 6)
    const saidasNaoOperacionais = adicionarCategoriaPorCodigo('6');

    // 10. LUCRO LÍQUIDO
    const lucroLiquido = lucroOperacional + receitasNaoOperacionais - saidasNaoOperacionais;
    resultado.push({
      conta: '(=) LUCRO LÍQUIDO',
      valor: lucroLiquido,
      percentual: totalReceitas > 0 ? (lucroLiquido / totalReceitas) * 100 : 0,
      tipo: 'calculo',
      nivel: 0
    });

    return resultado;
  }, [lancamentos, filtrosDRE, categorias]);

  const dreDataFiltrado = useMemo(() => {
    return dreData.filter(item => {
      // Sempre mostrar cálculos e categorias mães
      if (item.tipo === 'calculo' || item.tipo === 'categoria_mae') {
        return true;
      }
      
      // Mostrar filhas apenas se a mãe estiver expandida
      if (item.tipo === 'categoria_filha' && item.codigoMae) {
        return categoriasExpandidas.has(item.codigoMae);
      }
      
      return true;
    });
  }, [dreData, categoriasExpandidas]);

  const totalReceitas = useMemo(() => {
    const lancamentosFiltrados = lancamentos.filter(l => {
      // Lógica híbrida: recorrências usam data_esperada, simples usam data_emissao
      const ehRecorrencia = !!l.frequenciaRepeticao;
      const dataReferencia = ehRecorrencia ? l.dataEsperada : l.dataEmissao;
      
      if (!dataReferencia) return false;
      
      const data = new Date(dataReferencia);
      const ano = data.getFullYear().toString();
      const mes = (data.getMonth() + 1).toString().padStart(2, '0');
      return ano === filtrosDRE.ano && mes === filtrosDRE.mes && l.tipo === 'entrada';
    });
    return lancamentosFiltrados.reduce((acc, l) => acc + l.valor, 0);
  }, [lancamentos, filtrosDRE]);

  const margemContribuicao = dreData.find(d => d.conta === "(=) MARGEM DE CONTRIBUIÇÃO")?.valor || 0;
  const lucroAntesInvestimentos = dreData.find(d => d.conta === "(=) LUCRO ANTES DOS INVESTIMENTOS")?.valor || 0;
  const lucroOperacional = dreData.find(d => d.conta === "(=) LUCRO OPERACIONAL")?.valor || 0;
  const lucroLiquido = dreData.find(d => d.conta === "(=) LUCRO LÍQUIDO")?.valor || 0;

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

  // Função para obter lançamentos filtrados do período
  const lancamentosFiltradosPeriodo = useMemo(() => {
    return lancamentos.filter(l => {
      if (l.tipo === 'transferencia') return false;
      if (l.lancamentoPaiId) return false;
      
      const ehRecorrencia = !!l.frequenciaRepeticao;
      const dataReferencia = ehRecorrencia ? l.dataEsperada : l.dataEmissao;
      
      if (!dataReferencia) return false;
      
      const data = new Date(dataReferencia);
      const ano = data.getFullYear().toString();
      const mes = (data.getMonth() + 1).toString().padStart(2, '0');
      return ano === filtrosDRE.ano && mes === filtrosDRE.mes;
    });
  }, [lancamentos, filtrosDRE]);

  // Função para abrir modal com detalhes da categoria
  const handleClickValor = useCallback((item: DREItem) => {
    if (item.tipo === 'calculo' || !item.categoriaId) return;

    // Se for categoria mãe, incluir todas as filhas
    let categoriaIds: string[] = [];
    if (item.tipo === 'categoria_mae') {
      const categoriaMae = categorias.find(c => c.id === item.categoriaId);
      if (categoriaMae) {
        const filhas = categorias
          .filter(c => c.categoriaMaeId === categoriaMae.id)
          .map(c => c.id);
        categoriaIds = [categoriaMae.id, ...filhas];
      }
    } else {
      categoriaIds = [item.categoriaId];
    }

    setModalDetalhes({
      open: true,
      categoria: {
        codigo: item.codigo,
        nome: item.conta,
        valor: item.valor
      },
      categoriaIds
    });
  }, [categorias]);

  // Lançamentos para o modal de detalhes
  const lancamentosModal = useMemo(() => {
    if (!modalDetalhes.open || modalDetalhes.categoriaIds.length === 0) return [];
    
    return lancamentosFiltradosPeriodo
      .filter(l => l.categoriaId && modalDetalhes.categoriaIds.includes(l.categoriaId))
      .map(l => {
        const dataRef = l.frequenciaRepeticao ? l.dataEsperada : l.dataEmissao;
        return {
          id: l.id,
          descricao: l.descricao,
          valor: l.valor,
          data: dataRef instanceof Date ? dataRef.toISOString() : String(dataRef),
          fornecedorCliente: l.fornecedorCliente,
          contaBancaria: l.contaBancaria,
          pago: l.pago
        };
      });
  }, [lancamentosFiltradosPeriodo, modalDetalhes]);

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
                ) : (
                  dreDataFiltrado.map((item, index) => (
                    <TableRow key={index} className={getDreRowStyle(item.tipo)}>
                      <TableCell className="font-mono text-sm">
                        {item.codigo || ''}
                      </TableCell>
                      <TableCell>
                        <div 
                          className={cn(
                            "flex items-center gap-2",
                            item.nivel === 0 && "font-bold",
                            item.nivel === 1 && "pl-6 font-semibold cursor-pointer hover:opacity-70",
                            item.nivel === 2 && "pl-12"
                          )}
                          onClick={() => item.tipo === 'categoria_mae' && item.codigo && toggleCategoria(item.codigo)}
                        >
                          {item.tipo === 'categoria_mae' && item.codigo && (
                            categoriasExpandidas.has(item.codigo) 
                              ? <ChevronDown className="h-4 w-4" />
                              : <ChevronRight className="h-4 w-4" />
                          )}
                          <span>{item.conta}</span>
                        </div>
                      </TableCell>
                      <TableCell className={cn("text-right", getDreValueStyle(item.valor, item.tipo))}>
                        <span 
                          className={cn(
                            item.tipo !== 'calculo' && item.categoriaId && "cursor-pointer hover:underline hover:text-primary"
                          )}
                          onClick={() => handleClickValor(item)}
                        >
                          {formatCurrency(item.valor)}
                        </span>
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

      <DetalhesCategoriaDREModal
        open={modalDetalhes.open}
        onOpenChange={(open) => setModalDetalhes(prev => ({ ...prev, open }))}
        categoria={modalDetalhes.categoria}
        lancamentos={lancamentosModal}
      />
    </AppLayout>
  );
}
