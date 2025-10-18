import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Plus } from "lucide-react";
import { useState } from "react";
import { useRecebimentos, type NotaFiscal, type ItemNFe } from "@/hooks/use-recebimentos";
import { useNavigate } from "react-router-dom";

interface CriarOrdemModalProps {
  open: boolean;
  onClose: () => void;
  notaFiscal: NotaFiscal | any;
}

export function CriarOrdemModal({ open, onClose, notaFiscal }: CriarOrdemModalProps) {
  const { criarRecebimento, gerarNumeroOrdem, recebimentos } = useRecebimentos();
  const [itensSelecionados, setItensSelecionados] = useState<string[]>([]);
  const [criando, setCriando] = useState(false);
  const navigate = useNavigate();

  // Verificar se é nota agrupada ou NFe importada
  const isNotaAgrupada = notaFiscal?.tipo === 'agrupada';
  
  // Para notas agrupadas, usar recebimentos; para NFe, usar itens
  const itensDisponiveis = isNotaAgrupada 
    ? (notaFiscal.recebimentos || []).filter((r: any) => !r.ordem_servico_id)
    : (() => {
        const ordensExistentes = recebimentos.filter(r => r.chave_acesso_nfe === notaFiscal.chave_acesso);
        const itensComOrdem = ordensExistentes.map(ordem => {
          const match = ordem.observacoes?.match(/Item da NFe: ([^-]+)/);
          return match ? match[1].trim() : '';
        }).filter(Boolean);
        return (notaFiscal.itens || []).filter(item => !itensComOrdem.includes(item.codigo));
      })();

  const handleItemToggle = (identificador: string) => {
    setItensSelecionados(prev => 
      prev.includes(identificador)
        ? prev.filter(id => id !== identificador)
        : [...prev, identificador]
    );
  };

  const handleSelecionarTodos = () => {
    if (itensSelecionados.length === itensDisponiveis.length) {
      setItensSelecionados([]);
    } else {
      setItensSelecionados(itensDisponiveis.map((item: any) => 
        isNotaAgrupada ? item.id.toString() : item.codigo
      ));
    }
  };

  const handleAdicionarNovoItem = () => {
    navigate('/novo-recebimento', {
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
      const itensSelecionadosData = isNotaAgrupada
        ? itensDisponiveis.filter((item: any) => 
            itensSelecionados.includes(item.id.toString())
          )
        : itensDisponiveis.filter((item: any) => 
            itensSelecionados.includes(item.codigo)
          );

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
          const recebimentoData = {
            numero_ordem: numeroOrdem,
            cliente_nome: notaFiscal.cliente_nome,
            cliente_cnpj: notaFiscal.cliente_cnpj || notaFiscal.cnpj_emitente,
            data_entrada: new Date().toISOString(),
            nota_fiscal: `NF-${notaFiscal.numero}`,
            chave_acesso_nfe: notaFiscal.chave_acesso,
            nota_fiscal_id: notaFiscal.id,
            tipo_equipamento: item.descricao,
            numero_serie: `${item.codigo}-${new Date().getFullYear()}`,
            observacoes: `Item da NFe: ${item.codigo} - ${item.descricao}`,
            urgente: false,
            na_empresa: true,
            status: 'recebido'
          };
          await criarRecebimento(recebimentoData);
        }
      }

      handleFechar();
    } catch (error) {
      console.error('Erro ao criar ordens:', error);
    } finally {
      setCriando(false);
    }
  };

  const handleFechar = () => {
    setItensSelecionados([]);
    onClose();
  };

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
                <p><strong>Itens disponíveis:</strong> {itensDisponiveis.length} {isNotaAgrupada ? '' : `de ${notaFiscal.itens?.length || 0}`}</p>
              </div>
            </AlertDescription>
          </Alert>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {itensDisponiveis.length > 0 && (
                <>
                  <Checkbox
                    id="selecionarTodos"
                    checked={itensSelecionados.length === itensDisponiveis.length}
                    onCheckedChange={handleSelecionarTodos}
                  />
                  <label htmlFor="selecionarTodos" className="text-sm font-medium">
                    Selecionar todos ({itensDisponiveis.length} itens)
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

          {itensDisponiveis.length > 0 && (
            <>

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
                          <TableHead className="w-[100px]">NCM</TableHead>
                          <TableHead className="w-[80px]">Qtd</TableHead>
                          <TableHead className="w-[120px]">Valor Unit.</TableHead>
                          <TableHead className="w-[120px]">Valor Total</TableHead>
                        </>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itensDisponiveis.map((item: any) => (
                      <TableRow key={isNotaAgrupada ? item.id : item.codigo}>
                        <TableCell>
                          <Checkbox
                            checked={itensSelecionados.includes(isNotaAgrupada ? item.id.toString() : item.codigo)}
                            onCheckedChange={() => handleItemToggle(isNotaAgrupada ? item.id.toString() : item.codigo)}
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
                            <TableCell className="text-sm">{item.descricao}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{item.ncm}</TableCell>
                            <TableCell className="text-center">{item.quantidade}</TableCell>
                            <TableCell className="text-right">
                              R$ {item.valor_unitario.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              R$ {item.valor_total.toFixed(2)}
                            </TableCell>
                          </>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
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