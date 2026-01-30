import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Info, Plus, CheckCircle, FileText, ExternalLink } from "lucide-react";
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
  const { recebimentos } = useRecebimentos();
  const [itemSelecionado, setItemSelecionado] = useState<number | null>(null);
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
    // Selecionar apenas um item por vez
    setItemSelecionado(prev => prev === indice ? null : indice);
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
    handleFechar();
  };

  // Navegar para o formulário completo com dados pré-preenchidos
  const handleCriarOrdem = () => {
    if (itemSelecionado === null) return;

    let itemData: any;
    
    if (isNotaAgrupada) {
      itemData = itensDisponiveis[itemSelecionado];
    } else {
      itemData = itensEnriquecidos.find((item: ItemEnriquecido) => 
        item.indiceOriginal === itemSelecionado
      );
    }

    if (!itemData) return;

    // Navegar para o formulário de novo recebimento com dados pré-preenchidos
    navigate('/recebimentos/novo', {
      state: {
        notaFiscal: {
          id: notaFiscal.id,
          numero: isNotaAgrupada ? notaFiscal.numero_nota : notaFiscal.numero,
          chave_acesso: chaveAcessoNormalizada,
          cliente_nome: notaFiscal.nome_emitente || notaFiscal.cliente_nome,
          cliente_cnpj: notaFiscal.cnpj_emitente || notaFiscal.cliente_cnpj
        },
        itemNFe: {
          codigo: itemData.codigo,
          descricao: itemData.descricao,
          valor_unitario: itemData.valor_unitario || itemData.valorUnitario,
          quantidade: itemData.quantidade
        }
      }
    });

    handleFechar();
  };

  const handleFechar = () => {
    setItemSelecionado(null);
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
            Criar Ordem de Serviço - {isNotaAgrupada ? notaFiscal.numero_nota : `NF ${notaFiscal.numero}`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <p><strong>Cliente:</strong> {notaFiscal.nome_emitente || notaFiscal.cliente_nome}</p>
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

          <Alert variant="default" className="bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900">
            <ExternalLink className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-blue-700 dark:text-blue-300">
              Selecione um item para abrir o formulário completo com dados técnicos e campo de OS Anterior.
            </AlertDescription>
          </Alert>

          <div className="flex items-center justify-end">
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
                            checked={itemSelecionado === indice}
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
                onClick={handleCriarOrdem}
                disabled={itemSelecionado === null}
                className="flex-1"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Abrir Formulário Completo
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
