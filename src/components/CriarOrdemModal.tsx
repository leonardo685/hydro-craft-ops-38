import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Plus } from "lucide-react";
import { useState } from "react";
import { useRecebimentos, type NotaFiscal, type ItemNFe } from "@/hooks/use-recebimentos";

interface CriarOrdemModalProps {
  open: boolean;
  onClose: () => void;
  notaFiscal: NotaFiscal;
}

export function CriarOrdemModal({ open, onClose, notaFiscal }: CriarOrdemModalProps) {
  const { criarRecebimento, gerarNumeroOrdem, recebimentos } = useRecebimentos();
  const [itensSelecionados, setItensSelecionados] = useState<string[]>([]);
  const [criando, setCriando] = useState(false);

  // Filtrar itens que já têm ordens de serviço criadas
  const ordensExistentes = recebimentos.filter(r => r.chave_acesso_nfe === notaFiscal.chave_acesso);
  const itensComOrdem = ordensExistentes.map(ordem => {
    const match = ordem.observacoes?.match(/Item da NFe: ([^-]+)/);
    return match ? match[1].trim() : '';
  }).filter(Boolean);

  const itensDisponiveis = (notaFiscal.itens || []).filter(item => 
    !itensComOrdem.includes(item.codigo)
  );

  const handleItemToggle = (codigoItem: string) => {
    setItensSelecionados(prev => 
      prev.includes(codigoItem)
        ? prev.filter(id => id !== codigoItem)
        : [...prev, codigoItem]
    );
  };

  const handleSelecionarTodos = () => {
    if (itensSelecionados.length === itensDisponiveis.length) {
      setItensSelecionados([]);
    } else {
      setItensSelecionados(itensDisponiveis.map(item => item.codigo));
    }
  };

  const handleCriarOrdens = async () => {
    setCriando(true);
    try {
      const itensSelecionadosData = itensDisponiveis.filter(item => 
        itensSelecionados.includes(item.codigo)
      );

      for (const item of itensSelecionadosData) {
        const numeroOrdem = await gerarNumeroOrdem();
        
        const recebimentoData = {
          numero_ordem: numeroOrdem,
          cliente_nome: notaFiscal.cliente_nome,
          cliente_cnpj: notaFiscal.cliente_cnpj || notaFiscal.cnpj_emitente,
          data_entrada: new Date().toISOString(),
          nota_fiscal: `NF-${notaFiscal.numero}`,
          chave_acesso_nfe: notaFiscal.chave_acesso,
          tipo_equipamento: item.descricao,
          numero_serie: `${item.codigo}-${new Date().getFullYear()}`,
          observacoes: `Item da NFe: ${item.codigo} - ${item.descricao}`,
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
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleFechar}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Criar Ordens de Serviço - NF {notaFiscal.numero}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <p><strong>Cliente:</strong> {notaFiscal.cliente_nome}</p>
                <p><strong>Série:</strong> {notaFiscal.serie}</p>
                <p><strong>Data de Emissão:</strong> {new Date(notaFiscal.data_emissao).toLocaleDateString('pt-BR')}</p>
                <p><strong>Itens disponíveis:</strong> {itensDisponiveis.length} de {notaFiscal.itens?.length || 0}</p>
              </div>
            </AlertDescription>
          </Alert>

          {itensDisponiveis.length === 0 ? (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Todos os itens desta nota fiscal já possuem ordens de serviço criadas.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="selecionarTodos"
                  checked={itensSelecionados.length === itensDisponiveis.length}
                  onCheckedChange={handleSelecionarTodos}
                />
                <label htmlFor="selecionarTodos" className="text-sm font-medium">
                  Selecionar todos ({itensDisponiveis.length} itens)
                </label>
              </div>

              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">Sel.</TableHead>
                      <TableHead className="w-[120px]">Código</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="w-[100px]">NCM</TableHead>
                      <TableHead className="w-[80px]">Qtd</TableHead>
                      <TableHead className="w-[120px]">Valor Unit.</TableHead>
                      <TableHead className="w-[120px]">Valor Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itensDisponiveis.map((item) => (
                      <TableRow key={item.codigo}>
                        <TableCell>
                          <Checkbox
                            checked={itensSelecionados.includes(item.codigo)}
                            onCheckedChange={() => handleItemToggle(item.codigo)}
                          />
                        </TableCell>
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