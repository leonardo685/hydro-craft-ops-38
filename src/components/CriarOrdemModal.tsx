import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Plus } from "lucide-react";
import { useState } from "react";
import { useRecebimentos, type NotaFiscal, type ItemNFe } from "@/hooks/use-recebimentos";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CriarOrdemModalProps {
  open: boolean;
  onClose: () => void;
  notaFiscal: NotaFiscal | any;
}

export function CriarOrdemModal({ open, onClose, notaFiscal }: CriarOrdemModalProps) {
  const { criarRecebimento, gerarNumeroOrdem, recebimentos } = useRecebimentos();
  const [itensSelecionados, setItensSelecionados] = useState<string[]>([]);
  const [criando, setCriando] = useState(false);
  const [novosItens, setNovosItens] = useState<Array<{
    id: string;
    tipo_equipamento: string;
    numero_serie: string;
  }>>([]);

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
    const novoId = `novo_${Date.now()}`;
    setNovosItens([...novosItens, {
      id: novoId,
      tipo_equipamento: '',
      numero_serie: ''
    }]);
    setItensSelecionados([...itensSelecionados, novoId]);
  };

  const handleRemoverNovoItem = (id: string) => {
    setNovosItens(novosItens.filter(item => item.id !== id));
    setItensSelecionados(itensSelecionados.filter(itemId => itemId !== id));
  };

  const handleAtualizarNovoItem = (id: string, campo: string, valor: string) => {
    setNovosItens(novosItens.map(item => 
      item.id === id ? { ...item, [campo]: valor } : item
    ));
  };

  const handleCriarOrdens = async () => {
    setCriando(true);
    try {
      // Criar ordens dos itens existentes selecionados
      const itensSelecionadosExistentes = isNotaAgrupada
        ? itensDisponiveis.filter((item: any) => 
            itensSelecionados.includes(item.id.toString())
          )
        : itensDisponiveis.filter((item: any) => 
            itensSelecionados.includes(item.codigo)
          );

      for (const item of itensSelecionadosExistentes) {
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

      // Criar ordens dos novos itens
      for (const novoItem of novosItens) {
        if (!itensSelecionados.includes(novoItem.id)) continue;
        
        const numeroOrdem = await gerarNumeroOrdem();
        const recebimentoData = {
          numero_ordem: numeroOrdem,
          cliente_nome: notaFiscal.cliente_nome,
          cliente_cnpj: notaFiscal.cliente_cnpj || notaFiscal.cnpj_emitente,
          data_entrada: new Date().toISOString(),
          nota_fiscal: isNotaAgrupada ? notaFiscal.numero_nota : `NF-${notaFiscal.numero}`,
          chave_acesso_nfe: notaFiscal.chave_acesso,
          nota_fiscal_id: notaFiscal.id,
          tipo_equipamento: novoItem.tipo_equipamento,
          numero_serie: novoItem.numero_serie,
          observacoes: 'Item criado manualmente',
          urgente: false,
          na_empresa: true,
          status: 'recebido'
        };
        await criarRecebimento(recebimentoData);
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
    setNovosItens([]);
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
                    checked={itensSelecionados.length === itensDisponiveis.length + novosItens.length}
                    onCheckedChange={handleSelecionarTodos}
                  />
                  <label htmlFor="selecionarTodos" className="text-sm font-medium">
                    Selecionar todos ({itensDisponiveis.length} itens existentes)
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

          {novosItens.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Novos Itens</h4>
              {novosItens.map((item) => (
                <div key={item.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={itensSelecionados.includes(item.id)}
                        onCheckedChange={() => handleItemToggle(item.id)}
                      />
                      <span className="text-sm font-medium">Novo Item</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoverNovoItem(item.id)}
                    >
                      Remover
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor={`tipo_${item.id}`}>Tipo de Equipamento *</Label>
                      <Input
                        id={`tipo_${item.id}`}
                        value={item.tipo_equipamento}
                        onChange={(e) => handleAtualizarNovoItem(item.id, 'tipo_equipamento', e.target.value)}
                        placeholder="Ex: Bomba Hidráulica"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`serie_${item.id}`}>Número de Série</Label>
                      <Input
                        id={`serie_${item.id}`}
                        value={item.numero_serie}
                        onChange={(e) => handleAtualizarNovoItem(item.id, 'numero_serie', e.target.value)}
                        placeholder="Ex: SN-12345"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleFechar} className="flex-1">
              Cancelar
            </Button>
            <Button
              onClick={handleCriarOrdens}
              disabled={itensSelecionados.length === 0 || criando || novosItens.some(item => itensSelecionados.includes(item.id) && !item.tipo_equipamento)}
              className="flex-1"
            >
              {criando ? "Criando..." : `Criar Ordens (${itensSelecionados.length})`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}