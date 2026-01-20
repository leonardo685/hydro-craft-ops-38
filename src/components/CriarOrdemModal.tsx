import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Info, Plus, CheckCircle, FileText } from "lucide-react";
import { useState, useMemo } from "react";
import { useRecebimentos, type NotaFiscal, type ItemNFe } from "@/hooks/use-recebimentos";
import { useNavigate } from "react-router-dom";

interface CriarOrdemModalProps {
  open: boolean;
  onClose: () => void;
  notaFiscal: NotaFiscal | any;
}

interface ItemEnriquecido extends ItemNFe {
  ordemExistente?: string;
  indiceOriginal: number;
}

export function CriarOrdemModal({ open, onClose, notaFiscal }: CriarOrdemModalProps) {
  const { criarRecebimento, gerarNumeroOrdem, recebimentos } = useRecebimentos();
  const [itensSelecionados, setItensSelecionados] = useState<number[]>([]);
  const [criando, setCriando] = useState(false);
  const navigate = useNavigate();

  // Verificar se é nota agrupada ou NFe importada
  const isNotaAgrupada = notaFiscal?.tipo === 'agrupada';
  
  // Normalizar chave de acesso para busca (remover espaços)
  const chaveAcessoNormalizada = notaFiscal?.chave_acesso?.replace(/\s+/g, '') || '';
  
  // Para NFe, enriquecer itens com informação de ordem existente
  const { itensEnriquecidos, itensDisponiveis } = useMemo(() => {
    if (isNotaAgrupada) {
      const disponiveis = (notaFiscal.recebimentos || []).filter((r: any) => !r.ordem_servico_id);
      return { itensEnriquecidos: disponiveis, itensDisponiveis: disponiveis };
    }
    
    // Buscar ordens existentes com esta chave de acesso (normalizada)
    const ordensExistentes = recebimentos.filter(r => {
      const chaveRecebimento = r.chave_acesso_nfe?.replace(/\s+/g, '') || '';
      return chaveRecebimento === chaveAcessoNormalizada;
    });
    
    // Criar mapa de ordens usando código + valor como chave
    const ordensMap = new Map<string, string>();
    ordensExistentes.forEach(ordem => {
      const matchCodigo = ordem.observacoes?.match(/Item da NFe: ([^\s|-]+)/);
      const matchValor = ordem.observacoes?.match(/Valor: ([\d.,]+)/);
      if (matchCodigo) {
        const codigo = matchCodigo[1];
        const valor = matchValor ? matchValor[1].replace(',', '.') : '';
        const chave = valor ? `${codigo}|${valor}` : codigo;
        ordensMap.set(chave, ordem.numero_ordem);
      }
    });
    
    // Enriquecer TODOS os itens com informação de ordem existente
    const enriquecidos: ItemEnriquecido[] = (notaFiscal.itens || []).map((item: any, index: number) => {
      const valorFormatado = (item.valor_unitario || item.valorUnitario)?.toFixed(2);
      const chave = `${item.codigo}|${valorFormatado}`;
      
      // Tentar match exato (código + valor) primeiro, depois fallback para só código
      let ordemExistente = ordensMap.get(chave);
      
      if (ordemExistente) {
        // Remover do mapa para não reutilizar
        ordensMap.delete(chave);
      } else {
        // Fallback: tentar match só por código (para dados antigos)
        ordemExistente = ordensMap.get(item.codigo);
        if (ordemExistente) {
          ordensMap.delete(item.codigo);
        }
      }
      
      return { 
        ...item, 
        ordemExistente,
        indiceOriginal: index
      };
    });
    
    const disponiveis = enriquecidos.filter(item => !item.ordemExistente);
    
    return { itensEnriquecidos: enriquecidos, itensDisponiveis: disponiveis };
  }, [isNotaAgrupada, notaFiscal, recebimentos, chaveAcessoNormalizada]);

  const handleItemToggle = (indice: number) => {
    setItensSelecionados(prev => 
      prev.includes(indice)
        ? prev.filter(id => id !== indice)
        : [...prev, indice]
    );
  };

  const handleSelecionarTodos = () => {
    if (itensSelecionados.length === itensDisponiveis.length) {
      setItensSelecionados([]);
    } else {
      if (isNotaAgrupada) {
        setItensSelecionados(itensDisponiveis.map((_: any, index: number) => index));
      } else {
        setItensSelecionados(itensDisponiveis.map((item: ItemEnriquecido) => item.indiceOriginal));
      }
    }
  };

  const handleAdicionarNovoItem = () => {
    navigate('/recebimentos/novo', {
      state: {
        notaFiscal: {
          id: notaFiscal.id,
          numero: isNotaAgrupada ? notaFiscal.numero_nota : notaFiscal.numero,
          chave_acesso: notaFiscal.chave_acesso,
          cliente_nome: notaFiscal.cliente_nome,
          cliente_cnpj: notaFiscal.cliente_cnpj || notaFiscal.cnpj_emitente
        }
      }
    });
  };

  const handleCriarOrdens = async () => {
    setCriando(true);
    try {
      // Criar ordens dos itens selecionados
      let itensSelecionadosData: any[];
      
      if (isNotaAgrupada) {
        itensSelecionadosData = itensDisponiveis.filter((_: any, index: number) => 
          itensSelecionados.includes(index)
        );
      } else {
        itensSelecionadosData = itensEnriquecidos.filter((item: ItemEnriquecido) => 
          itensSelecionados.includes(item.indiceOriginal)
        );
      }

      for (const item of itensSelecionadosData) {
        if (isNotaAgrupada) {
          // Para notas agrupadas, criar ordem de serviço
          const numeroOrdem = await gerarNumeroOrdem();
          await criarRecebimento({
            ...item,
            numero_ordem: numeroOrdem,
            status: 'em_analise'
          });
        } else {
          // Para NFe importada
          const numeroOrdem = await gerarNumeroOrdem();
          const valorUnitario = item.valor_unitario || item.valorUnitario;
          const recebimentoData = {
            numero_ordem: numeroOrdem,
            // Para NFe de entrada, o emitente é quem enviou o equipamento = cliente do serviço
            cliente_nome: notaFiscal.nome_emitente || notaFiscal.cliente_nome,
            cliente_cnpj: notaFiscal.cnpjEmitente || notaFiscal.cnpj_emitente || notaFiscal.cliente_cnpj,
            data_entrada: new Date().toISOString(),
            nota_fiscal: notaFiscal.numero, // Salvar sem prefixo NF-
            chave_acesso_nfe: chaveAcessoNormalizada, // Usar chave normalizada
            nota_fiscal_id: notaFiscal.id,
            tipo_equipamento: item.descricao,
            numero_serie: `${item.codigo}-${new Date().getFullYear()}`,
            // Incluir valor unitário nas observações para matching futuro
            observacoes: `Item da NFe: ${item.codigo} | Valor: ${valorUnitario?.toFixed(2)} - ${item.descricao}`,
            urgente: false,
            na_empresa: true,
            status: 'recebido'
          };
          await criarRecebimento(recebimentoData);
        }
      }

      handleFechar();
    } catch (error: any) {
      console.error('Erro ao criar ordens:', error);
      const { toast } = await import("@/hooks/use-toast");
      
      // Extrair mensagem de erro detalhada do Supabase
      let mensagemErro = "Erro desconhecido ao criar recebimento";
      if (error?.message) {
        mensagemErro = error.message;
      }
      if (error?.details) {
        mensagemErro += ` - ${error.details}`;
      }
      if (error?.hint) {
        mensagemErro += ` (${error.hint})`;
      }
      
      toast({
        title: "Erro ao criar recebimento",
        description: mensagemErro,
        variant: "destructive",
      });
    } finally {
      setCriando(false);
    }
  };

  const handleFechar = () => {
    setItensSelecionados([]);
    onClose();
  };

  // Para notas agrupadas, mostrar itensDisponiveis; para NFe, mostrar todos os itens enriquecidos
  const itensParaExibir = isNotaAgrupada ? itensDisponiveis : itensEnriquecidos;

  return (
    <Dialog open={open} onOpenChange={handleFechar}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Criar Ordens de Serviço - {isNotaAgrupada ? notaFiscal.numero_nota : `NF ${notaFiscal.numero}`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <p><strong>Cliente:</strong> {notaFiscal.cliente_nome}</p>
                {!isNotaAgrupada && (
                  <>
                    <p><strong>Série:</strong> {notaFiscal.serie}</p>
                    <p><strong>Data de Emissão:</strong> {new Date(notaFiscal.data_emissao).toLocaleDateString('pt-BR')}</p>
                  </>
                )}
                <p><strong>Itens disponíveis:</strong> {itensDisponiveis.length} de {itensParaExibir.length}</p>
              </div>
            </AlertDescription>
          </Alert>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {itensDisponiveis.length > 0 && (
                <>
                  <Checkbox
                    id="selecionarTodos"
                    checked={itensSelecionados.length === itensDisponiveis.length && itensDisponiveis.length > 0}
                    onCheckedChange={handleSelecionarTodos}
                  />
                  <label htmlFor="selecionarTodos" className="text-sm font-medium">
                    Selecionar todos disponíveis ({itensDisponiveis.length})
                  </label>
                </>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAdicionarNovoItem}
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Novo Item
            </Button>
          </div>

          {itensParaExibir.length > 0 && (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">Sel.</TableHead>
                    {isNotaAgrupada ? (
                      <>
                        <TableHead className="w-[120px]">Nº Ordem</TableHead>
                        <TableHead>Tipo de Equipamento</TableHead>
                        <TableHead className="w-[120px]">Nº Série</TableHead>
                        <TableHead className="w-[140px]">Data de Entrada</TableHead>
                      </>
                    ) : (
                      <>
                        <TableHead className="w-[120px]">Código</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="w-[80px]">Qtd</TableHead>
                        <TableHead className="w-[110px]">Valor Unit.</TableHead>
                        <TableHead className="w-[110px]">Valor Total</TableHead>
                        <TableHead className="w-[130px]">Status</TableHead>
                      </>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itensParaExibir.map((item: any, index: number) => {
                    const indice = isNotaAgrupada ? index : item.indiceOriginal;
                    const isDisabled = !isNotaAgrupada && !!item.ordemExistente;
                    
                    return (
                      <TableRow key={isNotaAgrupada ? item.id : `${item.codigo}-${index}`} className={isDisabled ? "opacity-60" : ""}>
                        <TableCell>
                          <Checkbox
                            checked={itensSelecionados.includes(indice)}
                            onCheckedChange={() => handleItemToggle(indice)}
                            disabled={isDisabled}
                          />
                        </TableCell>
                        {isNotaAgrupada ? (
                          <>
                            <TableCell className="font-medium">{item.numero_ordem}</TableCell>
                            <TableCell className="text-sm">{item.tipo_equipamento}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{item.numero_serie || '-'}</TableCell>
                            <TableCell className="text-sm">
                              {new Date(item.data_entrada).toLocaleDateString('pt-BR')}
                            </TableCell>
                          </>
                        ) : (
                          <>
                            <TableCell className="font-mono text-sm">{item.codigo}</TableCell>
                            <TableCell className="text-sm max-w-[200px] truncate">{item.descricao}</TableCell>
                            <TableCell className="text-center">{item.quantidade}</TableCell>
                            <TableCell className="text-right">
                              R$ {(item.valor_unitario || 0).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              R$ {(item.valor_total || 0).toFixed(2)}
                            </TableCell>
                            <TableCell>
                              {item.ordemExistente ? (
                                <Badge className="bg-green-600 hover:bg-green-700 gap-1">
                                  <CheckCircle className="h-3 w-3" />
                                  {item.ordemExistente}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="gap-1 text-muted-foreground">
                                  <FileText className="h-3 w-3" />
                                  Disponível
                                </Badge>
                              )}
                            </TableCell>
                          </>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleFechar} className="flex-1">
              Cancelar
            </Button>
            {itensDisponiveis.length > 0 && (
              <Button
                onClick={handleCriarOrdens}
                disabled={itensSelecionados.length === 0 || criando}
                className="flex-1"
              >
                {criando ? "Criando..." : `Criar Ordens (${itensSelecionados.length})`}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
